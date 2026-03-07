import { AgentContract, ReadinessLevel } from './types';
import { DEPENDENCY_PACKS } from './dependency-packs';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  readiness_score: number;
  readiness_level: ReadinessLevel;
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

interface ValidationWarning {
  field: string;
  message: string;
}

export function validateContract(contract: AgentContract, connectedPacks: string[] = []): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields
  if (!contract.identity?.agent_name) errors.push({ field: 'identity.agent_name', message: 'Agent name is required', code: 'MISSING_FIELD' });
  if (!contract.identity?.agent_type) errors.push({ field: 'identity.agent_type', message: 'Agent type is required', code: 'MISSING_FIELD' });
  if (!contract.identity?.owner_customer_id) errors.push({ field: 'identity.owner_customer_id', message: 'Customer ID is required', code: 'MISSING_FIELD' });
  if (!contract.objective?.primary_goal) errors.push({ field: 'objective.primary_goal', message: 'Primary goal is required', code: 'MISSING_FIELD' });
  if (!contract.channels || contract.channels.length === 0) errors.push({ field: 'channels', message: 'At least one channel is required', code: 'MISSING_FIELD' });
  if (!contract.tasks || contract.tasks.length === 0) errors.push({ field: 'tasks', message: 'At least one task is required', code: 'MISSING_FIELD' });

  // Dependencies satisfied
  const requiredPacks = contract.dependency_packs || [];
  const missingPacks = requiredPacks.filter(p => !connectedPacks.includes(p));
  if (missingPacks.length > 0) {
    errors.push({ field: 'dependency_packs', message: `Missing dependency packs: ${missingPacks.join(', ')}`, code: 'MISSING_DEPENDENCY' });
  }

  // Guardrails configured
  if (!contract.controls?.guardrails || contract.controls.guardrails.length === 0) {
    warnings.push({ field: 'controls.guardrails', message: 'No guardrails configured — recommended for production' });
  }
  if (!contract.controls?.escalation_rules || contract.controls.escalation_rules.length === 0) {
    warnings.push({ field: 'controls.escalation_rules', message: 'No escalation rules configured' });
  }

  // Stripe customer exists
  if (!contract.commercial_model?.stripe_customer_id) {
    errors.push({ field: 'commercial_model.stripe_customer_id', message: 'Stripe customer ID is required', code: 'NO_BILLING' });
  }

  // Environment assigned
  if (!contract.deployment?.environment) {
    errors.push({ field: 'deployment.environment', message: 'Deployment environment is required', code: 'MISSING_FIELD' });
  }

  // Secrets profile validation
  const requiredSecrets: string[] = [];
  requiredPacks.forEach(packId => {
    const pack = DEPENDENCY_PACKS[packId];
    if (pack) requiredSecrets.push(...pack.required_secrets);
  });
  const missingSecrets = requiredSecrets.filter(s => !contract.secrets_profile?.[s]);
  if (missingSecrets.length > 0) {
    warnings.push({ field: 'secrets_profile', message: `Missing secret references: ${missingSecrets.join(', ')}` });
  }

  // Observability
  if (!contract.observability?.log_level) {
    warnings.push({ field: 'observability.log_level', message: 'Log level not set, defaulting to info' });
  }

  // Calculate readiness score
  const readiness_score = calculateReadinessScore(contract, connectedPacks);
  const readiness_level: ReadinessLevel = readiness_score >= 80 ? 'ready' : readiness_score >= 50 ? 'needs_setup' : 'blocked';

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    readiness_score,
    readiness_level,
  };
}

function calculateReadinessScore(contract: AgentContract, connectedPacks: string[]): number {
  let score = 0;
  const weights = { packs: 30, integrations: 20, guardrails: 20, billing: 15, observability: 15 };

  // Packs (30)
  const required = contract.dependency_packs || [];
  if (required.length === 0) {
    score += weights.packs;
  } else {
    const connected = required.filter(p => connectedPacks.includes(p)).length;
    score += Math.round((connected / required.length) * weights.packs);
  }

  // Integrations (20) — check access_profile
  const accessKeys = Object.keys(contract.access_profile || {});
  if (accessKeys.length > 0) score += weights.integrations;
  else if (required.length === 0) score += weights.integrations;

  // Guardrails (20)
  const hasGuardrails = (contract.controls?.guardrails?.length || 0) > 0;
  const hasEscalation = (contract.controls?.escalation_rules?.length || 0) > 0;
  if (hasGuardrails) score += 10;
  if (hasEscalation) score += 10;

  // Billing (15)
  if (contract.commercial_model?.stripe_customer_id) score += 15;

  // Observability (15)
  if (contract.observability?.log_level) score += 8;
  if (contract.observability?.retention_days) score += 7;

  return Math.min(100, score);
}
