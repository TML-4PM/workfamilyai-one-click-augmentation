// ============================================================
// WorkFamilyAI – Supabase Bridge Client
// Routes all DB calls through Troy's Bridge API
// ============================================================

const BRIDGE_URL = 'https://m5oqj21chd.execute-api.ap-southeast-2.amazonaws.com/lambda/invoke';
const TARGET = 'troy-sql-executor';

interface BridgeResponse {
  success: boolean;
  rows?: any;
  count?: number;
  sql?: string;
  status?: string;
  message?: string;
}

export async function execSQL(sql: string): Promise<BridgeResponse> {
  const res = await fetch(BRIDGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: TARGET, sql }),
  });
  return res.json();
}

// ── Customer Operations ──────────────────────────────────────

export async function upsertCustomer(email: string, name: string, company: string) {
  return execSQL(`
    INSERT INTO wf_customers (email, name, company)
    VALUES ('${esc(email)}', '${esc(name)}', '${esc(company)}')
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, company = EXCLUDED.company, updated_at = now()
    RETURNING customer_id, email, name, company
  `);
}

export async function getCustomer(email: string) {
  return execSQL(`SELECT * FROM wf_customers WHERE email = '${esc(email)}' LIMIT 1`);
}

// ── Contract Operations ──────────────────────────────────────

export async function insertContract(customerId: string, contract: any) {
  const { identity, objective, operating_mode, channels, tasks, inputs, outputs, controls,
    access_profile, secrets_profile, observability, commercial_model, deployment,
    acceptance_criteria, audit, dependency_packs, readiness_score, readiness_level } = contract;

  return execSQL(`
    INSERT INTO wf_agent_contracts (
      customer_id, identity, objective, operating_mode, channels, tasks, inputs, outputs,
      controls, access_profile, secrets_profile, observability, commercial_model, deployment,
      acceptance_criteria, audit, dependency_packs, readiness_score, readiness_level, state
    ) VALUES (
      '${esc(customerId)}',
      '${jsonEsc(identity)}'::jsonb,
      '${jsonEsc(objective)}'::jsonb,
      '${jsonEsc(operating_mode)}'::jsonb,
      ARRAY[${(channels || []).map((c: string) => `'${esc(c)}'`).join(',')}]::text[],
      '${jsonEsc(tasks)}'::jsonb,
      '${jsonEsc(inputs)}'::jsonb,
      '${jsonEsc(outputs)}'::jsonb,
      '${jsonEsc(controls)}'::jsonb,
      '${jsonEsc(access_profile || {})}'::jsonb,
      '${jsonEsc(secrets_profile || {})}'::jsonb,
      '${jsonEsc(observability || {})}'::jsonb,
      '${jsonEsc(commercial_model || {})}'::jsonb,
      '${jsonEsc(deployment || {})}'::jsonb,
      '${jsonEsc(acceptance_criteria || {})}'::jsonb,
      '${jsonEsc(audit || {})}'::jsonb,
      ARRAY[${(dependency_packs || []).map((p: string) => `'${esc(p)}'`).join(',')}]::text[],
      ${readiness_score || 0},
      '${esc(readiness_level || 'needs_setup')}',
      '${esc(deployment?.state || 'requested')}'
    ) RETURNING contract_id
  `);
}

export async function getContract(contractId: string) {
  return execSQL(`SELECT * FROM wf_agent_contracts WHERE contract_id = '${esc(contractId)}'`);
}

export async function listContracts(customerId?: string) {
  const where = customerId ? `WHERE customer_id = '${esc(customerId)}'` : '';
  return execSQL(`SELECT * FROM wf_agent_contracts ${where} ORDER BY created_at DESC`);
}

export async function updateContractState(contractId: string, state: string) {
  return execSQL(`
    UPDATE wf_agent_contracts SET state = '${esc(state)}', updated_at = now()
    WHERE contract_id = '${esc(contractId)}'
    RETURNING contract_id, state
  `);
}

// ── Order Operations ─────────────────────────────────────────

export async function insertOrder(customerId: string, requestType: string, payload: any) {
  return execSQL(`
    INSERT INTO wf_agent_orders (customer_id, request_type, request_payload)
    VALUES ('${esc(customerId)}', '${esc(requestType)}', '${jsonEsc(payload)}'::jsonb)
    RETURNING order_id
  `);
}

