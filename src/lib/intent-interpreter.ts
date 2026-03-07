import { Channel } from './types';
import { getRequiredPacks } from './dependency-packs';

export interface InterpretedIntent {
  template_family: string;
  agent_type: string;
  suggested_channels: Channel[];
  suggested_packs: string[];
  confidence_score: number;
  friction_score: number;
  inferred_goal: string;
  inferred_tasks: string[];
}

const TEMPLATE_KEYWORDS: Record<string, string[]> = {
  lead_gen: ['lead', 'leads', 'prospect', 'prospecting', 'outreach', 'linkedin', 'cold email', 'pipeline', 'generate leads', 'lead generation', 'find customers'],
  customer_service: ['support', 'customer service', 'helpdesk', 'tickets', 'faq', 'complaints', 'service desk', 'help customers', 'respond to queries'],
  sales: ['sales', 'close deals', 'proposal', 'quotes', 'negotiate', 'revenue', 'selling', 'deal', 'crm', 'follow up'],
  finance: ['invoice', 'billing', 'accounts', 'payment', 'finance', 'reconciliation', 'expense', 'budget', 'financial'],
  operations: ['operations', 'scheduling', 'workflow', 'automation', 'process', 'efficiency', 'coordinate', 'logistics'],
  recruitment: ['hiring', 'recruit', 'talent', 'candidate', 'interview', 'resume', 'job posting', 'hr'],
  onboarding: ['onboard', 'welcome', 'new customer', 'getting started', 'setup', 'orientation'],
};

const CHANNEL_KEYWORDS: Record<Channel, string[]> = {
  email: ['email', 'mail', 'inbox', 'send email', 'outreach'],
  linkedin: ['linkedin', 'social', 'networking', 'connect'],
  phone: ['call', 'phone', 'voice', 'ring', 'dial'],
  crm: ['crm', 'salesforce', 'hubspot', 'pipedrive', 'deals'],
  webchat: ['chat', 'live chat', 'website', 'messenger', 'widget'],
  internal: ['internal', 'slack', 'teams', 'notification'],
};

export function interpretFreeText(text: string): InterpretedIntent {
  const lower = text.toLowerCase();

  // Detect template family
  let bestFamily = 'operations';
  let bestScore = 0;
  for (const [family, keywords] of Object.entries(TEMPLATE_KEYWORDS)) {
    const matches = keywords.filter(k => lower.includes(k)).length;
    const score = matches / keywords.length;
    if (score > bestScore) {
      bestScore = score;
      bestFamily = family;
    }
  }

  // Detect channels
  const suggestedChannels: Channel[] = [];
  for (const [channel, keywords] of Object.entries(CHANNEL_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      suggestedChannels.push(channel as Channel);
    }
  }
  if (suggestedChannels.length === 0) suggestedChannels.push('email');

  // Get required packs
  const suggestedPacks = getRequiredPacks(bestFamily);

  // Infer agent type
  const agentTypeMap: Record<string, string> = {
    lead_gen: 'LeadGen Agent',
    customer_service: 'Customer Service Agent',
    sales: 'Sales Agent',
    finance: 'Finance Agent',
    operations: 'Operations Agent',
    recruitment: 'Recruitment Agent',
    onboarding: 'Onboarding Agent',
  };

  // Calculate confidence and friction
  const confidence = Math.min(0.95, 0.3 + bestScore * 2 + (suggestedChannels.length > 1 ? 0.1 : 0));
  const friction = Math.max(0.1, 1 - confidence - (suggestedPacks.length < 3 ? 0.1 : 0));

  // Infer tasks
  const taskMap: Record<string, string[]> = {
    lead_gen: ['Identify target prospects', 'Send personalized outreach', 'Track responses', 'Qualify leads', 'Book meetings'],
    customer_service: ['Monitor inbound queries', 'Classify tickets', 'Auto-respond to FAQs', 'Escalate complex issues', 'Track resolution'],
    sales: ['Manage deal pipeline', 'Send proposals', 'Follow up on quotes', 'Track negotiations', 'Close deals'],
    finance: ['Process invoices', 'Track payments', 'Reconcile accounts', 'Send payment reminders', 'Generate reports'],
    operations: ['Schedule tasks', 'Coordinate workflows', 'Monitor processes', 'Alert on exceptions', 'Generate status reports'],
    recruitment: ['Source candidates', 'Screen resumes', 'Schedule interviews', 'Send communications', 'Track pipeline'],
    onboarding: ['Welcome new customers', 'Guide setup process', 'Schedule training', 'Track completion', 'Collect feedback'],
  };

  return {
    template_family: bestFamily,
    agent_type: agentTypeMap[bestFamily] || 'General Agent',
    suggested_channels: suggestedChannels,
    suggested_packs: suggestedPacks,
    confidence_score: Math.round(confidence * 100) / 100,
    friction_score: Math.round(friction * 100) / 100,
    inferred_goal: `Automate ${bestFamily.replace('_', ' ')} processes`,
    inferred_tasks: taskMap[bestFamily] || ['Process requests', 'Track activity', 'Report results'],
  };
}
