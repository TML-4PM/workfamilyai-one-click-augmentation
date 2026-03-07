import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer_id, request_type, payload } = body;

    if (!customer_id || !request_type) {
      return NextResponse.json({ error: 'customer_id and request_type required' }, { status: 400 });
    }

    const order = {
      order_id: crypto.randomUUID(),
      customer_id,
      request_type,
      request_payload: payload,
      contract_id: null,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, order });
  } catch (e) {
    return NextResponse.json({ error: 'Order creation failed' }, { status: 500 });
  }
}
