import { NextResponse } from 'next/server';
import { updateContractState, insertInstance, updateInstanceState, logAction, logAuditEvent } from '@/lib/supabase-bridge';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, contract_id, instance_id, actor, reason } = body;

    switch (action) {
      case 'transition': {
        const result = await updateContractState(contract_id, body.target_state);
        if (!result.success) return NextResponse.json({ error: result.message }, { status: 500 });
        await logAuditEvent(contract_id, 'state_change', body.from_state || null, body.target_state, actor || 'system', reason || 'State transition');
        return NextResponse.json({ success: true, contract_id, new_state: body.target_state });
      }

      case 'deploy': {
        const instResult = await insertInstance(contract_id, body.customer_id, body.environment || 'sandbox');
        if (!instResult.success) return NextResponse.json({ error: instResult.message }, { status: 500 });
        const newInstanceId = Array.isArray(instResult.rows) ? instResult.rows[0]?.instance_id : null;
        return NextResponse.json({ success: true, instance_id: newInstanceId, state: 'requested', environment: body.environment || 'sandbox' });
      }

      case 'log_action': {
        const required = ['stage', 'action_type', 'outcome', 'contract_id'];
        const missing = required.filter(f => !body[f]);
        if (missing.length > 0) {
          return NextResponse.json({ error: `Missing: ${missing.join(', ')}`, rejected: true }, { status: 400 });
        }
        const logResult = await logAction({
          contract_id: body.contract_id,
          instance_id: body.instance_id,
          business_id: body.business_id,
          customer_id: body.customer_id,
          stage: body.stage,
          channel: body.channel || 'internal',
          action_type: body.action_type,
          outcome: body.outcome,
          confidence_score: body.confidence_score,
          risk_score: body.risk_score,
          latency_ms: body.latency_ms,
        });
        if (!logResult.success) return NextResponse.json({ error: logResult.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Agent API error' }, { status: 500 });
  }
}
