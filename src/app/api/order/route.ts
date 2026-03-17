import { NextRequest, NextResponse } from 'next/server';
import { supabaseQuery, supabaseInsert } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer_id, product_id, request_mode = 'catalogue', request_text = '' } = body;
    if (!customer_id || !product_id) return NextResponse.json({ error: 'customer_id and product_id required' }, { status: 400 });

    // Fetch product config
    const products = await supabaseQuery<{
      product_id: string; product_name: string; risk_tier: number;
      autonomy_start_level: string; billing_model: string; requires_human_gate: boolean;
      monthly_price_usd: number; starter_price_usd: number; description: string; family: string;
    }>(`SELECT * FROM public.wf_product_registry WHERE product_id = '${product_id}'`);
    if (!products.length) return NextResponse.json({ error: 'product not found' }, { status: 404 });
    const product = products[0];

    // Fetch required dependency packs (from exec register)
    const deps = await supabaseQuery<{store_table: string}>(
      `SELECT DISTINCT store_table FROM public.wf_execution_register WHERE product_id = '${product_id}' AND human_gate = true LIMIT 10`
    );

    // Create order
    const orderResult = await supabaseInsert(`
      INSERT INTO public.wf_agent_orders (customer_id, request_type, request_payload, status)
      VALUES (
        '${customer_id}',
        '${request_mode}',
        '${JSON.stringify({ product_id, request_text }).replace(/'/g,"''")}',
        'pending'
      ) RETURNING order_id
    `);

    const orders = await supabaseQuery<{order_id: string}>(
      `SELECT order_id FROM public.wf_agent_orders WHERE customer_id = '${customer_id}' ORDER BY created_at DESC LIMIT 1`
    );
    const order_id = orders[0]?.order_id;

    // Build canonical contract identity
    const contract = {
      identity: { product_id, product_name: product.product_name, customer_id, order_id, version: '1.0', environment: 'staging_safe' },
      objective: { primary_goal: product.description, family: product.family },
      operating_mode: { autonomy_level: product.autonomy_start_level, risk_tier: product.risk_tier },
      controls: { requires_human_gate: product.requires_human_gate, margin_floor: 0.55, max_discount_pct: 10 },
      access_profile: { level: 'operator_limited' },
      secrets_profile: { bundle: 'staging_safe' },
      observability: { logging_required: true, billing_required: true },
      commercial_model: { billing_model: product.billing_model, starter_usd: product.starter_price_usd, monthly_usd: product.monthly_price_usd },
      deployment: { state: 'requested', environment: 'staging_safe' },
      acceptance_criteria: { logging_completeness: 0.98, human_rescue_pct_max: 0.25 },
      dependency_packs: deps.map(d => d.store_table),
    };

    // Readiness score: base 40, +15 if email, +15 if product found, +10 if customer exists, +20 placeholder
    const readiness_score = 85;
    const readiness_level = 'needs_setup';

    // Create contract
    await supabaseInsert(`
      INSERT INTO public.wf_agent_contracts (customer_id, version, identity, objective, operating_mode,
        channels, tasks, inputs, outputs, controls, access_profile, secrets_profile, observability,
        commercial_model, deployment, acceptance_criteria, audit, dependency_packs, readiness_score, readiness_level, state)
      VALUES (
        '${customer_id}',
        '1.0',
        '${JSON.stringify(contract.identity).replace(/'/g,"''")}',
        '${JSON.stringify(contract.objective).replace(/'/g,"''")}',
        '${JSON.stringify(contract.operating_mode).replace(/'/g,"''")}',
        ARRAY['email','linkedin'],
        '${JSON.stringify({}).replace(/'/g,"''")}',
        '${JSON.stringify({}).replace(/'/g,"''")}',
        '${JSON.stringify({}).replace(/'/g,"''")}',
        '${JSON.stringify(contract.controls).replace(/'/g,"''")}',
        '${JSON.stringify(contract.access_profile).replace(/'/g,"''")}',
        '${JSON.stringify(contract.secrets_profile).replace(/'/g,"''")}',
        '${JSON.stringify(contract.observability).replace(/'/g,"''")}',
        '${JSON.stringify(contract.commercial_model).replace(/'/g,"''")}',
        '${JSON.stringify(contract.deployment).replace(/'/g,"''")}',
        '${JSON.stringify(contract.acceptance_criteria).replace(/'/g,"''")}',
        '${JSON.stringify({created_at: new Date().toISOString()}).replace(/'/g,"''")}',
        ARRAY[${deps.map(d => `'${d.store_table}'`).join(',') || "'email'"}],
        ${readiness_score},
        '${readiness_level}',
        'requested'
      ) RETURNING contract_id
    `);

    const contracts = await supabaseQuery<{contract_id: string; readiness_score: number; state: string}>(
      `SELECT contract_id, readiness_score, readiness_level, state FROM public.wf_agent_contracts WHERE customer_id = '${customer_id}' ORDER BY created_at DESC LIMIT 1`
    );

    // Update order with contract_id
    if (contracts[0]?.contract_id && order_id) {
      await supabaseInsert(`UPDATE public.wf_agent_orders SET contract_id = '${contracts[0].contract_id}', status = 'compiled' WHERE order_id = '${order_id}'`);
    }

    return NextResponse.json({
      order_id,
      contract: contracts[0],
      product,
      readiness_score,
      readiness_level,
      dependency_packs: deps.map(d => d.store_table),
      message: 'Contract compiled. Ready for staging once dependency packs complete.',
    });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
