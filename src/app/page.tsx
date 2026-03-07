'use client';
import React, { useState, useEffect, useCallback } from 'react';

/* ─── Types ───────────────────────────────────────────── */
interface Product {
  id: string; name: string; category: string; tier: string | null;
  base_price: number; description: string; delivery_method: string | null;
  target_audience: string | null; customer_outcome: string | null;
  engagement_model: string | null; tags: string[] | null;
  stripe_product_id: string | null; stripe_price_id: string | null;
}
interface CategoryStat { category: string; cnt: number; min_price: number; max_price: number; }
interface CartItem { product: Product; qty: number; }

/* ─── Canonical Contract Types (from spec) ─────────────── */
interface CanonicalContract {
  identity: { contract_id: string; customer_id: string; business_id: string; agent_type: string; product_name: string; version: string; environment: string; order_source: string; };
  objective: { primary_goal: string; secondary_goals: string[]; success_outcomes: string[]; non_goals: string[]; };
  operating_mode: { direction: string; behaviour: string[]; human_control: string; };
  channels: string[];
  tasks: string[];
  inputs: { website_urls: string[]; document_refs: string[]; faq_refs: string[]; policy_refs: string[]; pricing_refs: string[]; crm_ref: string; inbox_ref: string; calendar_ref: string; supportdesk_ref: string; };
  outputs: { artifacts: string[]; events: string[]; updates: string[]; };
  controls: { daily_volume_cap: number; followup_cap: number; confidence_floor: number; discount_threshold_pct: number; requires_approval_for_send: boolean; requires_approval_for_proposal: boolean; requires_approval_for_strategic_accounts: boolean; brand_risk_auto_pause: boolean; complaint_auto_pause: boolean; emergency_escalation_required: boolean; geography_limits: string[]; working_hours: { timezone: string; days: string[]; start: string; end: string; }; };
  access_profile: { profile_name: string; permissions: Record<string, boolean>; };
  secrets_profile: Record<string, string | null>;
  observability: { logging_profile: string; retention_days: number; capture_transcripts: boolean; capture_token_costs: boolean; capture_human_interventions: boolean; pause_triggers: string[]; };
  commercial_model: { pricing_type: string; setup_fee: number | null; monthly_fee: number | null; usage_fee_basis: string; outcome_fee_basis: string; };
  deployment: { state: string; readiness: string; missing_dependencies: string[]; };
  acceptance_criteria: { operational: string[]; quality: string[]; commercial: string[]; };
  audit: { created_at: string; created_by: string; approved_by: string; last_validated_at: string; };
}

/* ─── Wizard form state ────────────────────────────────── */
interface AgentFormState {
  // Step 1: Start mode
  start_mode: 'catalogue' | 'describe_need' | 'paste_instructions' | 'upload_material' | 'advanced_configuration';
  // Step 2: Basic job
  business_name: string; agent_goal: string; desired_outcome: string; urgency: string;
  operating_region: string; language: string; timezone: string; contact_email: string; contact_name: string;
  free_text: string; // for describe/paste modes
  // Step 3: Channels
  channels: string[];
  // Step 4: Tasks
  tasks: string[];
  // Step 5: Operating profile
  direction: string; behaviour: string[]; working_hours_start: string; working_hours_end: string;
  working_days: string[]; daily_volume_cap: number; followup_cap: number;
  human_control: string; confidence_floor: number; geography_limits: string[]; tone_preset: string;
  // Step 6: Inputs
  inputs_website: string; inputs_docs: string; inputs_faqs: string; inputs_scripts: string;
  inputs_pricing: string; inputs_crm: boolean; inputs_inbox: boolean; inputs_calendar: boolean;
  inputs_supportdesk: boolean; inputs_policies: string; inputs_case_studies: string;
  // Step 7: Controls
  approval_for_send: boolean; approval_for_proposals: boolean; approval_over_discount: boolean;
  approval_for_strategic: boolean; brand_risk_pause: boolean; complaint_pause: boolean;
  abuse_escalate: boolean; emergency_escalation: boolean; compliance_escalation: boolean;
  discount_threshold: number;
  // Step 8/9: SLA
  sla: string;
}

const defaultForm: AgentFormState = {
  start_mode: 'catalogue', business_name: '', agent_goal: '', desired_outcome: '', urgency: 'standard',
  operating_region: 'Australia', language: 'English', timezone: 'Australia/Sydney', contact_email: '', contact_name: '',
  free_text: '',
  channels: [], tasks: [],
  direction: 'outbound', behaviour: ['proactive'], working_hours_start: '08:00', working_hours_end: '18:00',
  working_days: ['Mon','Tue','Wed','Thu','Fri'], daily_volume_cap: 100, followup_cap: 2,
  human_control: 'autonomous_with_guardrails', confidence_floor: 0.7, geography_limits: ['Australia'], tone_preset: 'professional',
  inputs_website: '', inputs_docs: '', inputs_faqs: '', inputs_scripts: '', inputs_pricing: '',
  inputs_crm: false, inputs_inbox: false, inputs_calendar: false, inputs_supportdesk: false,
  inputs_policies: '', inputs_case_studies: '',
  approval_for_send: false, approval_for_proposals: true, approval_over_discount: true,
  approval_for_strategic: true, brand_risk_pause: true, complaint_pause: true,
  abuse_escalate: true, emergency_escalation: false, compliance_escalation: false,
  discount_threshold: 10,
  sla: 'standard',
};

/* ─── Constants ────────────────────────────────────────── */
const ALL_CHANNELS = [
  { id: 'phone', label: 'Phone', icon: '📞' }, { id: 'email', label: 'Email', icon: '📧' },
  { id: 'webchat', label: 'Webchat', icon: '💬' }, { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '📱' }, { id: 'sms', label: 'SMS', icon: '✉️' },
  { id: 'crm', label: 'CRM', icon: '🗂️' }, { id: 'support_desk', label: 'Support Desk', icon: '🎫' },
  { id: 'calendar', label: 'Calendar', icon: '📅' }, { id: 'website_forms', label: 'Website Forms', icon: '📝' },
];
const ALL_TASKS = [
  { id: 'answer', label: 'Answer', desc: 'Respond to inbound queries' },
  { id: 'classify', label: 'Classify', desc: 'Categorise and route' },
  { id: 'draft', label: 'Draft', desc: 'Create messages/proposals' },
  { id: 'send', label: 'Send', desc: 'Deliver outbound comms' },
  { id: 'monitor', label: 'Monitor', desc: 'Watch for signals/events' },
  { id: 'alert', label: 'Alert', desc: 'Notify on triggers' },
  { id: 'qualify', label: 'Qualify', desc: 'Score and qualify leads' },
  { id: 'book', label: 'Book', desc: 'Schedule meetings/calls' },
  { id: 'propose', label: 'Propose', desc: 'Generate proposals' },
  { id: 'escalate', label: 'Escalate', desc: 'Route to humans' },
  { id: 'summarise', label: 'Summarise', desc: 'Create summaries/reports' },
  { id: 'chase', label: 'Chase', desc: 'Follow up on actions' },
  { id: 'collect', label: 'Collect', desc: 'Gather information' },
  { id: 'route', label: 'Route', desc: 'Direct to right team/person' },
];
const BEHAVIOURS = ['reactive', 'proactive', 'scheduled', 'event_driven', 'always_on'];
const TONES = ['professional', 'strategic', 'friendly', 'operational', 'executive', 'human_centred'];
const URGENCIES = [
  { id: 'standard', label: 'Standard', desc: 'Normal timeline' },
  { id: 'priority', label: 'Priority', desc: 'Fast-track setup' },
  { id: 'urgent', label: 'Urgent', desc: 'Next business day' },
];
const HUMAN_CONTROLS = [
  { id: 'human_in_loop', label: 'Human-in-Loop', desc: 'Approve every action' },
  { id: 'approval_before_send', label: 'Approve Before Send', desc: 'Review outbound only' },
  { id: 'autonomous_with_guardrails', label: 'Autonomous + Guardrails', desc: 'Agent acts within limits' },
];

