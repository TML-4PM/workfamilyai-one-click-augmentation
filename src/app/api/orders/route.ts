import { NextResponse } from 'next/server';
import { insertOrder, updateOrderStatus, upsertCustomer } from '@/lib/supabase-bridge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, company, request_type, payload } = body;

    if (!email || !request_type) {
      return NextResponse.json({ error: 'email and request_type required' }, { status: 400 });
    }

    const custResult = await upsertCustomer(email, name || email.split('@')[0], company || '');
    if (!custResult.success) return NextResponse.json({ error: custResult.message }, { status: 500 });
    const customerId = Array.isArray(custResult.rows) ? custResult.rows[0]?.customer_id : null;

    const orderResult = await insertOrder(customerId, request_type, payload || {});
    if (!orderResult.success) return NextResponse.json({ error: orderResult.message }, { status: 500 });
    const orderId = Array.isArray(orderResult.rows) ? orderResult.rows[0]?.order_id : null;

    return NextResponse.json({ success: true, order_id: orderId, customer_id: customerId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Order creation failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { order_id, status, contract_id } = await request.json();
    if (!order_id || !status) return NextResponse.json({ error: 'order_id and status required' }, { status: 400 });
    const result = await updateOrderStatus(order_id, status, contract_id);
    if (!result.success) return NextResponse.json({ error: result.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Invalid request' }, { status: 400 });
  }
}
