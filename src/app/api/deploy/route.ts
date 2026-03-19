import { NextRequest, NextResponse } from 'next/server';

const BRIDGE_URL = 'https://m5oqj21chd.execute-api.ap-southeast-2.amazonaws.com/lambda/invoke';
const BRIDGE_KEY = process.env.BRIDGE_API_KEY ?? 'bk_tOH8P5WD3mxBKfICa4yI56vJhpuYOynfdf1d_GfvdK4';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

async function query(sql: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ query: sql }),
    cache: 'no-store',
  });
  const d = await r.json();
  return d.rows ?? [];
}

async function bridge(sql: string) {
  const r = await fetch(BRIDGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': BRIDGE_KEY },
    body: JSON.stringify({ fn: 'troy-sql-executor', sql }),
  });
  return r.json();
}

export async function POST(req: NextRequest) {
  try {
    const { order_id, customer_id, product_id, trigger } = await req.json();
    if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 });

    // Fetch contract
    const contracts = await query(`SELECT * FROM wf_agent_contracts WHERE customer_id = '${customer_id}' AND identity->>'order_id' = '${order_id}' LIMIT 1`);
    const orders = await query(`SELECT * FROM wf_agent_orders WHERE order_id = '${order_id}'`);

    if (!orders.length) return NextResponse.json({ error: 'order not found' }, { status: 404 });
    const order = orders[0];
    const contract = contracts[0];
    const contract_id = contract?.contract_id;

    // Create agent instance
    const instanceRes = await bridge(`
      INSERT INTO wf_agent_instances (contract_id, customer_id, environment, state)
      VALUES ('${contract_id}', '${customer_id}', 'staging_safe', 'provisioning')
      RETURNING instance_id
    `);
    const instance_id = instanceRes.rows?.[0]?.instance_id;

    // Advance contract → staged
    await bridge(`UPDATE wf_agent_contracts SET state = 'staged', updated_at = now() WHERE contract_id = '${contract_id}'`);

    // Update order → deployed
    await bridge(`UPDATE wf_agent_orders SET status = 'deployed' WHERE order_id = '${order_id}'`);

    // Log audit
    await bridge(`INSERT INTO wf_audit_events (contract_id, event_type, from_state, to_state, actor, reason, metadata)
      VALUES ('${contract_id}', 'deploy_triggered', 'validated', 'staged', 'api_deploy',
        '${trigger ?? "manual"}', '{"instance_id":"${instance_id}","product_id":"${product_id}"}'::jsonb)`);

    // Enqueue autonomy run (fire and forget)
    bridge(`SELECT public.cmd_enqueue_autonomy_run('${contract_id}', 'staging_safe', 'workfamilyai')`).catch(() => {});

    return NextResponse.json({
      deployed: true,
      instance_id,
      contract_id,
      state: 'staged',
      environment: 'staging_safe',
      message: `Agent instance provisioned. Running in staging_safe — no live sends until promoted.`,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
