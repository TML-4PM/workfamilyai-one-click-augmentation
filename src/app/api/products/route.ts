import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export async function GET() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ products: [], error: 'missing env' });
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/wf_product_registry?is_active=eq.true&order=family,risk_tier&select=product_id,product_name,family,risk_tier,autonomy_start_level,billing_model,monthly_running_cost_usd,monthly_revenue_potential_usd,starter_price_usd,monthly_price_usd,requires_human_gate,template_intensity,description,is_active,build_effort_hours`,
      {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
        },
        cache: 'no-store',
      }
    );
    const rows = await res.json();
    // Map build_effort_hours to exec_steps/test_modules for UI compatibility
    const products = rows.map((p: Record<string,unknown>) => ({
      ...p,
      exec_steps: p.build_effort_hours ? Number(p.build_effort_hours) * 2 : 6,
      test_modules: (Number(p.risk_tier) * 3) + 3,
    }));
    return NextResponse.json({ products, count: products.length });
  } catch (e) {
    return NextResponse.json({ products: [], error: String(e) }, { status: 500 });
  }
}