/* ─── Icon components ─────────────────────────────────── */
const Icons = {
  Bot: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="11"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/></svg>,
  Shield: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Zap: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Cart: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>,
  Search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Arrow: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 inline"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5"><polyline points="20 6 9 17 4 12"/></svg>,
  X: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Globe: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  Headphones: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg>,
};

const catIcons: Record<string, string> = {
  'Strategic AI': '🧠', 'Training AI': '🎓', 'Process AI': '⚙️', 'Analytics AI': '📊',
  'Risk Management': '🛡️', 'Voice AI': '🎙️', 'HR AI': '👥', 'Marketing AI': '📣',
  'Customer Experience': '💬', 'Operations': '🔧', 'Governance & Compliance': '📋',
  'Platform AI': '🌐', 'Productivity AI': '⚡', 'Bundle': '📦', 'Product': '🏷️',
  'Service': '🔨', 'Hardware': '💻', 'Support': '🛟', 'Consulting': '💼',
  'Training': '📚', 'Package Extra': '➕', 'Analytics & Intelligence': '🔍',
  'Strategy & Consulting': '🎯', 'Process Automation': '🤖',
};
const tierColors: Record<string, string> = { Core: 'bg-blue-100 text-blue-700', Premium: 'bg-purple-100 text-purple-700', Enterprise: 'bg-amber-100 text-amber-700' };

function formatPrice(p: number) {
  if (p >= 1000) return `$${(p/1000).toFixed(p%1000===0?0:1)}K`;
  return `$${p.toFixed(p%1===0?0:2)}`;
}

/* ─── Contract compiler ────────────────────────────────── */
function compileCanonicalContract(form: AgentFormState, cart: CartItem[], cartTotal: number): Partial<CanonicalContract> {
  const now = new Date().toISOString();
  const productNames = cart.map(c => c.product.name).join(', ');
  return {
    identity: {
      contract_id: `CNT-${Date.now().toString(36).toUpperCase()}`,
      customer_id: '', business_id: form.business_name.toLowerCase().replace(/\s+/g, '_'),
      agent_type: cart[0]?.product.category?.toLowerCase().replace(/\s+/g, '_') || 'custom',
      product_name: productNames, version: 'v1',
      environment: 'staging_safe', order_source: form.start_mode,
    },
    objective: {
      primary_goal: form.agent_goal || `Deploy ${productNames} for ${form.business_name}`,
      secondary_goals: form.desired_outcome ? [form.desired_outcome] : [],
      success_outcomes: cart.map(c => c.product.customer_outcome || c.product.name),
      non_goals: ['Off-scope actions', 'Unsupported claims', 'Unapproved discounting'],
    },
    operating_mode: {
      direction: form.direction, behaviour: form.behaviour, human_control: form.human_control,
    },
    channels: form.channels,
    tasks: form.tasks,
    inputs: {
      website_urls: form.inputs_website ? form.inputs_website.split(',').map(s => s.trim()) : [],
      document_refs: form.inputs_docs ? form.inputs_docs.split(',').map(s => s.trim()) : [],
      faq_refs: form.inputs_faqs ? form.inputs_faqs.split(',').map(s => s.trim()) : [],
      policy_refs: form.inputs_policies ? form.inputs_policies.split(',').map(s => s.trim()) : [],
      pricing_refs: form.inputs_pricing ? form.inputs_pricing.split(',').map(s => s.trim()) : [],
      crm_ref: form.inputs_crm ? 'crm_primary' : '', inbox_ref: form.inputs_inbox ? 'inbox_primary' : '',
      calendar_ref: form.inputs_calendar ? 'calendar_primary' : '', supportdesk_ref: form.inputs_supportdesk ? 'supportdesk_primary' : '',
    },
    controls: {
      daily_volume_cap: form.daily_volume_cap, followup_cap: form.followup_cap,
      confidence_floor: form.confidence_floor, discount_threshold_pct: form.discount_threshold,
      requires_approval_for_send: form.approval_for_send, requires_approval_for_proposal: form.approval_for_proposals,
      requires_approval_for_strategic_accounts: form.approval_for_strategic,
      brand_risk_auto_pause: form.brand_risk_pause, complaint_auto_pause: form.complaint_pause,
      emergency_escalation_required: form.emergency_escalation,
      geography_limits: form.geography_limits,
      working_hours: { timezone: form.timezone, days: form.working_days, start: form.working_hours_start, end: form.working_hours_end },
    },
    observability: {
      logging_profile: 'standard', retention_days: 365,
      capture_transcripts: true, capture_token_costs: true, capture_human_interventions: true,
      pause_triggers: [
        ...(form.complaint_pause ? ['complaint_spike'] : []),
        ...(form.brand_risk_pause ? ['brand_risk_keyword'] : []),
        'logging_failure', 'send_failure_spike',
      ],
    },
    commercial_model: {
      pricing_type: 'hybrid', setup_fee: null, monthly_fee: null,
      usage_fee_basis: 'per action', outcome_fee_basis: 'per qualified result',
    },
    deployment: {
      state: 'draft', readiness: 'not_ready', missing_dependencies: [],
    },
    audit: { created_at: now, created_by: form.contact_email || 'web_order', approved_by: '', last_validated_at: now },
  };
}

