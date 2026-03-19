import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2023-10-16' });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

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
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e) {
    console.error('Webhook sig verify failed:', e);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { order_id, customer_id, product_id } = session.metadata ?? {};
        if (!order_id) break;

        // Mark order paid
        await query(`UPDATE wf_agent_orders SET status = 'paid' WHERE order_id = '${order_id}'`);

        // Advance contract to validated
        await query(`UPDATE wf_agent_contracts SET state = 'validated', updated_at = now() WHERE customer_id = '${customer_id}' AND identity->>'order_id' = '${order_id}'`);

        // Log audit event
        await query(`INSERT INTO wf_audit_events (contract_id, event_type, from_state, to_state, actor, reason, metadata)
          SELECT contract_id, 'payment_complete', 'compiled', 'validated', 'stripe_webhook',
            'checkout.session.completed', '{"stripe_session_id":"${session.id}"}'::jsonb
          FROM wf_agent_contracts WHERE customer_id = '${customer_id}' AND identity->>'order_id' = '${order_id}'`);

        // Trigger deploy
        await fetch(`${process.env.NEXTAUTH_URL ?? 'https://workfamilyai-one-click-augmentation.vercel.app'}/api/deploy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id, customer_id, product_id, trigger: 'post_payment' }),
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const { order_id } = sub.metadata ?? {};
        if (!order_id) break;
        await query(`UPDATE wf_agent_orders SET status = 'cancelled' WHERE order_id = '${order_id}'`);
        await query(`UPDATE wf_agent_contracts SET state = 'retired', updated_at = now() WHERE identity->>'order_id' = '${order_id}'`);
        break;
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        const subId = typeof inv.subscription === 'string' ? inv.subscription : inv.subscription?.id;
        if (subId) {
          await query(`UPDATE wf_agent_orders SET status = 'payment_failed' WHERE stripe_session_id IN (
            SELECT id FROM wf_agent_orders WHERE stripe_session_id LIKE '%' LIMIT 1
          )`);
        }
        break;
      }
    }
  } catch (e) {
    console.error('Webhook handler error:', e);
  }

  return NextResponse.json({ received: true });
}
