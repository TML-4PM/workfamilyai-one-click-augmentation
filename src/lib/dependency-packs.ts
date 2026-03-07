import { DependencyPack } from './types';

export const DEPENDENCY_PACKS: Record<string, DependencyPack> = {
  email_pack: {
    pack_id: 'email_pack',
    name: 'Email Pack',
    description: 'Send and receive emails via SMTP/API integration',
    required_integrations: ['smtp_server', 'email_domain'],
    required_secrets: ['email_sender_ref', 'smtp_credentials_ref'],
    status: 'missing',
  },
  calendar_pack: {
    pack_id: 'calendar_pack',
    name: 'Calendar Pack',
    description: 'Book meetings and manage calendar events',
    required_integrations: ['google_calendar', 'calendar_api'],
    required_secrets: ['calendar_connection_ref'],
    status: 'missing',
  },
  crm_pack: {
    pack_id: 'crm_pack',
    name: 'CRM Pack',
    description: 'Read/write leads, contacts, deals in CRM',
    required_integrations: ['crm_platform'],
    required_secrets: ['crm_connection_ref'],
    status: 'missing',
  },
  voice_pack: {
    pack_id: 'voice_pack',
    name: 'Voice Pack',
    description: 'Outbound/inbound voice calls via telephony API',
    required_integrations: ['telephony_provider'],
    required_secrets: ['voice_api_ref', 'phone_number_ref'],
    status: 'missing',
  },
  faq_pack: {
    pack_id: 'faq_pack',
    name: 'FAQ Pack',
    description: 'Knowledge base and FAQ lookup for agent responses',
    required_integrations: ['knowledge_base'],
    required_secrets: ['kb_connection_ref'],
    status: 'missing',
  },
  escalation_pack: {
    pack_id: 'escalation_pack',
    name: 'Escalation Pack',
    description: 'Human escalation routing and notification',
    required_integrations: ['notification_channel', 'ticketing_system'],
    required_secrets: ['escalation_webhook_ref'],
    status: 'missing',
  },
  pricing_pack: {
    pack_id: 'pricing_pack',
    name: 'Pricing Pack',
    description: 'Dynamic pricing, quoting and proposal generation',
    required_integrations: ['pricing_engine'],
    required_secrets: ['pricing_api_ref'],
    status: 'missing',
  },
};

export function getRequiredPacks(templateFamily: string): string[] {
  const packMap: Record<string, string[]> = {
    lead_gen: ['email_pack', 'crm_pack', 'calendar_pack', 'escalation_pack'],
    customer_service: ['email_pack', 'faq_pack', 'escalation_pack', 'crm_pack'],
    sales: ['email_pack', 'crm_pack', 'calendar_pack', 'pricing_pack', 'escalation_pack'],
    finance: ['email_pack', 'escalation_pack'],
    operations: ['email_pack', 'calendar_pack', 'escalation_pack'],
    revenue: ['email_pack', 'crm_pack', 'calendar_pack', 'pricing_pack'],
    onboarding: ['email_pack', 'calendar_pack', 'faq_pack'],
    recruitment: ['email_pack', 'calendar_pack', 'crm_pack'],
  };
  return packMap[templateFamily] || ['email_pack', 'escalation_pack'];
}

export function checkPackStatus(requiredPacks: string[], connectedPacks: string[]): { missing: string[]; connected: string[]; allConnected: boolean } {
  const missing = requiredPacks.filter(p => !connectedPacks.includes(p));
  const connected = requiredPacks.filter(p => connectedPacks.includes(p));
  return { missing, connected, allConnected: missing.length === 0 };
}