/* ═══════════════════════════════════════════════════════ */
/*  MAIN APP                                              */
/* ═══════════════════════════════════════════════════════ */
export default function Home() {
  const [view, setView] = useState<'landing'|'catalog'|'configure'|'cart'|'dashboard'>('landing');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selCat, setSelCat] = useState<string|null>(null);
  const [selTier, setSelTier] = useState<string|null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product|null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [agentForm, setAgentForm] = useState<AgentFormState>({...defaultForm});
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);

  const fetchCatalog = useCallback(async (cat?: string|null, tier?: string|null, q?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (cat) params.set('category', cat);
    if (tier) params.set('tier', tier);
    if (q) params.set('q', q);
    try {
      const r = await fetch(`/api/catalog?${params}`);
      const data = await r.json();
      if (data.success) { setProducts(data.products || []); if (data.categories) setCategories(data.categories); }
    } catch(e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { if (view === 'catalog') fetchCatalog(selCat, selTier, search); }, [view, selCat, selTier]);

  const addToCart = (p: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === p.id);
      if (existing) return prev.map(c => c.product.id === p.id ? {...c, qty: c.qty+1} : c);
      return [...prev, { product: p, qty: 1 }];
    });
  };
  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.product.id !== id));
  const cartTotal = cart.reduce((s, c) => s + c.product.base_price * c.qty, 0);

  const submitOrder = async () => {
    setSubmitting(true);
    const canonicalContract = compileCanonicalContract(agentForm, cart, cartTotal);
    try {
      const orderRes = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: agentForm.contact_email, name: agentForm.contact_name,
          company: agentForm.business_name, request_type: 'agent_contract',
          payload: { items: cart.map(c => ({ id: c.product.id, name: c.product.name, qty: c.qty, price: c.product.base_price })), sla: agentForm.sla, total: cartTotal, canonical_contract: canonicalContract },
        }),
      });
      const orderData = await orderRes.json();
      if (orderData.success && orderData.customer_id) {
        const contractRes = await fetch('/api/contracts', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: orderData.customer_id,
            contract: { ...canonicalContract, items: cart.map(c => ({ id: c.product.id, name: c.product.name, category: c.product.category, tier: c.product.tier, qty: c.qty, unit_price: c.product.base_price })), total_aud: cartTotal, sla: agentForm.sla, company: agentForm.business_name, state: 'requested' },
          }),
        });
        const contractData2 = await contractRes.json();
        setOrderResult({ order_id: orderData.order_id, contract_id: contractData2.contract_id, customer_id: orderData.customer_id, canonical_contract: canonicalContract });
        setView('dashboard');
      }
    } catch(e) { console.error(e); }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="fixed top-0 w-full z-50 bg-gray-950/90 backdrop-blur border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => { setView('landing'); setSelectedProduct(null); }} className="flex items-center gap-3">
            <img src="/droid-head.webp" alt="WF" className="w-8 h-8 rounded-lg" />
            <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">WorkFamilyAI</span>
          </button>
          <div className="flex items-center gap-6">
            <button onClick={() => setView('catalog')} className={`text-sm font-medium transition ${view==='catalog' ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}`}>Catalog</button>
            <button onClick={() => { setWizardStep(0); setView('configure'); }} className={`text-sm font-medium transition ${view==='configure' ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}`}>Configure Agent</button>
            <a href="/buddy" className="text-sm font-medium text-gray-400 hover:text-white transition">Buddy</a>
            <button onClick={() => setView('cart')} className="relative text-gray-400 hover:text-white transition">
              <Icons.Cart />
              {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-cyan-500 text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{cart.length}</span>}
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        {view === 'landing' && <LandingView onBrowse={() => setView('catalog')} onConfigure={() => { setWizardStep(0); setView('configure'); }} categories={categories} fetchCatalog={fetchCatalog} setSelCat={setSelCat} setView={setView} />}
        {view === 'catalog' && <CatalogView products={products} categories={categories} loading={loading} search={search} setSearch={setSearch} selCat={selCat} setSelCat={setSelCat} selTier={selTier} setSelTier={setSelTier} fetchCatalog={fetchCatalog} addToCart={addToCart} cart={cart} selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} />}
        {view === 'cart' && <CartView cart={cart} removeFromCart={removeFromCart} cartTotal={cartTotal} onCheckout={() => { setWizardStep(0); setView('configure'); }} />}
        {view === 'configure' && <CompilerView cart={cart} cartTotal={cartTotal} wizardStep={wizardStep} setWizardStep={setWizardStep} form={agentForm} setForm={setAgentForm} submitting={submitting} submitOrder={submitOrder} onBrowse={() => setView('catalog')} />}
        {view === 'dashboard' && <DashboardView orderResult={orderResult} cart={cart} form={agentForm} cartTotal={cartTotal} />}
      </main>

      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <img src="/droid-head.webp" alt="" className="w-6 h-6 rounded" />
            <span className="text-sm text-gray-500">© 2026 WorkFamilyAI · Tech4Humanity · Neural Ennead</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <span>Intent-to-Agent Compiler v1</span><span>·</span><span>238 Products</span><span>·</span><span>25 Categories</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  LANDING VIEW                                          */
