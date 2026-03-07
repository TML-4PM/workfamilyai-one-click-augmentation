import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'operational',
    version: '1.0.0',
    endpoints: {
      contracts: '/api/contracts',
      orders: '/api/orders',
      agents: '/api/agents',
      stripe: '/api/stripe',
      admin: '/api/admin',
    },
    schemas: {
      agent_action_log: {
        required: ['event_id', 'timestamp', 'contract_id', 'agent_instance_id', 'stage', 'action_type', 'outcome'],
        optional: ['confidence_score', 'risk_score', 'exception_code', 'token_cost', 'tool_cost', 'latency_ms', 'human_intervention', 'escalation_triggered'],
      },
      qualified_lead_handoff: {
        required: ['lead_id', 'source_channel', 'business_id', 'contact', 'qualification', 'next_recommended_action'],
      },
      state_machine: {
        states: ['requested', 'interpreted', 'compiled', 'validated', 'approved', 'staged', 'live', 'paused', 'retired'],
        transitions: {
          requested: ['interpreted'], interpreted: ['compiled'], compiled: ['validated'],
          validated: ['approved', 'compiled'], approved: ['staged'],
          staged: ['live', 'paused'], live: ['paused', 'retired'], paused: ['live', 'retired'],
        },
      },
      failure_taxonomy: [
        'targeting_failure', 'enrichment_failure', 'messaging_failure', 'classification_failure',
        'qualification_failure', 'booking_failure', 'proposal_failure', 'pricing_failure',
        'compliance_failure', 'logging_failure', 'integration_failure', 'dependency_failure', 'human_dependency_failure',
      ],
    },
  });
}
