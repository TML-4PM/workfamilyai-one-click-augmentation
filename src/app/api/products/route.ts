import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export async function GET() {
  // Debug: show env state
  const envCheck = {
    hasUrl: !!SUPABASE_URL,
    urlPrefix: SUPABASE_URL.slice(0,30),
    hasKey: !!SERVICE_KEY,
    keyLength: SERVICE_KEY.length,
  };

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ products: [], envCheck, error: 'missing env' });
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: `SELECT product_id, product_name, family, risk_tier, autonomy_start_level, billing_model, monthly_running_cost_usd, monthly_revenue_potential_usd, starter_price_usd, monthly_price_usd, requires_human_gate, template_intensity, description, is_active FROM public.wf_product_registry WHERE is_active = true ORDER BY family, risk_tier` }),
      cache: 'no-store',
    });

    const status = res.status;
    const data = await res.json();
    const rows = data.rows ?? [];

    return NextResponse.json({ products: rows, count: rows.length, status, envCheck });
  } catch (e) {
    return NextResponse.json({ products: [], error: String(e), envCheck }, { status: 500 });
  }
}