/* ═══════════════════════════════════════════════════════ */
function LandingView({ onBrowse, onConfigure, categories, fetchCatalog, setSelCat, setView }: any) {
  useEffect(() => { if (categories.length === 0) fetchCatalog(); }, []);
  const aiCategories = (categories as CategoryStat[]).filter(c => !['Product','Service','Hardware','Support','Consulting','Training','Surcharge','Package Extra','Bundle'].includes(c.category));

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/40 via-gray-950 to-blue-950/40" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-6 py-32 md:py-40">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-8">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> Intent-to-Agent Compiler · Live
              </div>
              <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
                Describe It.<br />
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">We Compile It.</span>
              </h1>
              <p className="text-xl text-gray-400 mb-10 leading-relaxed max-w-lg">
                Pick an agent, describe your need, or paste instructions. We compile it into a canonical contract, validate it, and deploy. 5 entry modes. 9-state machine. Real execution.
              </p>
              <div className="flex flex-wrap gap-4">
                <button onClick={onConfigure} className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
                  Configure an Agent <Icons.Arrow />
                </button>
                <button onClick={onBrowse} className="px-8 py-4 border border-white/10 rounded-xl font-semibold text-lg hover:bg-white/5 transition">
                  Browse Catalog
                </button>
              </div>
            </div>
            <div className="hidden md:block">
              <img src="/neural-ennead-family.png" alt="Neural Ennead" className="w-full rounded-2xl shadow-2xl shadow-cyan-500/10 border border-white/5" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works — 9 steps now */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Intent-to-Agent Compiler</h2>
          <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">9 steps from intent to deployed agent. Choose your entry mode, configure channels and tasks, set controls, and deploy.</p>
          <div className="grid sm:grid-cols-3 lg:grid-cols-3 gap-6">
            {[
              { n: '1', title: 'Start Mode', desc: 'Pick from catalogue, describe a need, paste instructions, or upload material.' },
              { n: '2', title: 'Job Definition', desc: 'Business, goal, outcome, urgency, region, language, timezone.' },
              { n: '3', title: 'Channels', desc: 'Phone, email, webchat, LinkedIn, WhatsApp, SMS, CRM, calendar.' },
              { n: '4', title: 'Tasks', desc: 'Answer, classify, draft, send, qualify, book, propose, escalate.' },
              { n: '5', title: 'Operating Profile', desc: 'Direction, hours, volume caps, human control, confidence floor.' },
              { n: '6', title: 'Inputs', desc: 'Website, docs, FAQs, scripts, CRM, inbox, calendar connections.' },
              { n: '7', title: 'Controls', desc: 'Approval rules, brand-risk pause, complaint handling, discount limits.' },
              { n: '8', title: 'Review Contract', desc: 'Preview what the agent will do, won\'t do, and all guardrails.' },
              { n: '9', title: 'Submit & Deploy', desc: 'Canonical contract compiled, validated, and queued for deployment.' },
            ].map((s, i) => (
              <div key={i} className="relative group">
                <div className="absolute -top-2 -left-2 text-5xl font-black text-white/[0.03] group-hover:text-cyan-500/10 transition">{s.n}</div>
                <div className="relative bg-white/[0.02] border border-white/5 rounded-xl p-6 hover:border-cyan-500/20 transition-all hover:bg-white/[0.04]">
                  <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Categories Grid */}
      <section className="py-24 px-6 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">AI Agent Categories</h2>
          <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">Enterprise-grade AI across every business function.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {aiCategories.map((c: CategoryStat) => (
              <button key={c.category} onClick={() => { setSelCat(c.category); setView('catalog'); }}
                className="group text-left bg-white/[0.02] border border-white/5 rounded-xl p-6 hover:border-cyan-500/30 hover:bg-white/[0.04] transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{catIcons[c.category] || '🤖'}</span>
                  <span className="font-semibold group-hover:text-cyan-400 transition">{c.category}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{c.cnt} products</span><span>{formatPrice(c.min_price)} – {formatPrice(c.max_price)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* State machine */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">The Only Platform That Executes</h2>
          <p className="text-xl text-gray-400 mb-16 max-w-3xl mx-auto">Other sites showcase. We compile canonical contracts and deploy through a 9-state machine.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['requested','interpreted','compiled','validated','approved','staged','live','paused','retired'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <span className={`px-4 py-2 rounded-lg text-sm font-mono font-medium ${i < 7 ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>{s}</span>
                {i < 8 && <span className="text-gray-600">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Augment?</h2>
          <p className="text-xl text-gray-400 mb-10">From a $9/month personal scaffold to $175K enterprise deployments.</p>
          <button onClick={onConfigure} className="px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
            Configure Your First Agent <Icons.Arrow />
          </button>
        </div>
      </section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  CATALOG VIEW                                          */
/* ═══════════════════════════════════════════════════════ */
function CatalogView({ products, categories, loading, search, setSearch, selCat, setSelCat, selTier, setSelTier, fetchCatalog, addToCart, cart, selectedProduct, setSelectedProduct }: any) {
  const doSearch = () => fetchCatalog(selCat, selTier, search);
  if (selectedProduct) return <ProductDetail product={selectedProduct} onBack={() => setSelectedProduct(null)} addToCart={addToCart} inCart={cart.some((c: CartItem) => c.product.id === selectedProduct.id)} />;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"><Icons.Search /></div>
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter' && doSearch()} placeholder="Search agents, categories, capabilities..." className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50" />
        </div>
        <button onClick={doSearch} className="px-6 py-3 bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition font-medium">Search</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setSelCat(null)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${!selCat ? 'bg-cyan-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>All</button>
        {(categories as CategoryStat[]).filter(c => c.cnt > 1).map(c => (
          <button key={c.category} onClick={() => setSelCat(c.category === selCat ? null : c.category)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${selCat === c.category ? 'bg-cyan-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
            {catIcons[c.category] || '🤖'} {c.category} ({c.cnt})
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-8">
        {['Core','Premium','Enterprise'].map(t => (
          <button key={t} onClick={() => setSelTier(t === selTier ? null : t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${selTier === t ? 'bg-cyan-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{t}</button>
        ))}
      </div>
      {loading ? <div className="text-center py-20 text-gray-500">Loading catalog...</div> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(products as Product[]).map(p => (
            <div key={p.id} className="group bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:border-cyan-500/20 hover:bg-white/[0.04] transition-all cursor-pointer" onClick={() => setSelectedProduct(p)}>
              <div className="flex items-start justify-between mb-4">
                <span className="text-2xl">{catIcons[p.category] || '🤖'}</span>
                {p.tier && <span className={`px-3 py-1 rounded-full text-xs font-medium ${tierColors[p.tier] || 'bg-gray-100 text-gray-700'}`}>{p.tier}</span>}
              </div>
              <h3 className="font-semibold text-lg mb-2 group-hover:text-cyan-400 transition">{p.name}</h3>
              <p className="text-sm text-gray-400 mb-4 line-clamp-2">{p.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-cyan-400">{formatPrice(p.base_price)}</span>
                <span className="text-xs text-gray-500">{p.category}</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); addToCart(p); }} className="mt-4 w-full py-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl text-sm font-medium hover:bg-cyan-500/20 transition">+ Add to Contract</button>
            </div>
          ))}
        </div>
      )}
      {!loading && products.length === 0 && <div className="text-center py-20 text-gray-500">No products found.</div>}
    </div>
  );
}

function ProductDetail({ product, onBack, addToCart, inCart }: { product: Product; onBack: ()=>void; addToCart: (p: Product)=>void; inCart: boolean }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <button onClick={onBack} className="text-gray-400 hover:text-white mb-8 flex items-center gap-2">← Back to catalog</button>
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-10">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{catIcons[product.category] || '🤖'}</span>
            <div>
              <h1 className="text-3xl font-bold">{product.name}</h1>
              <div className="flex gap-3 mt-2"><span className="text-sm text-gray-400">{product.category}</span>{product.tier && <span className={`px-3 py-0.5 rounded-full text-xs font-medium ${tierColors[product.tier] || ''}`}>{product.tier}</span>}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-cyan-400">{formatPrice(product.base_price)}</div>
            {product.engagement_model && <div className="text-sm text-gray-500 mt-1">{product.engagement_model}</div>}
          </div>
        </div>
        <p className="text-gray-300 text-lg leading-relaxed mb-8">{product.description}</p>
        {product.customer_outcome && <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-6 mb-8"><h3 className="font-semibold text-cyan-400 mb-2">Expected Outcome</h3><p className="text-gray-300">{product.customer_outcome}</p></div>}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {product.target_audience && <div><span className="text-sm text-gray-500 block mb-1">Target Audience</span><span className="text-gray-300">{product.target_audience}</span></div>}
          {product.delivery_method && <div><span className="text-sm text-gray-500 block mb-1">Delivery</span><span className="text-gray-300">{product.delivery_method}</span></div>}
        </div>
        <button onClick={() => addToCart(product)} className={`w-full py-4 rounded-xl font-semibold text-lg transition ${inCart ? 'bg-green-500/20 text-green-400' : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/25'}`}>
          {inCart ? '✓ In Contract' : '+ Add to Contract'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  CART VIEW                                             */
/* ═══════════════════════════════════════════════════════ */
function CartView({ cart, removeFromCart, cartTotal, onCheckout }: any) {
  if (cart.length === 0) return (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center"><Icons.Cart /><h2 className="text-2xl font-bold mt-4 mb-2">Your contract is empty</h2><p className="text-gray-400">Browse the catalog and add AI agents to build your contract.</p></div>
  );
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h2 className="text-2xl font-bold mb-8">Contract Builder</h2>
      <div className="space-y-4 mb-8">
        {(cart as CartItem[]).map(c => (
          <div key={c.product.id} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-5">
            <div className="flex items-center gap-4"><span className="text-2xl">{catIcons[c.product.category] || '🤖'}</span><div><h3 className="font-semibold">{c.product.name}</h3><span className="text-sm text-gray-500">{c.product.category} {c.product.tier && `· ${c.product.tier}`}</span></div></div>
            <div className="flex items-center gap-6"><span className="text-cyan-400 font-bold">{formatPrice(c.product.base_price)}</span><button onClick={() => removeFromCart(c.product.id)} className="text-gray-500 hover:text-red-400 transition"><Icons.X /></button></div>
          </div>
        ))}
      </div>
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 flex items-center justify-between">
        <div><span className="text-gray-400">Contract Total</span><div className="text-3xl font-bold text-cyan-400">{formatPrice(cartTotal)}</div></div>
        <button onClick={onCheckout} className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all">Configure Agent <Icons.Arrow /></button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  COMPILER VIEW — 9-step Intent-to-Agent Compiler       */
/* ═══════════════════════════════════════════════════════ */
function CompilerView({ cart, cartTotal, wizardStep, setWizardStep, form, setForm, submitting, submitOrder, onBrowse }: {
  cart: CartItem[]; cartTotal: number; wizardStep: number; setWizardStep: (n:number)=>void;
  form: AgentFormState; setForm: (f: AgentFormState)=>void; submitting: boolean; submitOrder: ()=>void; onBrowse: ()=>void;
}) {
  const u = (patch: Partial<AgentFormState>) => setForm({...form, ...patch});
  const toggleArr = (arr: string[], val: string) => arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  const steps = ['Start', 'Job', 'Channels', 'Tasks', 'Profile', 'Inputs', 'Controls', 'Review', 'Submit'];
  const canSubmit = form.contact_email && form.business_name && form.channels.length > 0 && form.tasks.length > 0;

  const Pill = ({ active, label, onClick }: {active: boolean; label: string; onClick: ()=>void}) => (
    <button onClick={onClick} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition border ${active ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/10 hover:bg-white/[0.04]'}`}>{label}</button>
  );
  const Toggle = ({ active, label, desc, onClick }: {active: boolean; label: string; desc?: string; onClick: ()=>void}) => (
    <button onClick={onClick} className={`w-full text-left p-4 rounded-xl border transition ${active ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-white/5 bg-white/[0.02] hover:border-white/10'}`}>
      <div className="flex items-center justify-between"><span className="font-medium">{label}</span><div className={`w-10 h-6 rounded-full transition flex items-center ${active ? 'bg-cyan-500 justify-end' : 'bg-gray-700 justify-start'}`}><div className="w-4 h-4 bg-white rounded-full mx-1" /></div></div>
      {desc && <p className="text-sm text-gray-500 mt-1">{desc}</p>}
    </button>
  );
  const Input = ({ label, value, onChange, placeholder, type }: {label: string; value: string; onChange: (v:string)=>void; placeholder?: string; type?: string}) => (
    <div><label className="text-sm text-gray-400 mb-2 block">{label}</label><input type={type||'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50" /></div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-2xl font-bold">Intent-to-Agent Compiler</h2>
        {cart.length > 0 && <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-medium">{cart.length} product{cart.length>1?'s':''} selected</span>}
      </div>
      <p className="text-gray-500 text-sm mb-8">Configure your agent contract in {steps.length} steps. Every request compiles into the same canonical contract.</p>

      {/* Step indicator */}
      <div className="flex gap-1 mb-10 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <button key={s} onClick={() => setWizardStep(i)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap ${
            i === wizardStep ? 'bg-cyan-500 text-white' : i < wizardStep ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-500'
          }`}>
            {i < wizardStep ? <Icons.Check /> : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">{i+1}</span>}
            {s}
          </button>
        ))}
      </div>

      {/* ── Step 0: Start Mode ─────────────────────── */}
      {wizardStep === 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">How would you like to start?</h3>
          {[
            { id: 'catalogue' as const, label: 'Pick a Common Agent', desc: 'Choose from our catalog of pre-configured agents', icon: '📋' },
            { id: 'describe_need' as const, label: 'Describe What You Need', desc: 'Write a sentence and we\'ll compile the agent', icon: '✍️' },
            { id: 'paste_instructions' as const, label: 'Paste Instructions', desc: 'Paste SOPs, scripts, strategies, or email threads', icon: '📄' },
            { id: 'upload_material' as const, label: 'Upload Material', desc: 'Upload docs, pricing guides, FAQs, or CRM exports', icon: '📁' },
            { id: 'advanced_configuration' as const, label: 'Advanced Configuration', desc: 'Full manual control over every contract field', icon: '⚙️' },
          ].map(m => (
            <button key={m.id} onClick={() => u({start_mode: m.id})} className={`w-full text-left p-5 rounded-xl border transition ${form.start_mode === m.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/5 bg-white/[0.02] hover:border-white/10'}`}>
              <div className="flex items-center gap-4">
                <span className="text-2xl">{m.icon}</span>
                <div><h4 className="font-semibold">{m.label}</h4><p className="text-sm text-gray-400">{m.desc}</p></div>
              </div>
            </button>
          ))}
          {(form.start_mode === 'describe_need' || form.start_mode === 'paste_instructions') && (
            <div className="mt-4">
              <label className="text-sm text-gray-400 mb-2 block">{form.start_mode === 'describe_need' ? 'Describe what you need in plain English' : 'Paste your instructions, SOPs, or material'}</label>
              <textarea value={form.free_text} onChange={e => u({free_text: e.target.value})} rows={5} placeholder={form.start_mode === 'describe_need' ? 'e.g. "I need an agent that generates leads on LinkedIn for government buyers in Australia"' : 'Paste your content here...'} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50" />
            </div>
          )}
          {form.start_mode === 'catalogue' && cart.length === 0 && (
            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-sm">
              No products selected yet. <button onClick={onBrowse} className="underline font-medium">Browse the catalog</button> to add agents to your contract.
            </div>
          )}
          <button onClick={() => setWizardStep(1)} className="mt-6 px-8 py-3 bg-cyan-500 rounded-xl font-medium hover:bg-cyan-600 transition">Next: Job Definition <Icons.Arrow /></button>
        </div>
      )}

      {/* ── Step 1: Job Definition ─────────────────── */}
      {wizardStep === 1 && (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold mb-2">Basic Job Definition</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <Input label="Business Name *" value={form.business_name} onChange={v => u({business_name: v})} placeholder="e.g. Tech 4 Humanity" />
            <Input label="Contact Email *" value={form.contact_email} onChange={v => u({contact_email: v})} placeholder="you@company.com" type="email" />
            <Input label="Contact Name" value={form.contact_name} onChange={v => u({contact_name: v})} placeholder="Your name" />
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Urgency</label>
              <div className="flex gap-2">
                {URGENCIES.map(ur => <Pill key={ur.id} active={form.urgency===ur.id} label={ur.label} onClick={() => u({urgency: ur.id})} />)}
              </div>
            </div>
          </div>
          <Input label="Agent Goal *" value={form.agent_goal} onChange={v => u({agent_goal: v})} placeholder="e.g. Generate qualified discovery meetings from named ICP accounts" />
          <Input label="Desired Outcome" value={form.desired_outcome} onChange={v => u({desired_outcome: v})} placeholder="e.g. 5+ qualified meetings per month, pipeline value created" />
          <div className="grid md:grid-cols-3 gap-5">
            <Input label="Operating Region" value={form.operating_region} onChange={v => u({operating_region: v})} placeholder="Australia" />
            <Input label="Language" value={form.language} onChange={v => u({language: v})} placeholder="English" />
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Timezone</label>
              <select value={form.timezone} onChange={e => u({timezone: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50">
                <option value="Australia/Sydney">Australia/Sydney</option>
                <option value="Australia/Melbourne">Australia/Melbourne</option>
                <option value="Australia/Perth">Australia/Perth</option>
                <option value="Asia/Singapore">Asia/Singapore</option>
                <option value="America/New_York">US Eastern</option>
                <option value="Europe/London">UK/London</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4 mt-6">
            <button onClick={() => setWizardStep(0)} className="px-6 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition">Back</button>
            <button onClick={() => setWizardStep(2)} disabled={!form.business_name || !form.contact_email} className="px-8 py-3 bg-cyan-500 rounded-xl font-medium hover:bg-cyan-600 transition disabled:opacity-30">Next: Channels <Icons.Arrow /></button>
          </div>
        </div>
      )}

      {/* ── Step 2: Channels ───────────────────────── */}
      {wizardStep === 2 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Select Channels</h3>
          <p className="text-sm text-gray-500 mb-6">Which channels should this agent operate on?</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {ALL_CHANNELS.map(ch => (
              <button key={ch.id} onClick={() => u({channels: toggleArr(form.channels, ch.id)})} className={`flex items-center gap-3 p-4 rounded-xl border transition ${form.channels.includes(ch.id) ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400' : 'border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/10'}`}>
                <span className="text-xl">{ch.icon}</span><span className="font-medium">{ch.label}</span>
                {form.channels.includes(ch.id) && <Icons.Check />}
              </button>
            ))}
          </div>
          <div className="flex gap-4 mt-8">
            <button onClick={() => setWizardStep(1)} className="px-6 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition">Back</button>
            <button onClick={() => setWizardStep(3)} disabled={form.channels.length===0} className="px-8 py-3 bg-cyan-500 rounded-xl font-medium hover:bg-cyan-600 transition disabled:opacity-30">Next: Tasks <Icons.Arrow /></button>
          </div>
        </div>
      )}

      {/* ── Step 3: Tasks ──────────────────────────── */}
      {wizardStep === 3 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Select Tasks</h3>
          <p className="text-sm text-gray-500 mb-6">What should this agent do?</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {ALL_TASKS.map(t => (
              <button key={t.id} onClick={() => u({tasks: toggleArr(form.tasks, t.id)})} className={`text-left p-4 rounded-xl border transition ${form.tasks.includes(t.id) ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-white/5 bg-white/[0.02] hover:border-white/10'}`}>
                <div className="flex items-center justify-between"><span className={`font-medium ${form.tasks.includes(t.id) ? 'text-cyan-400' : 'text-gray-300'}`}>{t.label}</span>{form.tasks.includes(t.id) && <Icons.Check />}</div>
                <p className="text-xs text-gray-500 mt-1">{t.desc}</p>
              </button>
            ))}
          </div>
          <div className="flex gap-4 mt-8">
            <button onClick={() => setWizardStep(2)} className="px-6 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition">Back</button>
            <button onClick={() => setWizardStep(4)} disabled={form.tasks.length===0} className="px-8 py-3 bg-cyan-500 rounded-xl font-medium hover:bg-cyan-600 transition disabled:opacity-30">Next: Profile <Icons.Arrow /></button>
          </div>
        </div>
      )}

      {/* ── Step 4: Operating Profile ──────────────── */}
      {wizardStep === 4 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold mb-2">Operating Profile</h3>
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Direction</label>
            <div className="flex gap-2">
              {['inbound','outbound','mixed'].map(d => <Pill key={d} active={form.direction===d} label={d.charAt(0).toUpperCase()+d.slice(1)} onClick={() => u({direction: d})} />)}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Behaviour (select multiple)</label>
            <div className="flex flex-wrap gap-2">
              {BEHAVIOURS.map(b => <Pill key={b} active={form.behaviour.includes(b)} label={b.replace('_',' ')} onClick={() => u({behaviour: toggleArr(form.behaviour, b)})} />)}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Human Control</label>
            <div className="space-y-2">
              {HUMAN_CONTROLS.map(hc => (
                <button key={hc.id} onClick={() => u({human_control: hc.id})} className={`w-full text-left p-4 rounded-xl border transition ${form.human_control===hc.id ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-white/5 bg-white/[0.02] hover:border-white/10'}`}>
                  <span className={`font-medium ${form.human_control===hc.id ? 'text-cyan-400' : ''}`}>{hc.label}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{hc.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <div><label className="text-sm text-gray-400 mb-2 block">Hours Start</label><input type="time" value={form.working_hours_start} onChange={e=>u({working_hours_start:e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50" /></div>
            <div><label className="text-sm text-gray-400 mb-2 block">Hours End</label><input type="time" value={form.working_hours_end} onChange={e=>u({working_hours_end:e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50" /></div>
            <div><label className="text-sm text-gray-400 mb-2 block">Tone</label><select value={form.tone_preset} onChange={e=>u({tone_preset:e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50">{TONES.map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}</select></div>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <div><label className="text-sm text-gray-400 mb-2 block">Daily Volume Cap</label><input type="number" value={form.daily_volume_cap} onChange={e=>u({daily_volume_cap:+e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50" /></div>
            <div><label className="text-sm text-gray-400 mb-2 block">Follow-up Cap</label><input type="number" value={form.followup_cap} onChange={e=>u({followup_cap:+e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50" /></div>
            <div><label className="text-sm text-gray-400 mb-2 block">Confidence Floor</label><input type="number" step="0.05" min="0" max="1" value={form.confidence_floor} onChange={e=>u({confidence_floor:+e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50" /></div>
          </div>
          <div className="flex gap-4 mt-4">
            <button onClick={() => setWizardStep(3)} className="px-6 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition">Back</button>
            <button onClick={() => setWizardStep(5)} className="px-8 py-3 bg-cyan-500 rounded-xl font-medium hover:bg-cyan-600 transition">Next: Inputs <Icons.Arrow /></button>
          </div>
        </div>
      )}

      {/* ── Step 5: Inputs ─────────────────────────── */}
      {wizardStep === 5 && (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold mb-2">Available Inputs</h3>
          <p className="text-sm text-gray-500 mb-4">What data sources and materials can the agent access?</p>
          <Input label="Website URLs (comma-separated)" value={form.inputs_website} onChange={v=>u({inputs_website:v})} placeholder="https://yoursite.com" />
          <Input label="Document References" value={form.inputs_docs} onChange={v=>u({inputs_docs:v})} placeholder="messaging_pack_v1, offer_library_v1" />
          <Input label="FAQ References" value={form.inputs_faqs} onChange={v=>u({inputs_faqs:v})} placeholder="faq_doc_v1" />
          <Input label="Call Scripts / Templates" value={form.inputs_scripts} onChange={v=>u({inputs_scripts:v})} placeholder="sales_script_v1" />
          <Input label="Pricing Tables" value={form.inputs_pricing} onChange={v=>u({inputs_pricing:v})} placeholder="pricing_table_v1" />
          <Input label="Policies" value={form.inputs_policies} onChange={v=>u({inputs_policies:v})} placeholder="brand_guardrails_v1" />
          <div>
            <label className="text-sm text-gray-400 mb-3 block">Connections</label>
            <div className="grid sm:grid-cols-2 gap-3">
              <Toggle active={form.inputs_crm} label="CRM Connection" onClick={()=>u({inputs_crm:!form.inputs_crm})} />
              <Toggle active={form.inputs_inbox} label="Email Inbox" onClick={()=>u({inputs_inbox:!form.inputs_inbox})} />
              <Toggle active={form.inputs_calendar} label="Calendar" onClick={()=>u({inputs_calendar:!form.inputs_calendar})} />
              <Toggle active={form.inputs_supportdesk} label="Support Desk" onClick={()=>u({inputs_supportdesk:!form.inputs_supportdesk})} />
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <button onClick={() => setWizardStep(4)} className="px-6 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition">Back</button>
            <button onClick={() => setWizardStep(6)} className="px-8 py-3 bg-cyan-500 rounded-xl font-medium hover:bg-cyan-600 transition">Next: Controls <Icons.Arrow /></button>
          </div>
        </div>
      )}

      {/* ── Step 6: Controls ───────────────────────── */}
      {wizardStep === 6 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-2">Controls & Approvals</h3>
          <p className="text-sm text-gray-500 mb-4">Set guardrails and approval requirements.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Toggle active={form.approval_for_send} label="Approve Before Sending" desc="Review all outbound messages" onClick={()=>u({approval_for_send:!form.approval_for_send})} />
            <Toggle active={form.approval_for_proposals} label="Approve Proposals" desc="Review before sending proposals" onClick={()=>u({approval_for_proposals:!form.approval_for_proposals})} />
            <Toggle active={form.approval_over_discount} label="Approve Discounts" desc={`Over ${form.discount_threshold}% threshold`} onClick={()=>u({approval_over_discount:!form.approval_over_discount})} />
            <Toggle active={form.approval_for_strategic} label="Strategic Account Review" desc="Flag high-value accounts" onClick={()=>u({approval_for_strategic:!form.approval_for_strategic})} />
            <Toggle active={form.brand_risk_pause} label="Brand Risk Auto-Pause" desc="Pause on brand-risk keywords" onClick={()=>u({brand_risk_pause:!form.brand_risk_pause})} />
            <Toggle active={form.complaint_pause} label="Complaint Auto-Pause" desc="Pause on complaint spikes" onClick={()=>u({complaint_pause:!form.complaint_pause})} />
            <Toggle active={form.abuse_escalate} label="Abuse Auto-Escalate" desc="Escalate abusive interactions" onClick={()=>u({abuse_escalate:!form.abuse_escalate})} />
            <Toggle active={form.emergency_escalation} label="Emergency Escalation" desc="Required for safety-critical" onClick={()=>u({emergency_escalation:!form.emergency_escalation})} />
            <Toggle active={form.compliance_escalation} label="Compliance Escalation" desc="Route regulatory queries" onClick={()=>u({compliance_escalation:!form.compliance_escalation})} />
          </div>
          {form.approval_over_discount && (
            <div className="mt-2"><label className="text-sm text-gray-400 mb-2 block">Discount Threshold %</label>
              <input type="number" value={form.discount_threshold} onChange={e=>u({discount_threshold:+e.target.value})} min={0} max={100} className="w-32 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50" />
            </div>
          )}
          <div className="flex gap-4 mt-6">
            <button onClick={() => setWizardStep(5)} className="px-6 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition">Back</button>
            <button onClick={() => setWizardStep(7)} className="px-8 py-3 bg-cyan-500 rounded-xl font-medium hover:bg-cyan-600 transition">Next: Review <Icons.Arrow /></button>
          </div>
        </div>
      )}

      {/* ── Step 7: Review ─────────────────────────── */}
      {wizardStep === 7 && (
        <div>
          <h3 className="text-lg font-semibold mb-6">Contract Preview</h3>
          <div className="space-y-6">
            {/* What the agent WILL do */}
            <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-6">
              <h4 className="font-semibold text-cyan-400 mb-3">What this agent will do</h4>
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-500">Goal:</span> <span>{form.agent_goal || 'Deploy selected products'}</span></div>
                <div><span className="text-gray-500">Outcome:</span> <span>{form.desired_outcome || '—'}</span></div>
                <div><span className="text-gray-500">Channels:</span> <span>{form.channels.join(', ') || '—'}</span></div>
                <div><span className="text-gray-500">Tasks:</span> <span>{form.tasks.join(', ') || '—'}</span></div>
                <div><span className="text-gray-500">Direction:</span> <span>{form.direction}</span></div>
                <div><span className="text-gray-500">Behaviour:</span> <span>{form.behaviour.join(', ')}</span></div>
              </div>
            </div>
            {/* Guardrails */}
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-6">
              <h4 className="font-semibold text-amber-400 mb-3">Guardrails & Controls</h4>
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-500">Human control:</span> <span>{form.human_control.replace(/_/g,' ')}</span></div>
                <div><span className="text-gray-500">Volume cap:</span> <span>{form.daily_volume_cap}/day, {form.followup_cap} follow-ups</span></div>
                <div><span className="text-gray-500">Confidence floor:</span> <span>{(form.confidence_floor*100).toFixed(0)}%</span></div>
                <div><span className="text-gray-500">Hours:</span> <span>{form.working_hours_start}–{form.working_hours_end} {form.timezone}</span></div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.approval_for_send && <span className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded text-xs">Send approval</span>}
                  {form.approval_for_proposals && <span className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded text-xs">Proposal approval</span>}
                  {form.brand_risk_pause && <span className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded text-xs">Brand-risk pause</span>}
                  {form.complaint_pause && <span className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded text-xs">Complaint pause</span>}
                  {form.approval_for_strategic && <span className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded text-xs">Strategic review</span>}
                  {form.approval_over_discount && <span className="px-2 py-1 bg-amber-500/10 text-amber-400 rounded text-xs">Discount {'>'}  {form.discount_threshold}%</span>}
                </div>
              </div>
            </div>
            {/* Products */}
            {cart.length > 0 && (
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
                <h4 className="font-semibold mb-3">Products in Contract</h4>
                <div className="space-y-2 text-sm">
                  {(cart as CartItem[]).map(c => (
                    <div key={c.product.id} className="flex justify-between"><span className="text-gray-400">{c.product.name}</span><span className="text-cyan-400">{formatPrice(c.product.base_price)}</span></div>
                  ))}
                  <hr className="border-white/5 my-2" />
                  <div className="flex justify-between font-bold"><span>Total</span><span className="text-cyan-400">{formatPrice(cartTotal)}</span></div>
                </div>
              </div>
            )}
            {/* Identity */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
              <h4 className="font-semibold mb-3">Contract Identity</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Business</span><span>{form.business_name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Contact</span><span>{form.contact_email}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Region</span><span>{form.operating_region}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Start mode</span><span>{form.start_mode.replace(/_/g,' ')}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Urgency</span><span className="capitalize">{form.urgency}</span></div>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-8">
            <button onClick={() => setWizardStep(6)} className="px-6 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition">Back</button>
            <button onClick={() => setWizardStep(8)} className="px-8 py-3 bg-cyan-500 rounded-xl font-medium hover:bg-cyan-600 transition">Next: Submit <Icons.Arrow /></button>
          </div>
        </div>
      )}

      {/* ── Step 8: SLA & Submit ────────────────────── */}
      {wizardStep === 8 && (
        <div>
          <h3 className="text-lg font-semibold mb-6">Select SLA & Submit</h3>
          <div className="space-y-3 mb-8">
            {[
              { id: 'standard', name: 'Standard', desc: 'Business hours support, 24h response SLA', price: 'Included' },
              { id: 'premium', name: 'Premium', desc: '12/7 support, 4h response SLA, dedicated buddy', price: '+15%' },
              { id: 'enterprise', name: 'Enterprise', desc: '24/7 support, 1h response SLA, priority deployment', price: '+25%' },
            ].map(s => (
              <button key={s.id} onClick={() => u({sla: s.id})} className={`w-full text-left p-5 rounded-xl border transition ${form.sla === s.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/5 bg-white/[0.02] hover:border-white/10'}`}>
                <div className="flex justify-between items-start"><div><h4 className="font-semibold">{s.name}</h4><p className="text-sm text-gray-400 mt-1">{s.desc}</p></div><span className="text-cyan-400 font-medium">{s.price}</span></div>
              </button>
            ))}
          </div>
          {!canSubmit && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6">
              Missing required fields: {!form.business_name && 'Business Name, '}{!form.contact_email && 'Email, '}{form.channels.length===0 && 'Channels, '}{form.tasks.length===0 && 'Tasks'}
            </div>
          )}
          <div className="flex gap-4">
            <button onClick={() => setWizardStep(7)} className="px-6 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition">Back</button>
            <button onClick={submitOrder} disabled={submitting || !canSubmit} className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-50">
              {submitting ? 'Compiling Contract...' : 'Compile & Submit Contract'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  DASHBOARD VIEW                                        */
/* ═══════════════════════════════════════════════════════ */
function DashboardView({ orderResult, cart, form, cartTotal }: any) {
  const contract = orderResult?.canonical_contract;
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6"><Icons.Check /></div>
        <h1 className="text-3xl font-bold mb-3">Contract Compiled & Submitted</h1>
        <p className="text-gray-400 text-lg">Your canonical agent contract is now in the 9-state pipeline.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 text-center"><span className="text-sm text-gray-500">Order</span><div className="text-lg font-mono text-cyan-400 mt-1">{orderResult?.order_id?.slice(0,8) || '—'}</div></div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 text-center"><span className="text-sm text-gray-500">Contract</span><div className="text-lg font-mono text-cyan-400 mt-1">{orderResult?.contract_id?.slice(0,8) || '—'}</div></div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 text-center"><span className="text-sm text-gray-500">Status</span><div className="text-lg font-mono text-yellow-400 mt-1">requested</div></div>
      </div>

      {/* Contract summary */}
      {contract && (
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 mb-8">
          <h3 className="font-semibold mb-4">Canonical Contract Summary</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Agent Type:</span> <span>{contract.identity?.agent_type}</span></div>
            <div><span className="text-gray-500">Environment:</span> <span className="font-mono text-cyan-400">{contract.identity?.environment}</span></div>
            <div><span className="text-gray-500">Goal:</span> <span>{contract.objective?.primary_goal}</span></div>
            <div><span className="text-gray-500">Direction:</span> <span>{contract.operating_mode?.direction}</span></div>
            <div><span className="text-gray-500">Channels:</span> <span>{contract.channels?.join(', ')}</span></div>
            <div><span className="text-gray-500">Tasks:</span> <span>{contract.tasks?.join(', ')}</span></div>
            <div><span className="text-gray-500">Human Control:</span> <span>{contract.operating_mode?.human_control?.replace(/_/g,' ')}</span></div>
            <div><span className="text-gray-500">Volume:</span> <span>{contract.controls?.daily_volume_cap}/day</span></div>
          </div>
        </div>
      )}

      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 mb-8">
        <h3 className="font-semibold mb-4">Pipeline Status</h3>
        <div className="space-y-4">
          {[
            { state: 'interpreted', desc: 'System interprets requirements and maps to agent capabilities' },
            { state: 'compiled', desc: 'Agent contract compiled with SLA bindings and deployment specs' },
            { state: 'validated', desc: 'Automated validation: completeness, dependency, risk, commercial checks' },
            { state: 'approved', desc: 'Contract approved and enters deployment queue' },
            { state: 'staged', desc: 'Agent provisioned in staging environment' },
            { state: 'live', desc: 'Agent goes live — Buddy confirms and provides support' },
          ].map((s, i) => (
            <div key={s.state} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs text-gray-500 font-mono shrink-0">{i+1}</div>
              <div><span className="font-mono text-cyan-400 text-sm">{s.state}</span><p className="text-sm text-gray-400 mt-0.5">{s.desc}</p></div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-6 text-center">
        <Icons.Headphones />
        <h3 className="font-semibold mt-3 mb-2">Need Help?</h3>
        <p className="text-sm text-gray-400 mb-4">Your Buddy will reach out within 24 hours.</p>
        <a href="/buddy" className="inline-block px-6 py-3 bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition font-medium">Go to Buddy Portal</a>
      </div>
    </div>
  );
}
