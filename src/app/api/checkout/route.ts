import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2023-10-16' });
const APP_URL = 'https://workfamilyai-one-click-augmentation.vercel.app';

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

export async function POST(req: NextRequest) {
  try {
    const { order_id, customer_id, product_id } = await req.json();
    if (!order_id || !customer_id || !product_id) {
      return NextResponse.json({ error: 'order_id, customer_id, product_id required' }, { status: 400 });
    }

    // Fetch product + customer
    const products = await query(`SELECT * FROM wf_product_registry WHERE product_id = '${product_id}'`);
    const customers = await query(`SELECT * FROM wf_customers WHERE customer_id = '${customer_id}'`);
    if (!products.length) return NextResponse.json({ error: 'product not found' }, { status: 404 });
    if (!customers.length) return NextResponse.json({ error: 'customer not found' }, { status: 404 });

    const product = products[0];
    const customer = customers[0];

    // Upsert Stripe customer
    let stripeCustomerId: string;
    const existing = await stripe.customers.list({ email: customer.email, limit: 1 });
    if (existing.data.length > 0) {
      stripeCustomerId = existing.data[0].id;
    } else {
      const sc = await stripe.customers.create({
        email: customer.email,
        name: customer.name,
        metadata: { platform: 'workfamilyai', customer_id, company: customer.company ?? '' },
      });
      stripeCustomerId = sc.id;
    }

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // Monthly subscription
    const monthlyPrice = await stripe.prices.create({
      currency: 'usd',
      unit_amount: Math.round(product.monthly_price_usd * 100),
      recurring: { interval: 'month' },
      product_data: {
        name: `${product.product_name} — Monthly`,
        metadata: { product_id, family: product.family },
      },
    });
    lineItems.push({ price: monthlyPrice.id, quantity: 1 });

    // Setup fee (one-time)
    let setupFeeId: string | null = null;
    if (product.starter_price_usd > 0) {
      const setupPrice = await stripe.prices.create({
        currency: 'usd',
        unit_amount: Math.round(product.starter_price_usd * 100),
        product_data: {
          name: `${product.product_name} — Setup Fee`,
          metadata: { product_id, type: 'setup' },
        },
      });
      setupFeeId = setupPrice.id;
    }

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: lineItems,
      success_url: `${APP_URL}/?paid=1&order_id=${order_id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/?cancelled=1&order_id=${order_id}`,
      metadata: { order_id, customer_id, product_id, platform: 'workfamilyai' },
      subscription_data: {
        metadata: { order_id, customer_id, product_id },
      },
    };

    // Add setup fee as invoice item before checkout
    if (setupFeeId) {
      await stripe.invoiceItems.create({
        customer: stripeCustomerId,
        price: setupFeeId,
        description: `${product.product_name} — One-time setup fee`,
      });
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Update order with session ID
    await query(`UPDATE wf_agent_orders SET stripe_session_id = '${session.id}', status = 'payment_pending' WHERE order_id = '${order_id}'`);

    return NextResponse.json({ checkout_url: session.url, session_id: session.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
