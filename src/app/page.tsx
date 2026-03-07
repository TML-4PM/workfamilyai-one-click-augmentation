'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================================
// TYPES (inline for single-file deployment reliability)
// ============================================================
type AgentState = 'requested' | 'interpreted' | 'compiled' | 'validated' | 'approved' | 'staged' | 'live' | 'paused' | 'retired';
type Channel = 'linkedin' | 'email' | 'phone' | 'crm' | 'webchat' | 'internal';
type ReadinessLevel = 'ready' | 'needs_setup' | 'blocked';
type ActionType = 'create' | 'read' | 'update' | 'send' | 'classify' | 'score' | 'escalate' | 'pause' | 'resume';
type Stage = 'targeting' | 'messaging' | 'engagement' | 'qualification' | 'booking' | 'proposal' | 'negotiation' | 'close' | 'other';

interface AgentContract {
  contract_id: string;
  version: string;
  created_at: string;
  updated_at: string;
  identity: { agent_name: string; agent_type: string; template_family: string; description: string; owner_business_id: string; owner_customer_id: string; };
  objective: { primary_goal: string; success_metrics: string[]; kpis: Record<string, string>; };
  operating_mode: { autonomy_level: string; escalation_threshold: number; max_actions_per_hour: number; operating_hours: { start: string; end: string; timezone: string }; batch_size: number; };
  channels: Channel[];
  tasks: Array<{ task_id: string; name: string; description: string; trigger: string; action_type: ActionType; channel: Channel; stage: Stage; guardrails: string[]; }>;
  inputs: Array<{ name: string; type: string; source: string; required: boolean; }>;
  outputs: Array<{ name: string; type: string; destination: string; }>;
  controls: { guardrails: string[]; max_daily_actions: number; require_human_approval: string[]; blocked_actions: string[]; compliance_rules: string[]; discount_ceiling_pct: number; escalation_rules: Array<{ trigger: string; action: string; notify: string[] }>; };
  access_profile: Record<string, string>;
  secrets_profile: Record<string, string>;
  observability: { log_level: string; alert_channels: string[]; retention_days: number; dashboards: string[]; };
  commercial_model: { plan_type: string; billing_cycle: string; base_price_cents: number; usage_rate_per_action_cents: number; stripe_customer_id: string; stripe_subscription_id: string; };
  deployment: { environment: string; state: AgentState; region: string; scaling: { min_instances: number; max_instances: number }; };
  acceptance_criteria: { test_scorecard_required: boolean; min_score: number; red_team_required: boolean; hard_fail_conditions: string[]; };
  audit: { created_by: string; approved_by: string | null; state_history: Array<{ from: string | null; to: string; timestamp: string; actor: string; reason: string }>; compliance_tags: string[]; };
  dependency_packs: string[];
  readiness_score: number;
  readiness_level: ReadinessLevel;
}

interface Customer { customer_id: string; email: string; name: string; company: string; stripe_customer_id: string; created_at: string; }
interface AgentOrder { order_id: string; customer_id: string; request_type: string; request_payload: any; contract_id: string | null; status: string; created_at: string; }
interface AgentInstance { instance_id: string; contract_id: string; customer_id: string; state: AgentState; environment: string; created_at: string; updated_at: string; }
interface AuditEvent { id: string; timestamp: string; actor: string; action: string; target: string; details: string; }
interface UsageEvent { id: string; contract_id: string; timestamp: string; actions_count: number; token_cost: number; tool_cost: number; }

// ============================================================
// IN-MEMORY STORE
// ============================================================
let DB = {
  customers: [] as Customer[],
  orders: [] as AgentOrder[],
  contracts: [] as AgentContract[],
  instances: [] as AgentInstance[],
  audit: [] as AuditEvent[],
  usage: [] as UsageEvent[],
  connectedPacks: {} as Record<string, string[]>,
};

function uid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); }); }
function now() { return new Date().toISOString(); }

function audit(actor: string, action: string, target: string, details: string) {
  DB.audit.unshift({ id: uid(), timestamp: now(), actor, action, target, details });
}

// ============================================================
// TEMPLATES & PACKS
// ============================================================
const TEMPLATES = [
  { id: 'lead_gen', name: 'Lead Generation', cat: 'Revenue', desc: 'AI-powered prospect identification, outreach, and qualification', icon: '🎯' },
  { id: 'customer_service', name: 'Customer Service', cat: 'Support', desc: 'Automated ticket handling, FAQ responses, and escalation', icon: '💬' },
  { id: 'sales', name: 'Sales Automation', cat: 'Revenue', desc: 'Pipeline management, proposal generation, and deal closing', icon: '💰' },
  { id: 'finance', name: 'Finance Operations', cat: 'Back Office', desc: 'Invoice processing, payment tracking, and reconciliation', icon: '📊' },
  { id: 'operations', name: 'Operations', cat: 'Back Office', desc: 'Workflow automation, scheduling, and process monitoring', icon: '⚙️' },
  { id: 'recruitment', name: 'Recruitment', cat: 'HR', desc: 'Candidate sourcing, screening, and interview scheduling', icon: '👥' },
  { id: 'onboarding', name: 'Customer Onboarding', cat: 'Growth', desc: 'Welcome flows, setup guidance, and training coordination', icon: '🚀' },
];

const PACKS: Record<string, { name: string; desc: string }> = {
  email_pack: { name: 'Email Pack', desc: 'Send and receive emails' },
  calendar_pack: { name: 'Calendar Pack', desc: 'Book meetings and manage events' },
  crm_pack: { name: 'CRM Pack', desc: 'Read/write leads and deals' },
  voice_pack: { name: 'Voice Pack', desc: 'Outbound/inbound voice calls' },
  faq_pack: { name: 'FAQ Pack', desc: 'Knowledge base lookup' },
  escalation_pack: { name: 'Escalation Pack', desc: 'Human escalation routing' },
  pricing_pack: { name: 'Pricing Pack', desc: 'Dynamic pricing and quoting' },
};

const PACK_MAP: Record<string, string[]> = {
  lead_gen: ['email_pack', 'crm_pack', 'calendar_pack', 'escalation_pack'],
  customer_service: ['email_pack', 'faq_pack', 'escalation_pack', 'crm_pack'],
  sales: ['email_pack', 'crm_pack', 'calendar_pack', 'pricing_pack', 'escalation_pack'],
  finance: ['email_pack', 'escalation_pack'],
  operations: ['email_pack', 'calendar_pack', 'escalation_pack'],
  recruitment: ['email_pack', 'calendar_pack', 'crm_pack'],
  onboarding: ['email_pack', 'calendar_pack', 'faq_pack'],
};