export async function updateOrderStatus(orderId: string, status: string, contractId?: string) {
  const contractClause = contractId ? `, contract_id = '${esc(contractId)}'` : '';
  return execSQL(`
    UPDATE wf_agent_orders SET status = '${esc(status)}'${contractClause}
    WHERE order_id = '${esc(orderId)}'
    RETURNING order_id, status
  `);
}

// ── Instance Operations ──────────────────────────────────────

export async function insertInstance(contractId: string, customerId: string, env: string = 'sandbox') {
  return execSQL(`
    INSERT INTO wf_agent_instances (contract_id, customer_id, environment)
    VALUES ('${esc(contractId)}', '${esc(customerId)}', '${esc(env)}')
    RETURNING instance_id
  `);
}

export async function updateInstanceState(instanceId: string, state: string) {
  return execSQL(`
    UPDATE wf_agent_instances SET state = '${esc(state)}', updated_at = now()
    WHERE instance_id = '${esc(instanceId)}'
    RETURNING instance_id, state
  `);
}

// ── Audit Operations ─────────────────────────────────────────

export async function logAuditEvent(
  contractId: string, eventType: string, fromState: string | null,
  toState: string, actor: string, reason: string, metadata?: any
) {
  return execSQL(`
    INSERT INTO wf_audit_events (contract_id, event_type, from_state, to_state, actor, reason, metadata)
    VALUES ('${esc(contractId)}', '${esc(eventType)}', ${fromState ? `'${esc(fromState)}'` : 'NULL'},
      '${esc(toState)}', '${esc(actor)}', '${esc(reason)}', '${jsonEsc(metadata || {})}'::jsonb)
  `);
}

// ── Action Log Operations ────────────────────────────────────

export async function logAction(log: {
  contract_id: string; instance_id?: string; business_id?: string; customer_id?: string;
  stage: string; channel: string; action_type: string; outcome: string;
  confidence_score?: number; risk_score?: number; latency_ms?: number;
}) {
  return execSQL(`
    INSERT INTO wf_action_logs (contract_id, instance_id, business_id, customer_id, stage, channel, action_type, outcome, confidence_score, risk_score, latency_ms)
    VALUES ('${esc(log.contract_id)}', ${log.instance_id ? `'${esc(log.instance_id)}'` : 'NULL'},
      ${log.business_id ? `'${esc(log.business_id)}'` : 'NULL'},
      ${log.customer_id ? `'${esc(log.customer_id)}'` : 'NULL'},
      '${esc(log.stage)}', '${esc(log.channel)}', '${esc(log.action_type)}', '${esc(log.outcome)}',
      ${log.confidence_score ?? 0}, ${log.risk_score ?? 0}, ${log.latency_ms ?? 0})
  `);
}

// ── Buddy Assignment Operations ──────────────────────────────

export async function assignBuddy(
  customerId: string, agentCode: string, persona: string,
  pillar: string, role: string, business: string
) {
  return execSQL(`
    INSERT INTO wf_buddy_assignments (customer_id, agent_code, agent_persona, pillar, role, business)
    VALUES ('${esc(customerId)}', '${esc(agentCode)}', '${esc(persona)}', '${esc(pillar)}', '${esc(role)}', '${esc(business)}')
    RETURNING assignment_id
  `);
}

export async function listBuddyAssignments(customerId: string) {
  return execSQL(`SELECT * FROM wf_buddy_assignments WHERE customer_id = '${esc(customerId)}' AND status = 'active' ORDER BY assigned_at DESC`);
}

// ── Stats / Dashboard ────────────────────────────────────────

export async function getDashboardStats() {
  return execSQL(`
    SELECT
      (SELECT count(*) FROM wf_customers) as total_customers,
      (SELECT count(*) FROM wf_agent_contracts) as total_contracts,
      (SELECT count(*) FROM wf_agent_contracts WHERE state = 'live') as live_agents,
      (SELECT count(*) FROM wf_agent_orders) as total_orders,
      (SELECT count(*) FROM wf_action_logs) as total_actions,
      (SELECT count(*) FROM wf_buddy_assignments WHERE status = 'active') as active_buddies
  `);
}

// ── Helpers ──────────────────────────────────────────────────

function esc(s: string): string {
  if (!s) return '';
  return String(s).replace(/'/g, "''");
}

function jsonEsc(obj: any): string {
  return JSON.stringify(obj).replace(/'/g, "''");
}
