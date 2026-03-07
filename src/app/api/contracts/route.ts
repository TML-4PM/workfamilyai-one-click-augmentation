import { NextResponse } from 'next/server';
import { listContracts, insertContract, getContract, updateContractState, logAuditEvent } from '@/lib/supabase-bridge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customer_id') || undefined;
  const contractId = searchParams.get('contract_id');

  if (contractId) {
    const result = await getContract(contractId);
    if (!result.success) return NextResponse.json({ error: result.message }, { status: 500 });
    return NextResponse.json({ success: true, contract: Array.isArray(result.rows) ? result.rows[0] : null });
  }

  const result = await listContracts(customerId);
  if (!result.success) return NextResponse.json({ error: result.message }, { status: 500 });
  return NextResponse.json({ success: true, contracts: result.rows || [] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer_id, contract } = body;

    if (!customer_id || !contract) {
      return NextResponse.json({ error: 'customer_id and contract required' }, { status: 400 });
    }

    const result = await insertContract(customer_id, contract);
    if (!result.success) return NextResponse.json({ error: result.message }, { status: 500 });

    const contractId = Array.isArray(result.rows) ? result.rows[0]?.contract_id : null;
    if (contractId) {
      await logAuditEvent(contractId, 'state_change', null, 'requested', 'system', 'Contract created via wizard');
    }

    return NextResponse.json({ success: true, contract_id: contractId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Invalid request' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { contract_id, state, actor, reason } = await request.json();
    if (!contract_id || !state) {
      return NextResponse.json({ error: 'contract_id and state required' }, { status: 400 });
    }

    const current = await getContract(contract_id);
    const fromState = Array.isArray(current.rows) ? current.rows[0]?.state : null;

    const result = await updateContractState(contract_id, state);
    if (!result.success) return NextResponse.json({ error: result.message }, { status: 500 });

    await logAuditEvent(contract_id, 'state_change', fromState, state, actor || 'user', reason || 'Manual state update');

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Invalid request' }, { status: 400 });
  }
}