const STARTER_PACKS = [
  { id: 'revenue_starter', name: 'Revenue Starter', desc: 'Lead gen + sales automation', templates: ['lead_gen', 'sales'], packs: ['email_pack', 'crm_pack', 'calendar_pack', 'pricing_pack'], channels: ['email', 'linkedin', 'crm'] as Channel[], price: 99 },
  { id: 'cs_starter', name: 'Customer Service Starter', desc: 'Auto-respond, route, escalate', templates: ['customer_service'], packs: ['email_pack', 'faq_pack', 'escalation_pack', 'crm_pack'], channels: ['email', 'webchat'] as Channel[], price: 49 },
  { id: 'finance_starter', name: 'Finance Starter', desc: 'Invoice, payment, reconciliation', templates: ['finance'], packs: ['email_pack', 'escalation_pack'], channels: ['email', 'internal'] as Channel[], price: 49 },
  { id: 'ops_starter', name: 'Operations Starter', desc: 'Scheduling, workflow, monitoring', templates: ['operations'], packs: ['email_pack', 'calendar_pack', 'escalation_pack'], channels: ['email', 'internal'] as Channel[], price: 49 },
];

// ============================================================
// INTENT INTERPRETER
// ============================================================
const INTENT_KEYWORDS: Record<string, string[]> = {
  lead_gen: ['lead', 'prospect', 'outreach', 'linkedin', 'cold email', 'pipeline', 'generate leads'],
  customer_service: ['support', 'helpdesk', 'tickets', 'faq', 'complaints', 'service'],
  sales: ['sales', 'close deals', 'proposal', 'quotes', 'negotiate', 'revenue', 'deal'],
  finance: ['invoice', 'billing', 'payment', 'finance', 'reconciliation', 'expense'],
  operations: ['operations', 'scheduling', 'workflow', 'automation', 'process', 'coordinate'],
  recruitment: ['hiring', 'recruit', 'talent', 'candidate', 'interview', 'resume'],
  onboarding: ['onboard', 'welcome', 'new customer', 'getting started', 'setup'],
};

function interpretText(text: string) {
  const lower = text.toLowerCase();
  let best = 'operations', bestScore = 0;
  for (const [fam, kws] of Object.entries(INTENT_KEYWORDS)) {
    const score = kws.filter(k => lower.includes(k)).length / kws.length;
    if (score > bestScore) { bestScore = score; best = fam; }
  }
  const channels: Channel[] = [];
  if (lower.includes('email') || lower.includes('mail')) channels.push('email');
  if (lower.includes('linkedin') || lower.includes('social')) channels.push('linkedin');
  if (lower.includes('phone') || lower.includes('call')) channels.push('phone');
  if (lower.includes('chat') || lower.includes('website')) channels.push('webchat');
  if (channels.length === 0) channels.push('email');
  const confidence = Math.min(0.95, 0.3 + bestScore * 2);
  const friction = Math.max(0.1, 1 - confidence);
  return { family: best, channels, packs: PACK_MAP[best] || ['email_pack'], confidence, friction };
}

// ============================================================
// CONTRACT COMPILER
// ============================================================
function compileContract(w: WizardData): AgentContract {
  const id = uid();
  const ts = now();
  let family = w.template || 'operations';
  let channels = w.channels;
  let packs = w.packs;

  if (w.freeText && !w.template) {
    const interp = interpretText(w.freeText);
    family = interp.family;
    if (channels.length === 0) channels = interp.channels;
    if (packs.length === 0) packs = interp.packs;
  }
  if (packs.length === 0) packs = PACK_MAP[family] || ['email_pack'];

  const taskDefs: Record<string, Array<{ name: string; stage: Stage; action: ActionType }>> = {
    lead_gen: [{ name: 'Identify prospects', stage: 'targeting', action: 'classify' }, { name: 'Enrich data', stage: 'targeting', action: 'read' }, { name: 'Send outreach', stage: 'messaging', action: 'send' }, { name: 'Track responses', stage: 'engagement', action: 'classify' }, { name: 'Qualify leads', stage: 'qualification', action: 'score' }, { name: 'Book calls', stage: 'booking', action: 'create' }],
    customer_service: [{ name: 'Monitor queries', stage: 'engagement', action: 'read' }, { name: 'Classify tickets', stage: 'qualification', action: 'classify' }, { name: 'Auto-respond FAQs', stage: 'messaging', action: 'send' }, { name: 'Escalate issues', stage: 'other', action: 'escalate' }],
    sales: [{ name: 'Manage pipeline', stage: 'qualification', action: 'update' }, { name: 'Generate proposals', stage: 'proposal', action: 'create' }, { name: 'Send follow-ups', stage: 'negotiation', action: 'send' }, { name: 'Close deals', stage: 'close', action: 'update' }],
    finance: [{ name: 'Process invoices', stage: 'other', action: 'create' }, { name: 'Track payments', stage: 'other', action: 'read' }, { name: 'Send reminders', stage: 'messaging', action: 'send' }],
    operations: [{ name: 'Schedule tasks', stage: 'other', action: 'create' }, { name: 'Monitor workflows', stage: 'other', action: 'read' }, { name: 'Alert exceptions', stage: 'other', action: 'escalate' }],
    recruitment: [{ name: 'Source candidates', stage: 'targeting', action: 'read' }, { name: 'Screen resumes', stage: 'qualification', action: 'classify' }, { name: 'Schedule interviews', stage: 'booking', action: 'create' }],
    onboarding: [{ name: 'Welcome customers', stage: 'messaging', action: 'send' }, { name: 'Guide setup', stage: 'other', action: 'create' }, { name: 'Track completion', stage: 'other', action: 'read' }],
  };

  const tasks = (taskDefs[family] || taskDefs.operations).map((t, i) => ({
    task_id: uid(), name: t.name, description: t.name, trigger: i === 0 ? 'on_schedule' : 'on_event',
    action_type: t.action, channel: channels[i % channels.length] || 'email', stage: t.stage, guardrails: ['rate_limit', 'human_review'],
  }));

  const plan = w.plan || 'starter';
  const prices: Record<string, number> = { starter: 4900, professional: 19900, enterprise: 49900 };

  const contract: AgentContract = {
    contract_id: id, version: '1.0.0', created_at: ts, updated_at: ts,
    identity: { agent_name: `${family.replace('_', ' ')} Agent — ${w.company || 'New Business'}`, agent_type: family, template_family: family, description: w.goal || `Automated ${family.replace('_', ' ')} agent`, owner_business_id: uid(), owner_customer_id: '' },
    objective: { primary_goal: w.goal || `Automate ${family.replace('_', ' ')}`, success_metrics: ['Completion rate', 'Accuracy', 'Response time'], kpis: { target_completion: '95%', accuracy: '98%' } },
    operating_mode: { autonomy_level: 'supervised', escalation_threshold: 0.7, max_actions_per_hour: 50, operating_hours: { start: '09:00', end: '17:00', timezone: 'UTC' }, batch_size: 10 },
    channels, tasks,
    inputs: [{ name: 'customer_data', type: 'json', source: 'crm', required: true }, { name: 'config', type: 'json', source: 'contract', required: true }],
    outputs: [{ name: 'action_log', type: 'event_stream', destination: 'log_store' }, { name: 'results', type: 'json', destination: 'dashboard' }],
    controls: { guardrails: ['no_pii_exposure', 'max_daily_limit', 'human_review_required'], max_daily_actions: 200, require_human_approval: ['send_proposal', 'book_meeting'], blocked_actions: ['delete_data'], compliance_rules: ['gdpr_consent_required', 'opt_out_honored'], discount_ceiling_pct: 15, escalation_rules: [{ trigger: 'confidence_below_0.5', action: 'pause_and_escalate', notify: ['owner'] }, { trigger: 'negative_sentiment', action: 'escalate_to_human', notify: ['owner'] }] },
    access_profile: {}, secrets_profile: { email_sender_ref: 'vault://email_sender', crm_connection_ref: 'vault://crm_api', model_profile_ref: 'vault://llm_api_key' },
    observability: { log_level: 'info', alert_channels: ['email', 'dashboard'], retention_days: 90, dashboards: ['agent_performance', 'usage_metrics'] },
    commercial_model: { plan_type: plan, billing_cycle: 'monthly', base_price_cents: prices[plan] || 4900, usage_rate_per_action_cents: 5, stripe_customer_id: '', stripe_subscription_id: '' },
    deployment: { environment: 'sandbox', state: 'requested', region: 'us-east-1', scaling: { min_instances: 1, max_instances: 3 } },
    acceptance_criteria: { test_scorecard_required: true, min_score: 75, red_team_required: false, hard_fail_conditions: ['logging_completeness_below_95', 'margin_breach', 'hallucination_rate_above_3pct', 'human_rescue_above_40pct'] },
    audit: { created_by: 'system', approved_by: null, state_history: [{ from: null, to: 'requested', timestamp: ts, actor: 'customer', reason: 'New order' }], compliance_tags: ['soc2', 'gdpr'] },
    dependency_packs: packs, readiness_score: 0, readiness_level: 'needs_setup',
  };
  return contract;
}

