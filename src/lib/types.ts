// ============================================================
// WorkFamilyAI – Canonical Types
// ============================================================

export type AgentState = 'requested' | 'interpreted' | 'compiled' | 'validated' | 'approved' | 'staged' | 'live' | 'paused' | 'retired';

export type Channel = 'linkedin' | 'email' | 'phone' | 'crm' | 'webchat' | 'internal';

export type ActionType = 'create' | 'read' | 'update' | 'send' | 'classify' | 'score' | 'escalate' | 'pause' | 'resume';

export type Stage = 'targeting' | 'messaging' | 'engagement' | 'qualification' | 'booking' | 'proposal' | 'negotiation' | 'close' | 'other';

export type Outcome = 'success' | 'partial' | 'failed' | 'blocked';

export type ReadinessLevel = 'ready' | 'needs_setup' | 'blocked';

export type FailureCategory =
  | 'targeting_failure' | 'enrichment_failure' | 'messaging_failure'
  | 'classification_failure' | 'qualification_failure' | 'booking_failure'
  | 'proposal_failure' | 'pricing_failure' | 'compliance_failure'
  | 'logging_failure' | 'integration_failure' | 'dependency_failure'
  | 'human_dependency_failure';

export interface AgentContract {
  contract_id: string;
  version: string;
  created_at: string;
  updated_at: string;
  identity: {
    agent_name: string;
    agent_type: string;
    template_family: string;
    description: string;
    owner_business_id: string;
    owner_customer_id: string;
  };
  objective: {
    primary_goal: string;
    success_metrics: string[];
    kpis: Record<string, string>;
  };
  operating_mode: {
    autonomy_level: 'full' | 'supervised' | 'human_in_loop';
    escalation_threshold: number;
    max_actions_per_hour: number;
    operating_hours: { start: string; end: string; timezone: string };
    batch_size: number;
  };
  channels: Channel[];
  tasks: AgentTask[];
  inputs: AgentInput[];
  outputs: AgentOutput[];
  controls: AgentControls;
  access_profile: Record<string, string>;
  secrets_profile: Record<string, string>;
  observability: {
    log_level: 'debug' | 'info' | 'warn' | 'error';
    alert_channels: string[];
    retention_days: number;
    dashboards: string[];
  };
  commercial_model: {
    plan_type: 'starter' | 'professional' | 'enterprise';
    billing_cycle: 'monthly' | 'annual';
    base_price_cents: number;
    usage_rate_per_action_cents: number;
    stripe_customer_id: string;
    stripe_subscription_id: string;
  };
  deployment: {
    environment: 'sandbox' | 'staging' | 'production';
    state: AgentState;
    region: string;
    scaling: { min_instances: number; max_instances: number };
  };
  acceptance_criteria: {
    test_scorecard_required: boolean;
    min_score: number;
    red_team_required: boolean;
    hard_fail_conditions: string[];
  };
  audit: {
    created_by: string;
    approved_by: string | null;
    state_history: StateTransition[];
    compliance_tags: string[];
  };
  dependency_packs: string[];
  readiness_score: number;
  readiness_level: ReadinessLevel;
}

export interface AgentTask {
  task_id: string;
  name: string;
  description: string;
  trigger: string;
  action_type: ActionType;
  channel: Channel;
  stage: Stage;
  guardrails: string[];
}

export interface AgentInput {
  name: string;
  type: string;
  source: string;
  required: boolean;
}

export interface AgentOutput {
  name: string;
  type: string;
  destination: string;
}

export interface AgentControls {
  guardrails: string[];
  max_daily_actions: number;
  require_human_approval: string[];
  blocked_actions: string[];
  compliance_rules: string[];
  discount_ceiling_pct: number;
  escalation_rules: EscalationRule[];
}

export interface EscalationRule {
  trigger: string;
  action: string;
  notify: string[];
}

export interface StateTransition {
  from: AgentState | null;
  to: AgentState;
  timestamp: string;
  actor: string;
  reason: string;
}

export interface AgentActionLog {
  event_id: string;
  timestamp: string;
  contract_id: string;
  agent_instance_id: string;
  agent_version: string;
  business_id: string;
  customer_id: string;
  stage: Stage;
  channel: Channel;
  action_type: ActionType;
  input_ref: string | null;
  output_ref: string | null;
  confidence_score: number;
  risk_score: number;
  exception_code: string | null;
  token_cost: number;
  tool_cost: number;
  latency_ms: number;
  human_intervention: boolean;
  escalation_triggered: boolean;
  outcome: Outcome;
}

export interface QualifiedLeadHandoff {
  lead_id: string;
  source_channel: Channel;
  business_id: string;
  contact: {
    first_name: string;
    last_name: string;
    email: string | null;
    linkedin_url: string | null;
    title: string;
    company: string;
  };
  qualification: {
    icp_score: number;
    authority_level: 'low' | 'medium' | 'high' | 'unknown';
    pain_summary: string;
    timing_estimate: 'immediate' | '<3mo' | '3-6mo' | '6+mo' | 'unknown';
    budget_signal: 'strong' | 'weak' | 'none' | 'unknown';
    confidence_score: number;
  };
  conversation_summary: string;
  transcript_ref: string | null;
  next_recommended_action: 'book_call' | 'send_proposal' | 'follow_up' | 'disqualify';
  risk_flags: string[];
}

export interface DependencyPack {
  pack_id: string;
  name: string;
  description: string;
  required_integrations: string[];
  required_secrets: string[];
  status: 'connected' | 'pending' | 'missing';
}

export interface Customer {
  customer_id: string;
  email: string;
  name: string;
  company: string;
  stripe_customer_id: string;
  created_at: string;
}

export interface AgentOrder {
  order_id: string;
  customer_id: string;
  request_type: 'template' | 'wizard' | 'freetext' | 'upload';
  request_payload: any;
  contract_id: string | null;
  status: 'pending' | 'compiled' | 'validated' | 'deployed' | 'failed';
  created_at: string;
}

export interface AgentInstance {
  instance_id: string;
  contract_id: string;
  customer_id: string;
  state: AgentState;
  environment: string;
  created_at: string;
  updated_at: string;
}

export interface TestScorecard {
  contract_id: string;
  operational: { logging_completeness: number; failure_rate: number; retry_stability: number; dependency_resolution_time: number; human_rescue_rate: number; };
  quality: { icp_precision: number; classification_accuracy: number; proposal_accuracy: number; objection_relevance: number; hallucination_incidents: number; };
  commercial: { qualified_meeting_rate: number; close_rate: number; cost_per_qualified_result: number; margin_integrity: number; cycle_time_performance: number; };
  total_score: number;
  pass_level: 'fail' | 'conditional' | 'pass' | 'strong_pass';
  hard_fail_triggers: string[];
}

export interface WizardState {
  step: number;
  goal: string;
  template: string | null;
  agentType: string;
  channels: Channel[];
  packs: string[];
  controls: Partial<AgentControls>;
  freeText: string;
  uploadData: any;
  customerEmail: string;
  customerName: string;
  companyName: string;
  plan: 'starter' | 'professional' | 'enterprise';
}

export interface StarterPack {
  id: string;
  name: string;
  description: string;
  templates: string[];
  default_packs: string[];
  default_channels: Channel[];
  price_cents: number;
}
