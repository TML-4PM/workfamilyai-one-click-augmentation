import { StarterPack } from './types';

export const STARTER_PACKS: StarterPack[] = [
  {
    id: 'revenue_starter',
    name: 'Revenue Starter',
    description: 'Generate leads, book meetings, and close deals with AI agents handling outreach and follow-up across email and LinkedIn.',
    templates: ['lead_gen', 'sales'],
    default_packs: ['email_pack', 'crm_pack', 'calendar_pack', 'pricing_pack'],
    default_channels: ['email', 'linkedin', 'crm'],
    price_cents: 9900,
  },
  {
    id: 'customer_service_starter',
    name: 'Customer Service Starter',
    description: 'Auto-respond to FAQs, route tickets, and escalate complex issues with AI-powered customer service across email and webchat.',
    templates: ['customer_service'],
    default_packs: ['email_pack', 'faq_pack', 'escalation_pack', 'crm_pack'],
    default_channels: ['email', 'webchat'],
    price_cents: 4900,
  },
  {
    id: 'finance_starter',
    name: 'Finance Starter',
    description: 'Automate invoice processing, payment reminders, and account reconciliation with AI handling the routine financial operations.',
    templates: ['finance'],
    default_packs: ['email_pack', 'escalation_pack'],
    default_channels: ['email', 'internal'],
    price_cents: 4900,
  },
  {
    id: 'operations_starter',
    name: 'Operations Starter',
    description: 'Streamline scheduling, workflow coordination, and exception handling with AI agents keeping operations running smoothly.',
    templates: ['operations'],
    default_packs: ['email_pack', 'calendar_pack', 'escalation_pack'],
    default_channels: ['email', 'internal'],
    price_cents: 4900,
  },
];

export const TEMPLATES = [
  { id: 'lead_gen', name: 'Lead Generation', category: 'Revenue', description: 'AI-powered prospect identification, outreach, and qualification', icon: '🎯' },
  { id: 'customer_service', name: 'Customer Service', category: 'Support', description: 'Automated ticket handling, FAQ responses, and escalation', icon: '💬' },
  { id: 'sales', name: 'Sales Automation', category: 'Revenue', description: 'Pipeline management, proposal generation, and deal closing', icon: '💰' },
  { id: 'finance', name: 'Finance Operations', category: 'Back Office', description: 'Invoice processing, payment tracking, and reconciliation', icon: '📊' },
  { id: 'operations', name: 'Operations', category: 'Back Office', description: 'Workflow automation, scheduling, and process monitoring', icon: '⚙️' },
  { id: 'recruitment', name: 'Recruitment', category: 'HR', description: 'Candidate sourcing, screening, and interview scheduling', icon: '👥' },
  { id: 'onboarding', name: 'Customer Onboarding', category: 'Growth', description: 'Welcome flows, setup guidance, and training coordination', icon: '🚀' },
];