// ============================================================
// VALIDATION
// ============================================================
function validateContract(c: AgentContract, connPacks: string[]): { valid: boolean; errors: string[]; warnings: string[]; score: number; level: ReadinessLevel } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!c.identity?.agent_name) errors.push('Agent name required');
  if (!c.identity?.owner_customer_id) errors.push('Customer ID required');
  if (!c.channels?.length) errors.push('At least one channel required');
  if (!c.tasks?.length) errors.push('At least one task required');
  const missing = (c.dependency_packs || []).filter(p => !connPacks.includes(p));
  if (missing.length) errors.push(`Missing packs: ${missing.join(', ')}`);
  if (!c.commercial_model?.stripe_customer_id) errors.push('Stripe customer required');
  if (!c.controls?.guardrails?.length) warnings.push('No guardrails configured');
  if (!c.controls?.escalation_rules?.length) warnings.push('No escalation rules');

  let score = 0;
  const req = c.dependency_packs || [];
  if (req.length === 0) score += 30; else score += Math.round((req.filter(p => connPacks.includes(p)).length / req.length) * 30);
  if (Object.keys(c.access_profile || {}).length > 0 || req.length === 0) score += 20;
  if (c.controls?.guardrails?.length) score += 10;
  if (c.controls?.escalation_rules?.length) score += 10;
  if (c.commercial_model?.stripe_customer_id) score += 15;
  if (c.observability?.log_level) score += 8;
  if (c.observability?.retention_days) score += 7;
  const level: ReadinessLevel = score >= 80 ? 'ready' : score >= 50 ? 'needs_setup' : 'blocked';

  return { valid: errors.length === 0, errors, warnings, score, level };
}

// ============================================================
// STATE MACHINE
// ============================================================
const TRANSITIONS: Record<string, string[]> = {
  requested: ['interpreted'], interpreted: ['compiled'], compiled: ['validated'],
  validated: ['approved', 'compiled'], approved: ['staged'],
  staged: ['live', 'paused'], live: ['paused', 'retired'], paused: ['live', 'retired'], retired: [],
};

function canTransition(from: string, to: string) { return TRANSITIONS[from]?.includes(to) ?? false; }

function doTransition(contract: AgentContract, to: AgentState, actor: string, reason: string): boolean {
  if (!canTransition(contract.deployment.state, to)) return false;
  contract.audit.state_history.push({ from: contract.deployment.state, to, timestamp: now(), actor, reason });
  contract.deployment.state = to;
  contract.updated_at = now();
  if (to === 'approved') contract.audit.approved_by = actor;
  return true;
}

// ============================================================
// WIZARD STATE
// ============================================================
interface WizardData {
  step: number;
  goal: string;
  template: string | null;
  channels: Channel[];
  packs: string[];
  freeText: string;
  controls: { guardrails: string[]; max_daily_actions: number; require_human_approval: string[]; blocked_actions: string[]; discount_ceiling_pct: number; };
  email: string;
  name: string;
  company: string;
  plan: string;
}

const defaultWizard: WizardData = {
  step: 1, goal: '', template: null, channels: [], packs: [], freeText: '',
  controls: { guardrails: ['no_pii_exposure', 'max_daily_limit'], max_daily_actions: 200, require_human_approval: ['send_proposal'], blocked_actions: ['delete_data'], discount_ceiling_pct: 15 },
  email: '', name: '', company: '', plan: 'starter',
};

