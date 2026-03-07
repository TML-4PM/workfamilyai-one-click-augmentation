import { NextResponse } from 'next/server';

// Agent lifecycle management
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, contract_id, instance_id, actor, reason } = body;

    const validTransitions: Record<string, string[]> = {
      requested: ['interpreted'], interpreted: ['compiled'], compiled: ['validated'],
      validated: ['approved', 'compiled'], approved: ['staged'],
      staged: ['live', 'paused'], live: ['paused', 'retired'], paused: ['live', 'retired'],
    };

    switch (action) {
      case 'transition':
        return NextResponse.json({ success: true, contract_id, new_state: body.target_state, timestamp: new Date().toISOString() });

      case 'deploy':
        return NextResponse.json({ success: true, instance_id: crypto.randomUUID(), state: 'staged', environment: 'sandbox' });

      case 'log_action':
        // Validate required fields
        const required = ['stage', 'action_type', 'outcome', 'timestamp', 'contract_id'];
        const missing = required.filter(f => !body[f]);
        if (missing.length > 0) {
          return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}`, rejected: true }, { status: 400 });
        }
        return NextResponse.json({ success: true, event_id: crypto.randomUUID() });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: 'Agent API error' }, { status: 500 });
  }
}
