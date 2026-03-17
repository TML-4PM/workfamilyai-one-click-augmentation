import { NextRequest, NextResponse } from 'next/server';
import { supabaseQuery } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const customer_id = searchParams.get('customer_id');
  if (!customer_id) return NextResponse.json({ error: 'customer_id required' }, { status: 400 });

  const [orders, instances, idle] = await Promise.all([
    supabaseQuery(`
      SELECT o.order_id, o.request_type, o.status, o.created_at,
             c.readiness_score, c.readiness_level, c.state AS contract_state,
             p.product_name, p.family, p.risk_tier
      FROM public.wf_agent_orders o
      LEFT JOIN public.wf_agent_contracts c ON c.contract_id = o.contract_id
      LEFT JOIN public.wf_product_registry p ON p.product_id = (c.identity->>'product_id')
      WHERE o.customer_id = '${customer_id}'
      ORDER BY o.created_at DESC LIMIT 20
    `),
    supabaseQuery(`
      SELECT i.instance_id, i.state, i.environment, i.created_at,
             i.last_active_at, i.idle_since, i.idle_cost_usd_per_day,
             EXTRACT(EPOCH FROM (now() - COALESCE(i.last_active_at, i.created_at)))/86400 AS days_idle,
             p.product_name
      FROM public.wf_agent_instances i
      JOIN public.wf_agent_contracts c ON c.contract_id = i.contract_id
      JOIN public.wf_product_registry p ON p.product_id = (c.identity->>'product_id')
      WHERE i.customer_id = '${customer_id}'
      ORDER BY i.created_at DESC LIMIT 20
    `),
    supabaseQuery(`
      SELECT product_id, idle_days_at_log, total_idle_cost_usd, net_position_usd,
             flag_reason, resolved, logged_at
      FROM public.wf_agent_idle_log
      WHERE customer_id = '${customer_id}'
      ORDER BY logged_at DESC LIMIT 10
    `),
  ]);

  return NextResponse.json({ orders, instances, idle_log: idle });
}