// ============================================================
// MAIN APP COMPONENT
// ============================================================
export default function App() {
  const [page, setPage] = useState<'landing' | 'wizard' | 'dashboard' | 'admin'>('landing');
  const [wizard, setWizard] = useState<WizardData>({ ...defaultWizard });
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);

  // Simulated Stripe
  const createStripeCustomer = (email: string, name: string) => {
    return `cus_${uid().slice(0, 14)}`;
  };

  const submitOrder = () => {
    // Create or find customer
    let customer = DB.customers.find(c => c.email === wizard.email);
    if (!customer) {
      const stripeId = createStripeCustomer(wizard.email, wizard.name);
      customer = { customer_id: uid(), email: wizard.email, name: wizard.name, company: wizard.company, stripe_customer_id: stripeId, created_at: now() };
      DB.customers.push(customer);
      audit('system', 'create_customer', customer.customer_id, `Created: ${wizard.email}`);
    }
    setCurrentCustomer(customer);

    // Create order
    const order: AgentOrder = { order_id: uid(), customer_id: customer.customer_id, request_type: wizard.template ? 'template' : wizard.freeText ? 'freetext' : 'wizard', request_payload: { ...wizard }, contract_id: null, status: 'pending', created_at: now() };
    DB.orders.push(order);
    audit('system', 'create_order', order.order_id, `Order: ${order.request_type}`);

    // Compile contract
    const contract = compileContract(wizard);
    contract.identity.owner_customer_id = customer.customer_id;
    contract.commercial_model.stripe_customer_id = customer.stripe_customer_id;

    // Auto-transition through states
    doTransition(contract, 'interpreted', 'system', 'Intent interpreted');
    doTransition(contract, 'compiled', 'system', 'Contract compiled');

    // Validate
    const connPacks = DB.connectedPacks[customer.customer_id] || [];
    const val = validateContract(contract, connPacks);
    contract.readiness_score = val.score;
    contract.readiness_level = val.level;
    if (val.valid) doTransition(contract, 'validated', 'system', 'Validation passed');

    DB.contracts.push(contract);
    order.contract_id = contract.contract_id;
    order.status = val.valid ? 'validated' : 'compiled';
    audit('system', 'compile_contract', contract.contract_id, `Score: ${contract.readiness_score}`);

    // Create instance
    const instance: AgentInstance = { instance_id: uid(), contract_id: contract.contract_id, customer_id: customer.customer_id, state: 'staged', environment: 'sandbox', created_at: now(), updated_at: now() };
    DB.instances.push(instance);

    // Seed usage event
    DB.usage.push({ id: uid(), contract_id: contract.contract_id, timestamp: now(), actions_count: 0, token_cost: 0, tool_cost: 0 });

    audit('system', 'stage_instance', instance.instance_id, `Staged for ${contract.contract_id}`);
    refresh();
    setPage('dashboard');
    setWizard({ ...defaultWizard });
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen">
      {/* NAV */}
      <nav className="glass sticky top-0 z-50 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => setPage('landing')} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-wf-accent rounded-lg flex items-center justify-center font-bold text-sm">WF</div>
            <span className="font-bold text-lg">WorkFamilyAI</span>
          </button>
          <div className="flex items-center gap-4">
            <button onClick={() => setPage('landing')} className={`text-sm ${page === 'landing' ? 'text-wf-accent' : 'text-gray-400 hover:text-white'}`}>Home</button>
            <button onClick={() => { setWizard({ ...defaultWizard }); setPage('wizard'); }} className={`text-sm ${page === 'wizard' ? 'text-wf-accent' : 'text-gray-400 hover:text-white'}`}>New Agent</button>
            <button onClick={() => setPage('dashboard')} className={`text-sm ${page === 'dashboard' ? 'text-wf-accent' : 'text-gray-400 hover:text-white'}`}>Dashboard</button>
            <button onClick={() => setPage('admin')} className={`text-sm ${page === 'admin' ? 'text-wf-accent' : 'text-gray-400 hover:text-white'}`}>Admin</button>
          </div>
        </div>
      </nav>

      {page === 'landing' && <Landing onStart={() => { setWizard({ ...defaultWizard }); setPage('wizard'); }} />}
      {page === 'wizard' && <Wizard data={wizard} onChange={setWizard} onSubmit={submitOrder} />}
      {page === 'dashboard' && <Dashboard customer={currentCustomer} refresh={refresh} />}
      {page === 'admin' && <Admin refresh={refresh} />}
    </div>
  );
}

