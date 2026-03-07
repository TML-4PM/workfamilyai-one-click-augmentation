import { AgentState, StateTransition } from './types';

const VALID_TRANSITIONS: Record<AgentState, AgentState[]> = {
  requested: ['interpreted'],
  interpreted: ['compiled'],
  compiled: ['validated'],
  validated: ['approved', 'compiled'], // can go back if validation finds issues
  approved: ['staged'],
  staged: ['live', 'paused'],
  live: ['paused', 'retired'],
  paused: ['live', 'retired'],
  retired: [],
};

export function canTransition(from: AgentState, to: AgentState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transition(
  currentState: AgentState,
  targetState: AgentState,
  actor: string,
  reason: string,
  history: StateTransition[]
): { success: boolean; newState: AgentState; history: StateTransition[]; error?: string } {
  if (!canTransition(currentState, targetState)) {
    return {
      success: false,
      newState: currentState,
      history,
      error: `Invalid transition: ${currentState} → ${targetState}`,
    };
  }
  const t: StateTransition = {
    from: currentState,
    to: targetState,
    timestamp: new Date().toISOString(),
    actor,
    reason,
  };
  return {
    success: true,
    newState: targetState,
    history: [...history, t],
  };
}

export function getAvailableTransitions(state: AgentState): AgentState[] {
  return VALID_TRANSITIONS[state] || [];
}
