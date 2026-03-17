import { NextResponse } from 'next/server';
import { supabaseQuery } from '@/lib/supabase';

export async function GET() {
  try {
    const products = await supabaseQuery(`
      SELECT product_id, product_name, family, risk_tier, autonomy_start_level,
             billing_model, monthly_running_cost_usd, monthly_revenue_potential_usd,
             starter_price_usd, monthly_price_usd, requires_human_gate,
             template_intensity, description, is_active,
             (SELECT COUNT(*)::int FROM public.wf_execution_register e WHERE e.product_id = p.product_id) AS exec_steps,
             (SELECT COUNT(*)::int FROM public.wf_test_register t WHERE t.product_id = p.product_id) AS test_modules
      FROM public.wf_product_registry p
      WHERE is_active = true
      ORDER BY family, risk_tier
    `);
    return NextResponse.json({ products });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
