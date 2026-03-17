import { NextResponse } from 'next/server';
import { supabaseQuery } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Simple query first — no correlated subqueries
    const products = await supabaseQuery<Record<string,unknown>>(`
      SELECT
        p.product_id,
        p.product_name,
        p.family,
        p.risk_tier,
        p.autonomy_start_level,
        p.billing_model,
        p.monthly_running_cost_usd,
        p.monthly_revenue_potential_usd,
        p.starter_price_usd,
        p.monthly_price_usd,
        p.requires_human_gate,
        p.template_intensity,
        p.description,
        p.is_active,
        e.exec_steps,
        t.test_modules
      FROM public.wf_product_registry p
      LEFT JOIN (
        SELECT product_id, COUNT(*)::int AS exec_steps
        FROM public.wf_execution_register
        GROUP BY product_id
      ) e ON e.product_id = p.product_id
      LEFT JOIN (
        SELECT product_id, COUNT(*)::int AS test_modules
        FROM public.wf_test_register
        GROUP BY product_id
      ) t ON t.product_id = p.product_id
      WHERE p.is_active = true
      ORDER BY p.family, p.risk_tier
    `);
    return NextResponse.json({ products });
  } catch (e) {
    console.error('Products API error:', e);
    return NextResponse.json({ error: String(e), products: [] }, { status: 500 });
  }
}