// ============================================================
// LANDING PAGE
// ============================================================
function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-block px-4 py-1 rounded-full bg-wf-accent/20 text-wf-accent text-sm font-medium mb-6">One-Click AI Augmentation</div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          Deploy AI Agents<br /><span className="text-wf-accent">In Minutes, Not Months</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Lead generation, customer service, sales, finance, operations — choose a template, customize your controls, and go live. No code required.
        </p>
        <div className="flex gap-4 justify-center">
          <button onClick={onStart} className="btn-primary text-lg px-8 py-4">Get Started →</button>
          <button onClick={onStart} className="btn-secondary text-lg px-8 py-4">View Templates</button>
        </div>
      </section>

      {/* Starter Packs */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Starter Packs</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STARTER_PACKS.map(p => (
            <div key={p.id} className="card hover:border-wf-accent/40 transition-all cursor-pointer" onClick={onStart}>
              <h3 className="font-bold text-lg mb-2">{p.name}</h3>
              <p className="text-gray-400 text-sm mb-4">{p.desc}</p>
              <div className="flex flex-wrap gap-1 mb-4">
                {p.channels.map(ch => <span key={ch} className="badge badge-info">{ch}</span>)}
              </div>
              <div className="text-2xl font-bold text-wf-accent">${p.price}<span className="text-sm text-gray-400">/mo</span></div>
            </div>
          ))}
        </div>
      </section>

      {/* Templates */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Agent Templates</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TEMPLATES.map(t => (
            <div key={t.id} className="card hover:border-wf-accent/40 transition-all cursor-pointer" onClick={onStart}>
              <div className="text-3xl mb-3">{t.icon}</div>
              <span className="badge badge-purple mb-2">{t.cat}</span>
              <h3 className="font-bold text-lg mb-1">{t.name}</h3>
              <p className="text-gray-400 text-sm">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-8">
          {[
            { n: '1', title: 'Choose', desc: 'Pick a template, describe your need, or upload requirements' },
            { n: '2', title: 'Configure', desc: 'Set channels, guardrails, and connect dependency packs' },
            { n: '3', title: 'Preview', desc: 'Review the full agent contract and readiness score' },
            { n: '4', title: 'Deploy', desc: 'Go live with Stripe billing, logging, and real-time dashboard' },
          ].map(s => (
            <div key={s.n} className="text-center">
              <div className="w-12 h-12 rounded-full bg-wf-accent flex items-center justify-center text-xl font-bold mx-auto mb-4">{s.n}</div>
              <h3 className="font-bold mb-2">{s.title}</h3>
              <p className="text-gray-400 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 text-center text-gray-500 text-sm">
        WorkFamilyAI © {new Date().getFullYear()} — One-Click AI Augmentation Platform
      </footer>
    </div>
  );
}

// ============================================================
// WIZARD (7 Steps)
// ============================================================
function Wizard({ data, onChange, onSubmit }: { data: WizardData; onChange: (d: WizardData) => void; onSubmit: () => void }) {
  const update = (partial: Partial<WizardData>) => onChange({ ...data, ...partial });
  const steps = ['Goal', 'Augmentation', 'Channels', 'Controls', 'Preview', 'Checkout', 'Deploy'];

  const canNext = () => {
    if (data.step === 1) return data.goal.length > 3 || data.freeText.length > 3;
    if (data.step === 2) return !!data.template;
    if (data.step === 3) return data.channels.length > 0;
    if (data.step === 6) return data.email && data.name && data.company;
    return true;
  };

  const toggleChannel = (ch: Channel) => {
    const channels = data.channels.includes(ch) ? data.channels.filter(c => c !== ch) : [...data.channels, ch];
    update({ channels });
  };

  const togglePack = (p: string) => {
    const packs = data.packs.includes(p) ? data.packs.filter(x => x !== p) : [...data.packs, p];
    update({ packs });
  };

  // Auto-compute packs when template selected
  useEffect(() => {
    if (data.template && data.packs.length === 0) {
      update({ packs: PACK_MAP[data.template] || ['email_pack'] });
    }
  }, [data.template]);

  // Preview contract
  const previewContract = data.step >= 5 ? compileContract(data) : null;
  const previewValidation = previewContract ? validateContract(previewContract, data.packs) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 mb-12">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`step-indicator ${i + 1 < data.step ? 'step-done' : i + 1 === data.step ? 'step-active' : 'step-pending'}`}>
              {i + 1 < data.step ? '✓' : i + 1}
            </div>
            <span className={`text-xs hidden md:inline ${i + 1 === data.step ? 'text-white' : 'text-gray-500'}`}>{s}</span>
            {i < steps.length - 1 && <div className="w-8 h-px bg-gray-700" />}
          </div>
        ))}
      </div>

      <div className="card">
        {/* Step 1: Goal */}
        {data.step === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">What do you want to improve?</h2>
            <p className="text-gray-400 mb-6">Describe your business goal or choose a template to get started.</p>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Describe in your own words</label>
              <textarea className="input-field h-32" placeholder="e.g., I want to automate my lead generation on LinkedIn and email..." value={data.freeText} onChange={e => update({ freeText: e.target.value, goal: e.target.value })} />
              {data.freeText.length > 10 && (
                <div className="mt-3 p-3 rounded-lg bg-wf-accent/10 border border-wf-accent/20">
                  <p className="text-sm text-wf-accent font-medium">AI Interpretation:</p>
                  {(() => { const i = interpretText(data.freeText); return (
                    <div className="text-sm text-gray-300 mt-1">
                      <p>Template: <span className="text-white font-medium">{TEMPLATES.find(t => t.id === i.family)?.name || i.family}</span> (confidence: {Math.round(i.confidence * 100)}%)</p>
                      <p>Channels: {i.channels.join(', ')}</p>
                      <p>Friction score: {Math.round(i.friction * 100)}%</p>
                    </div>
                  ); })()}
                </div>
              )}
            </div>

            <div className="border-t border-gray-700 pt-6">
              <label className="block text-sm font-medium mb-2">Or set a specific goal</label>
              <input className="input-field" placeholder="e.g., Generate 50 qualified leads per week" value={data.goal} onChange={e => update({ goal: e.target.value })} />
            </div>
          </div>
        )}

        {/* Step 2: Choose augmentation */}
        {data.step === 2 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">Choose your augmentation</h2>
            <p className="text-gray-400 mb-6">Select an agent template or starter pack.</p>

            <h3 className="font-semibold text-sm text-gray-400 uppercase mb-3">Starter Packs</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {STARTER_PACKS.map(p => (
                <div key={p.id} onClick={() => update({ template: p.templates[0], packs: p.packs, channels: p.channels, plan: 'starter' })}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${data.template === p.templates[0] ? 'border-wf-accent bg-wf-accent/10' : 'border-gray-700 hover:border-gray-500'}`}>
                  <h4 className="font-bold">{p.name}</h4>
                  <p className="text-sm text-gray-400">{p.desc}</p>
                  <p className="text-wf-accent font-bold mt-2">${p.price}/mo</p>
                </div>
              ))}
            </div>

            <h3 className="font-semibold text-sm text-gray-400 uppercase mb-3">Individual Templates</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {TEMPLATES.map(t => (
                <div key={t.id} onClick={() => update({ template: t.id, packs: PACK_MAP[t.id] || [] })}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${data.template === t.id ? 'border-wf-accent bg-wf-accent/10' : 'border-gray-700 hover:border-gray-500'}`}>
                  <div className="text-2xl mb-2">{t.icon}</div>
                  <h4 className="font-bold text-sm">{t.name}</h4>
                  <p className="text-xs text-gray-400">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Channels & Packs */}
        {data.step === 3 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">Connect tools & channels</h2>
            <p className="text-gray-400 mb-6">Select communication channels and dependency packs.</p>

            <h3 className="font-semibold text-sm text-gray-400 uppercase mb-3">Channels</h3>
            <div className="flex flex-wrap gap-3 mb-8">
              {(['email', 'linkedin', 'phone', 'crm', 'webchat', 'internal'] as Channel[]).map(ch => (
                <button key={ch} onClick={() => toggleChannel(ch)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${data.channels.includes(ch) ? 'border-wf-accent bg-wf-accent/20 text-wf-accent' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                  {ch}
                </button>
              ))}
            </div>

            <h3 className="font-semibold text-sm text-gray-400 uppercase mb-3">Dependency Packs</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {Object.entries(PACKS).map(([id, pack]) => (
                <div key={id} onClick={() => togglePack(id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${data.packs.includes(id) ? 'border-green-500 bg-green-900/20' : 'border-gray-700 hover:border-gray-500'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{pack.name}</h4>
                      <p className="text-xs text-gray-400">{pack.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${data.packs.includes(id) ? 'border-green-500 bg-green-500 text-white' : 'border-gray-600'}`}>
                      {data.packs.includes(id) && '✓'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Controls */}
        {data.step === 4 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">Customize controls</h2>
            <p className="text-gray-400 mb-6">Set guardrails, limits, and escalation rules.</p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Max daily actions</label>
                <input type="number" className="input-field w-48" value={data.controls.max_daily_actions} onChange={e => update({ controls: { ...data.controls, max_daily_actions: parseInt(e.target.value) || 200 } })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Discount ceiling (%)</label>
                <input type="number" className="input-field w-48" value={data.controls.discount_ceiling_pct} onChange={e => update({ controls: { ...data.controls, discount_ceiling_pct: parseInt(e.target.value) || 15 } })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Guardrails</label>
                <div className="flex flex-wrap gap-2">
                  {['no_pii_exposure', 'max_daily_limit', 'human_review_required', 'gdpr_consent', 'rate_limiting', 'sentiment_check'].map(g => (
                    <button key={g} onClick={() => {
                      const gr = data.controls.guardrails.includes(g) ? data.controls.guardrails.filter(x => x !== g) : [...data.controls.guardrails, g];
                      update({ controls: { ...data.controls, guardrails: gr } });
                    }} className={`px-3 py-1 rounded-full text-xs font-medium border ${data.controls.guardrails.includes(g) ? 'border-green-500 bg-green-900/30 text-green-300' : 'border-gray-600 text-gray-400'}`}>
                      {g.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Require human approval for</label>
                <div className="flex flex-wrap gap-2">
                  {['send_proposal', 'book_meeting', 'send_email', 'escalate_deal', 'modify_pricing'].map(a => (
                    <button key={a} onClick={() => {
                      const ar = data.controls.require_human_approval.includes(a) ? data.controls.require_human_approval.filter(x => x !== a) : [...data.controls.require_human_approval, a];
                      update({ controls: { ...data.controls, require_human_approval: ar } });
                    }} className={`px-3 py-1 rounded-full text-xs font-medium border ${data.controls.require_human_approval.includes(a) ? 'border-yellow-500 bg-yellow-900/30 text-yellow-300' : 'border-gray-600 text-gray-400'}`}>
                      {a.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Preview */}
        {data.step === 5 && previewContract && previewValidation && (
          <div>
            <h2 className="text-2xl font-bold mb-2">Preview contract</h2>
            <div className="flex items-center gap-4 mb-6">
              <ReadinessBadge score={previewValidation.score} level={previewValidation.level} />
              <span className="text-sm text-gray-400">Readiness: {previewValidation.score}%</span>
            </div>

            {previewValidation.errors.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-800">
                <p className="font-medium text-red-300 text-sm mb-1">Validation Issues</p>
                {previewValidation.errors.map((e, i) => <p key={i} className="text-xs text-red-400">• {e}</p>)}
              </div>
            )}
            {previewValidation.warnings.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-yellow-900/20 border border-yellow-800">
                <p className="font-medium text-yellow-300 text-sm mb-1">Warnings</p>
                {previewValidation.warnings.map((w, i) => <p key={i} className="text-xs text-yellow-400">• {w}</p>)}
              </div>
            )}

            <div className="bg-wf-primary rounded-lg p-4 max-h-96 overflow-auto">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap">{JSON.stringify(previewContract, null, 2)}</pre>
            </div>
          </div>
        )}

        {/* Step 6: Checkout */}
        {data.step === 6 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">Checkout</h2>
            <p className="text-gray-400 mb-6">Enter your details to create your account and start billing.</p>

            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input className="input-field" type="email" placeholder="you@company.com" value={data.email} onChange={e => update({ email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Full name</label>
                <input className="input-field" placeholder="Jane Smith" value={data.name} onChange={e => update({ name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Company</label>
                <input className="input-field" placeholder="Acme Corp" value={data.company} onChange={e => update({ company: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Plan</label>
                <div className="grid grid-cols-3 gap-3">
                  {[{ id: 'starter', name: 'Starter', price: '$49' }, { id: 'professional', name: 'Professional', price: '$199' }, { id: 'enterprise', name: 'Enterprise', price: '$499' }].map(p => (
                    <button key={p.id} onClick={() => update({ plan: p.id })}
                      className={`p-3 rounded-lg border text-center ${data.plan === p.id ? 'border-wf-accent bg-wf-accent/10' : 'border-gray-700'}`}>
                      <div className="font-bold text-sm">{p.name}</div>
                      <div className="text-wf-accent font-bold">{p.price}<span className="text-xs text-gray-400">/mo</span></div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-wf-accent/10 border border-wf-accent/20">
              <p className="text-sm"><span className="text-wf-accent font-medium">Stripe integration:</span> A Stripe customer will be created automatically. Payment method attachment and subscription setup handled at checkout.</p>
            </div>
          </div>
        )}

        {/* Step 7: Deploy */}
        {data.step === 7 && (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold mb-2">Ready to deploy</h2>
            <p className="text-gray-400 mb-8">Your agent will be staged in sandbox mode. After admin approval, it will go live.</p>
            <div className="max-w-md mx-auto text-left mb-8">
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-400">Template</span><span>{TEMPLATES.find(t => t.id === data.template)?.name || 'Custom'}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">Channels</span><span>{data.channels.join(', ')}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">Packs</span><span>{data.packs.length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">Plan</span><span className="capitalize">{data.plan}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">Customer</span><span>{data.email}</span></div>
              </div>
            </div>
            <button onClick={onSubmit} className="btn-primary text-lg px-12 py-4">Deploy Agent →</button>
          </div>
        )}

        {/* Navigation */}
        {data.step < 7 && (
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-700">
            <button onClick={() => update({ step: Math.max(1, data.step - 1) })} disabled={data.step === 1}
              className="px-6 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white disabled:opacity-30">
              ← Back
            </button>
            <button onClick={() => update({ step: data.step + 1 })} disabled={!canNext()}
              className="btn-primary disabled:opacity-30">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CUSTOMER DASHBOARD
// ============================================================
function Dashboard({ customer, refresh }: { customer: Customer | null; refresh: () => void }) {
  const customerContracts = customer ? DB.contracts.filter(c => c.identity.owner_customer_id === customer.customer_id) : DB.contracts;
  const customerInstances = customer ? DB.instances.filter(i => i.customer_id === customer.customer_id) : DB.instances;
  const [selectedContract, setSelectedContract] = useState<AgentContract | null>(null);

  const togglePause = (instance: AgentInstance) => {
    const contract = DB.contracts.find(c => c.contract_id === instance.contract_id);
    if (!contract) return;
    const newState: AgentState = instance.state === 'live' ? 'paused' : instance.state === 'paused' ? 'live' : instance.state;
    if (newState !== instance.state) {
      instance.state = newState;
      instance.updated_at = now();
      doTransition(contract, newState, 'customer', newState === 'paused' ? 'Paused by customer' : 'Resumed by customer');
      refresh();
    }
  };

  if (DB.contracts.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">📋</div>
        <h2 className="text-2xl font-bold mb-2">No agents yet</h2>
        <p className="text-gray-400">Deploy your first AI agent to see it here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8">Customer Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Agents" value={customerInstances.filter(i => i.state === 'live').length} color="text-green-400" />
        <StatCard label="Staged" value={customerInstances.filter(i => i.state === 'staged').length} color="text-blue-400" />
        <StatCard label="Paused" value={customerInstances.filter(i => i.state === 'paused').length} color="text-yellow-400" />
        <StatCard label="Avg Readiness" value={customerContracts.length ? Math.round(customerContracts.reduce((s, c) => s + c.readiness_score, 0) / customerContracts.length) + '%' : '—'} color="text-wf-accent" />
      </div>

      {/* Agents list */}
      <div className="space-y-4">
        {customerContracts.map(contract => {
          const instance = customerInstances.find(i => i.contract_id === contract.contract_id);
          const usage = DB.usage.filter(u => u.contract_id === contract.contract_id);
          return (
            <div key={contract.contract_id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-lg">{contract.identity.agent_name}</h3>
                    <StateBadge state={instance?.state || contract.deployment.state} />
                    <ReadinessBadge score={contract.readiness_score} level={contract.readiness_level} />
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{contract.objective.primary_goal}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {contract.channels.map(ch => <span key={ch} className="badge badge-info">{ch}</span>)}
                    <span className="badge badge-purple">{contract.commercial_model.plan_type}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Tasks: {contract.tasks.length}</span>
                    <span>Packs: {contract.dependency_packs.length}</span>
                    <span>Created: {new Date(contract.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {instance && (instance.state === 'live' || instance.state === 'paused') && (
                    <button onClick={() => togglePause(instance)} className={`px-3 py-1 rounded text-xs font-medium ${instance.state === 'live' ? 'bg-yellow-900/50 text-yellow-300' : 'bg-green-900/50 text-green-300'}`}>
                      {instance.state === 'live' ? 'Pause' : 'Resume'}
                    </button>
                  )}
                  <button onClick={() => setSelectedContract(selectedContract?.contract_id === contract.contract_id ? null : contract)} className="px-3 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300">
                    {selectedContract?.contract_id === contract.contract_id ? 'Hide' : 'Details'}
                  </button>
                </div>
              </div>

              {/* Dependency packs status */}
              {contract.dependency_packs.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-xs font-medium text-gray-400 mb-2">Dependency Packs</p>
                  <div className="flex flex-wrap gap-2">
                    {contract.dependency_packs.map(p => (
                      <span key={p} className={`badge ${DB.connectedPacks[contract.identity.owner_customer_id]?.includes(p) ? 'badge-success' : 'badge-danger'}`}>
                        {PACKS[p]?.name || p} {DB.connectedPacks[contract.identity.owner_customer_id]?.includes(p) ? '✓' : '✗'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Usage summary */}
              {usage.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-xs font-medium text-gray-400 mb-2">Usage Summary</p>
                  <div className="flex gap-6 text-sm">
                    <span>Actions: {usage.reduce((s, u) => s + u.actions_count, 0)}</span>
                    <span>Token cost: ${(usage.reduce((s, u) => s + u.token_cost, 0) / 100).toFixed(2)}</span>
                    <span>Tool cost: ${(usage.reduce((s, u) => s + u.tool_cost, 0) / 100).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Contract JSON */}
              {selectedContract?.contract_id === contract.contract_id && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <p className="text-xs font-medium text-gray-400 mb-2">Contract JSON</p>
                  <div className="bg-wf-primary rounded-lg p-3 max-h-64 overflow-auto">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap">{JSON.stringify(contract, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// ADMIN CONSOLE
// ============================================================
function Admin({ refresh }: { refresh: () => void }) {
  const [tab, setTab] = useState<'orders' | 'contracts' | 'instances' | 'audit' | 'usage'>('orders');
  const [selectedContract, setSelectedContract] = useState<string | null>(null);

  const approveContract = (contractId: string) => {
    const contract = DB.contracts.find(c => c.contract_id === contractId);
    if (!contract) return;
    if (doTransition(contract, 'approved', 'admin', 'Admin approved')) {
      doTransition(contract, 'staged', 'system', 'Auto-staged after approval');
      const instance = DB.instances.find(i => i.contract_id === contractId);
      if (instance) { instance.state = 'staged'; instance.updated_at = now(); }
      audit('admin', 'approve', contractId, 'Approved and staged');
      refresh();
    }
  };

  const goLive = (contractId: string) => {
    const contract = DB.contracts.find(c => c.contract_id === contractId);
    if (!contract) return;
    if (contract.deployment.state === 'staged') {
      doTransition(contract, 'live', 'admin', 'Admin pushed to live');
      const instance = DB.instances.find(i => i.contract_id === contractId);
      if (instance) { instance.state = 'live'; instance.updated_at = now(); }
      // Seed some usage
      DB.usage.push({ id: uid(), contract_id: contractId, timestamp: now(), actions_count: 12, token_cost: 45, tool_cost: 10 });
      audit('admin', 'go_live', contractId, 'Pushed to live');
      refresh();
    }
  };

  const pauseAgent = (contractId: string) => {
    const contract = DB.contracts.find(c => c.contract_id === contractId);
    if (!contract) return;
    if (doTransition(contract, 'paused', 'admin', 'Admin paused')) {
      const instance = DB.instances.find(i => i.contract_id === contractId);
      if (instance) { instance.state = 'paused'; instance.updated_at = now(); }
      audit('admin', 'pause', contractId, 'Paused by admin');
      refresh();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Admin Console</h1>
      <p className="text-gray-400 mb-8">Manage orders, contracts, agents, and system health.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Customers" value={DB.customers.length} color="text-blue-400" />
        <StatCard label="Orders" value={DB.orders.length} color="text-purple-400" />
        <StatCard label="Contracts" value={DB.contracts.length} color="text-wf-accent" />
        <StatCard label="Live Agents" value={DB.instances.filter(i => i.state === 'live').length} color="text-green-400" />
        <StatCard label="Audit Events" value={DB.audit.length} color="text-gray-400" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-800 pb-2">
        {(['orders', 'contracts', 'instances', 'audit', 'usage'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium capitalize ${tab === t ? 'bg-wf-surface text-wf-accent border-b-2 border-wf-accent' : 'text-gray-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Orders tab */}
      {tab === 'orders' && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-700">
              <th className="table-header">Order ID</th>
              <th className="table-header">Customer</th>
              <th className="table-header">Type</th>
              <th className="table-header">Status</th>
              <th className="table-header">Contract</th>
              <th className="table-header">Created</th>
            </tr></thead>
            <tbody>
              {DB.orders.map(o => {
                const cust = DB.customers.find(c => c.customer_id === o.customer_id);
                return (
                  <tr key={o.order_id} className="border-b border-gray-800">
                    <td className="table-cell font-mono text-xs">{o.order_id.slice(0, 8)}</td>
                    <td className="table-cell">{cust?.email || '—'}</td>
                    <td className="table-cell"><span className="badge badge-info">{o.request_type}</span></td>
                    <td className="table-cell"><span className={`badge ${o.status === 'validated' ? 'badge-success' : o.status === 'compiled' ? 'badge-warning' : 'badge-info'}`}>{o.status}</span></td>
                    <td className="table-cell font-mono text-xs">{o.contract_id?.slice(0, 8) || '—'}</td>
                    <td className="table-cell text-gray-400 text-xs">{new Date(o.created_at).toLocaleString()}</td>
                  </tr>
                );
              })}
              {DB.orders.length === 0 && <tr><td colSpan={6} className="table-cell text-center text-gray-500">No orders yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Contracts tab */}
      {tab === 'contracts' && (
        <div className="space-y-4">
          {DB.contracts.map(c => (
            <div key={c.contract_id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold">{c.identity.agent_name}</h3>
                    <StateBadge state={c.deployment.state} />
                    <ReadinessBadge score={c.readiness_score} level={c.readiness_level} />
                  </div>
                  <p className="text-sm text-gray-400">{c.objective.primary_goal}</p>
                  <div className="flex gap-2 mt-2">
                    {c.channels.map(ch => <span key={ch} className="badge badge-info text-xs">{ch}</span>)}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>Packs: {c.dependency_packs.length}</span>
                    <span>Tasks: {c.tasks.length}</span>
                    <span>Score: {c.readiness_score}%</span>
                    <span>Stripe: {c.commercial_model.stripe_customer_id ? '✓' : '✗'}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {c.deployment.state === 'validated' && (
                    <button onClick={() => approveContract(c.contract_id)} className="px-3 py-1 rounded text-xs font-medium bg-green-900/50 text-green-300 hover:bg-green-800/50">Approve</button>
                  )}
                  {c.deployment.state === 'staged' && (
                    <button onClick={() => goLive(c.contract_id)} className="px-3 py-1 rounded text-xs font-medium bg-blue-900/50 text-blue-300 hover:bg-blue-800/50">Go Live</button>
                  )}
                  {(c.deployment.state === 'live' || c.deployment.state === 'staged') && (
                    <button onClick={() => pauseAgent(c.contract_id)} className="px-3 py-1 rounded text-xs font-medium bg-yellow-900/50 text-yellow-300 hover:bg-yellow-800/50">Pause</button>
                  )}
                  <button onClick={() => setSelectedContract(selectedContract === c.contract_id ? null : c.contract_id)} className="px-3 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300">
                    {selectedContract === c.contract_id ? 'Hide JSON' : 'View JSON'}
                  </button>
                </div>
              </div>

              {/* Missing packs */}
              {c.dependency_packs.some(p => !(DB.connectedPacks[c.identity.owner_customer_id] || []).includes(p)) && (
                <div className="mt-3 p-2 rounded bg-red-900/20 border border-red-800/50">
                  <p className="text-xs text-red-300 font-medium">Missing dependency packs:</p>
                  <p className="text-xs text-red-400">{c.dependency_packs.filter(p => !(DB.connectedPacks[c.identity.owner_customer_id] || []).includes(p)).map(p => PACKS[p]?.name || p).join(', ')}</p>
                </div>
              )}

              {/* Contract JSON */}
              {selectedContract === c.contract_id && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="bg-wf-primary rounded-lg p-3 max-h-80 overflow-auto">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap">{JSON.stringify(c, null, 2)}</pre>
                  </div>
                </div>
              )}

              {/* State history */}
              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-xs font-medium text-gray-400 mb-1">State History</p>
                <div className="flex flex-wrap gap-1">
                  {c.audit.state_history.map((h, i) => (
                    <span key={i} className="text-xs text-gray-500">
                      {h.from || '∅'} → <span className="text-gray-300">{h.to}</span>
                      {i < c.audit.state_history.length - 1 && ' → '}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {DB.contracts.length === 0 && <div className="card text-center text-gray-500">No contracts yet</div>}
        </div>
      )}

      {/* Instances tab */}
      {tab === 'instances' && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-700">
              <th className="table-header">Instance ID</th>
              <th className="table-header">Contract</th>
              <th className="table-header">State</th>
              <th className="table-header">Environment</th>
              <th className="table-header">Created</th>
            </tr></thead>
            <tbody>
              {DB.instances.map(i => (
                <tr key={i.instance_id} className="border-b border-gray-800">
                  <td className="table-cell font-mono text-xs">{i.instance_id.slice(0, 8)}</td>
                  <td className="table-cell font-mono text-xs">{i.contract_id.slice(0, 8)}</td>
                  <td className="table-cell"><StateBadge state={i.state} /></td>
                  <td className="table-cell">{i.environment}</td>
                  <td className="table-cell text-gray-400 text-xs">{new Date(i.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {DB.instances.length === 0 && <tr><td colSpan={5} className="table-cell text-center text-gray-500">No instances</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit tab */}
      {tab === 'audit' && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-700">
              <th className="table-header">Time</th>
              <th className="table-header">Actor</th>
              <th className="table-header">Action</th>
              <th className="table-header">Target</th>
              <th className="table-header">Details</th>
            </tr></thead>
            <tbody>
              {DB.audit.map(a => (
                <tr key={a.id} className="border-b border-gray-800">
                  <td className="table-cell text-gray-400 text-xs whitespace-nowrap">{new Date(a.timestamp).toLocaleString()}</td>
                  <td className="table-cell text-xs">{a.actor}</td>
                  <td className="table-cell"><span className="badge badge-purple text-xs">{a.action}</span></td>
                  <td className="table-cell font-mono text-xs">{a.target.slice(0, 8)}</td>
                  <td className="table-cell text-xs text-gray-400">{a.details}</td>
                </tr>
              ))}
              {DB.audit.length === 0 && <tr><td colSpan={5} className="table-cell text-center text-gray-500">No audit events</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Usage tab */}
      {tab === 'usage' && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-700">
              <th className="table-header">Time</th>
              <th className="table-header">Contract</th>
              <th className="table-header">Actions</th>
              <th className="table-header">Token Cost</th>
              <th className="table-header">Tool Cost</th>
            </tr></thead>
            <tbody>
              {DB.usage.map(u => (
                <tr key={u.id} className="border-b border-gray-800">
                  <td className="table-cell text-gray-400 text-xs">{new Date(u.timestamp).toLocaleString()}</td>
                  <td className="table-cell font-mono text-xs">{u.contract_id.slice(0, 8)}</td>
                  <td className="table-cell">{u.actions_count}</td>
                  <td className="table-cell">${(u.token_cost / 100).toFixed(2)}</td>
                  <td className="table-cell">${(u.tool_cost / 100).toFixed(2)}</td>
                </tr>
              ))}
              {DB.usage.length === 0 && <tr><td colSpan={5} className="table-cell text-center text-gray-500">No usage events</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SHARED COMPONENTS
// ============================================================
function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="card py-4">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function StateBadge({ state }: { state: string }) {
  const colors: Record<string, string> = {
    requested: 'badge-info', interpreted: 'badge-info', compiled: 'badge-warning',
    validated: 'badge-purple', approved: 'badge-success', staged: 'badge-info',
    live: 'badge-success', paused: 'badge-warning', retired: 'badge-danger',
  };
  return <span className={`badge ${colors[state] || 'badge-info'}`}>{state}</span>;
}

function ReadinessBadge({ score, level }: { score: number; level: ReadinessLevel }) {
  const colors: Record<string, string> = { ready: 'badge-success', needs_setup: 'badge-warning', blocked: 'badge-danger' };
  return <span className={`badge ${colors[level]}`}>{score}% — {level.replace('_', ' ')}</span>;
}

// Helper functions defined at top of file (uid, now, audit)
