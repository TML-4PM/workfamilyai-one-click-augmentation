import { v4 as uuidv4 } from 'uuid';
import { AgentContract, AgentTask, Channel, WizardState, Stage, ActionType } from './types';
import { getRequiredPacks } from './dependency-packs';
import { interpretFreeText } from './intent-interpreter';

export function compileContract(wizard: WizardState): AgentContract {
  const contractId = uuidv4();
  const now = new Date().toISOString();

  // If freetext, interpret it first
  let templateFamily = wizard.template || 'operations';
  let channels = wizard.channels;
  let packs = wizard.packs;
  let tasks: AgentTask[] = [];

  if (wizard.freeText && !wizard.template) {
    const interpreted = interpretFreeText(wizard.freeText);
    templateFamily = interpreted.template_family;
    if (channels.length === 0) channels = interpreted.suggested_channels;
    if (packs.length === 0) packs = interpreted.suggested_packs;
    tasks = interpreted.inferred_tasks.map((t, i) => ({
      task_id: uuidv4(),
      name: t,
      description: t,
      trigger: i === 0 ? 'on_schedule' : 'on_event',
      action_type: (['create', 'send', 'classify', 'score', 'update'] as ActionType[])[i % 5],
      channel: channels[i % channels.length] || 'email',
      stage: (['targeting', 'messaging', 'engagement', 'qualification', 'booking'] as Stage[])[i % 5],
      guardrails: ['max_actions_per_hour', 'human_approval_required'],
    }));
  } else {
    packs = packs.length > 0 ? packs : getRequiredPacks(templateFamily);
    tasks = generateTasksForTemplate(templateFamily, channels);
  }

  const contract: AgentContract = {
    contract_id: contractId,
    version: '1.0.0',
    created_at: now,
    updated_at: now,
    identity: {
      agent_name: `${templateFamily.replace('_', ' ')} Agent - ${wizard.companyName || 'New Business'}`,
      agent_type: templateFamily,
      template_family: templateFamily,
      description: wizard.goal || `Automated ${templateFamily.replace('_', ' ')} agent`,
      owner_business_id: uuidv4(),
      owner_customer_id: '',
    },
    objective: {
      primary_goal: wizard.goal || `Automate ${templateFamily.replace('_', ' ')} processes`,
      success_metrics: getDefaultMetrics(templateFamily),
      kpis: getDefaultKPIs(templateFamily),
    },
    operating_mode: {
      autonomy_level: 'supervised',
      escalation_threshold: 0.7,
      max_actions_per_hour: 50,
      operating_hours: { start: '09:00', end: '17:00', timezone: 'UTC' },
      batch_size: 10,
    },
    channels,
    tasks,
    inputs: [
      { name: 'customer_data', type: 'json', source: 'crm', required: true },
      { name: 'configuration', type: 'json', source: 'contract', required: true },
    ],
    outputs: [
      { name: 'action_log', type: 'event_stream', destination: 'log_store' },
      { name: 'results', type: 'json', destination: 'dashboard' },
    ],
    controls: {
      guardrails: wizard.controls?.guardrails || ['no_pii_exposure', 'max_daily_limit', 'human_review_required'],
      max_daily_actions: wizard.controls?.max_daily_actions || 200,
      require_human_approval: wizard.controls?.require_human_approval || ['send_proposal', 'book_meeting'],
      blocked_actions: wizard.controls?.blocked_actions || ['delete_data', 'modify_pricing_without_approval'],
      compliance_rules: ['gdpr_consent_required', 'opt_out_honored'],
      discount_ceiling_pct: wizard.controls?.discount_ceiling_pct || 15,
      escalation_rules: [
        { trigger: 'confidence_below_0.5', action: 'pause_and_escalate', notify: ['owner'] },
        { trigger: 'negative_sentiment', action: 'escalate_to_human', notify: ['owner'] },
        { trigger: 'legal_language_detected', action: 'stop_and_notify', notify: ['owner', 'compliance'] },
      ],
    },
    access_profile: {},
    secrets_profile: {
      email_sender_ref: 'vault://email_sender',
      crm_connection_ref: 'vault://crm_api',
      calendar_connection_ref: 'vault://calendar_api',
      model_profile_ref: 'vault://llm_api_key',
    },
    observability: {
      log_level: 'info',
      alert_channels: ['email', 'dashboard'],
      retention_days: 90,
      dashboards: ['agent_performance', 'usage_metrics'],
    },
    commercial_model: {
      plan_type: wizard.plan || 'starter',
      billing_cycle: 'monthly',
      base_price_cents: wizard.plan === 'enterprise' ? 49900 : wizard.plan === 'professional' ? 19900 : 4900,
      usage_rate_per_action_cents: 5,
      stripe_customer_id: '',
      stripe_subscription_id: '',
    },
    deployment: {
      environment: 'sandbox',
      state: 'requested',
      region: 'us-east-1',
      scaling: { min_instances: 1, max_instances: 3 },
    },
    acceptance_criteria: {
      test_scorecard_required: true,
      min_score: 75,
      red_team_required: false,
      hard_fail_conditions: [
        'logging_completeness_below_95',
        'margin_breach',
        'hallucination_rate_above_3pct',
        'human_rescue_above_40pct',
      ],
    },
    audit: {
      created_by: 'system',
      approved_by: null,
      state_history: [{ from: null, to: 'requested', timestamp: now, actor: 'customer', reason: 'New order' }],
      compliance_tags: ['soc2', 'gdpr'],
    },
    dependency_packs: packs,
    readiness_score: 0,
    readiness_level: 'needs_setup',
  };

  return contract;
}

