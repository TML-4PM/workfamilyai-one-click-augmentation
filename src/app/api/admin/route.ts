import { NextResponse } from 'next/server';
import { getDashboardStats, listContracts } from '@/lib/supabase-bridge';

export async function GET() {
  const stats = await getDashboardStats();
  const contracts = await listContracts();

  return NextResponse.json({
    status: 'operational',
    version: '1.0.0',
    stats: stats.success && Array.isArray(stats.rows) ? stats.rows[0] : {},
    contracts: contracts.success ? (contracts.rows || []) : [],
    endpoints: {
      contracts: '/api/contracts',
      orders: '/api/orders',
      agents: '/api/agents',
      stripe: '/api/stripe',
      admin: '/api/admin',
      buddy: '/buddy',
    },
    schemas: {
      tables: ['wf_customers', 'wf_agent_contracts', 'wf_agent_orders', 'wf_agent_instances', 'wf_audit_events', 'wf_action_logs', 'wf_buddy_assignments'],
      state_machine: {
        states: ['requested', 'interpreted', 'compiled', 'validated', 'approved', 'staged', 'live', 'paused', 'retired'],
      },
    },
  });
}