function generateTasksForTemplate(family: string, channels: Channel[]): AgentTask[] {
  const taskDefs: Record<string, { name: string; stage: Stage; action: ActionType }[]> = {
    lead_gen: [
      { name: 'Identify target prospects', stage: 'targeting', action: 'classify' },
      { name: 'Enrich prospect data', stage: 'targeting', action: 'read' },
      { name: 'Send personalized outreach', stage: 'messaging', action: 'send' },
      { name: 'Track and classify responses', stage: 'engagement', action: 'classify' },
      { name: 'Qualify leads', stage: 'qualification', action: 'score' },
      { name: 'Book discovery calls', stage: 'booking', action: 'create' },
    ],
    customer_service: [
      { name: 'Monitor inbound queries', stage: 'engagement', action: 'read' },
      { name: 'Classify and route tickets', stage: 'qualification', action: 'classify' },
      { name: 'Auto-respond to FAQs', stage: 'messaging', action: 'send' },
      { name: 'Escalate complex issues', stage: 'other', action: 'escalate' },
      { name: 'Track resolution metrics', stage: 'other', action: 'score' },
    ],
    sales: [
      { name: 'Manage deal pipeline', stage: 'qualification', action: 'update' },
      { name: 'Generate proposals', stage: 'proposal', action: 'create' },
      { name: 'Send follow-ups', stage: 'negotiation', action: 'send' },
      { name: 'Track negotiations', stage: 'negotiation', action: 'read' },
      { name: 'Close and handoff', stage: 'close', action: 'update' },
    ],
    finance: [
      { name: 'Process invoices', stage: 'other', action: 'create' },
      { name: 'Track payments', stage: 'other', action: 'read' },
      { name: 'Send reminders', stage: 'messaging', action: 'send' },
      { name: 'Reconcile accounts', stage: 'other', action: 'update' },
    ],
    operations: [
      { name: 'Schedule tasks', stage: 'other', action: 'create' },
      { name: 'Monitor workflows', stage: 'other', action: 'read' },
      { name: 'Alert on exceptions', stage: 'other', action: 'escalate' },
      { name: 'Generate reports', stage: 'other', action: 'create' },
    ],
  };

  const defs = taskDefs[family] || taskDefs.operations;
  return defs.map((d, i) => ({
    task_id: uuidv4(),
    name: d.name,
    description: d.name,
    trigger: i === 0 ? 'on_schedule' : 'on_event',
    action_type: d.action,
    channel: channels[i % channels.length] || 'email',
    stage: d.stage,
    guardrails: ['rate_limit', 'human_review'],
  }));
}

function getDefaultMetrics(family: string): string[] {
  const m: Record<string, string[]> = {
    lead_gen: ['Qualified leads per week', 'Meeting booking rate', 'Response rate', 'Pipeline value'],
    customer_service: ['First response time', 'Resolution rate', 'CSAT score', 'Escalation rate'],
    sales: ['Proposal win rate', 'Average deal size', 'Pipeline velocity', 'Close rate'],
    finance: ['Invoice processing time', 'Payment collection rate', 'Reconciliation accuracy'],
    operations: ['Task completion rate', 'Process cycle time', 'Exception rate'],
  };
  return m[family] || ['Completion rate', 'Accuracy', 'Processing time'];
}

function getDefaultKPIs(family: string): Record<string, string> {
  const k: Record<string, Record<string, string>> = {
    lead_gen: { qualified_leads_weekly: '50', meeting_rate: '15%', response_rate: '25%' },
    customer_service: { first_response_mins: '5', resolution_rate: '90%', csat: '4.5' },
    sales: { win_rate: '30%', avg_deal_size: '5000', close_rate: '20%' },
    finance: { processing_days: '2', collection_rate: '95%', accuracy: '99.5%' },
    operations: { completion_rate: '95%', cycle_time_hours: '4', exception_rate: '5%' },
  };
  return k[family] || { completion: '95%', accuracy: '98%' };
}
