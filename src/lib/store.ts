import { AgentContract, AgentInstance, AgentOrder, Customer, AgentActionLog, WizardState, AgentState } from './types';
import { compileContract } from './contract-compiler';
import { validateContract } from './validation';
import { transition } from './state-machine';
import { v4 as uuidv4 } from 'uuid';

// In-memory store — in production this would be Supabase
interface Store {
  customers: Map<string, Customer>;
  orders: Map<string, AgentOrder>;
  contracts: Map<string, AgentContract>;
  instances: Map<string, AgentInstance>;
  logs: AgentActionLog[];
  auditEvents: Array<{ id: string; timestamp: string; actor: string; action: string; target: string; details: string }>;
  usageEvents: Array<{ id: string; contract_id: string; timestamp: string; actions_count: number; token_cost: number; tool_cost: number }>;
  connectedPacks: Map<string, string[]>; // customer_id -> pack_ids
}

const store: Store = {
  customers: new Map(),
  orders: new Map(),
  contracts: new Map(),
  instances: new Map(),
  logs: [],
  auditEvents: [],
  usageEvents: [],
  connectedPacks: new Map(),
};

// Customer operations
export function createCustomer(email: string, name: string, company: string, stripeCustomerId: string = ''): Customer {
  const customer: Customer = {
    customer_id: uuidv4(),
    email,
    name,
    company,
    stripe_customer_id: stripeCustomerId,
    created_at: new Date().toISOString(),
  };
  store.customers.set(customer.customer_id, customer);
  logAudit('system', 'create_customer', customer.customer_id, `Customer created: ${email}`);
  return customer;
}

export function getCustomer(id: string): Customer | undefined {
  return store.customers.get(id);
}

export function getCustomerByEmail(email: string): Customer | undefined {
  return Array.from(store.customers.values()).find(c => c.email === email);
}

export function getAllCustomers(): Customer[] {
  return Array.from(store.customers.values());
}

export function updateCustomerStripe(customerId: string, stripeId: string): void {
  const c = store.customers.get(customerId);
  if (c) { c.stripe_customer_id = stripeId; store.customers.set(customerId, c); }
}

// Order operations
export function createOrder(customerId: string, requestType: AgentOrder['request_type'], payload: any): AgentOrder {
  const order: AgentOrder = {
    order_id: uuidv4(),
    customer_id: customerId,
    request_type: requestType,
    request_payload: payload,
    contract_id: null,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  store.orders.set(order.order_id, order);
  logAudit('system', 'create_order', order.order_id, `Order created: ${requestType}`);
  return order;
}

export function getOrder(id: string): AgentOrder | undefined {
  return store.orders.get(id);
}

export function getAllOrders(): AgentOrder[] {
  return Array.from(store.orders.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getOrdersByCustomer(customerId: string): AgentOrder[] {
  return Array.from(store.orders.values()).filter(o => o.customer_id === customerId);
}

// Contract operations
export function compileAndStoreContract(wizard: WizardState, customerId: string, orderId: string): AgentContract {
  const contract = compileContract(wizard);
  contract.identity.owner_customer_id = customerId;

  const customer = store.customers.get(customerId);
  if (customer?.stripe_customer_id) {
    contract.commercial_model.stripe_customer_id = customer.stripe_customer_id;
  }

  // Validate
  const connPacks = store.connectedPacks.get(customerId) || [];
  const validation = validateContract(contract, connPacks);
  contract.readiness_score = validation.readiness_score;
  contract.readiness_level = validation.readiness_level;

  // Transition state
  const t1 = transition('requested', 'interpreted', 'system', 'Intent interpreted', contract.audit.state_history);
  if (t1.success) {
    contract.deployment.state = t1.newState;
    contract.audit.state_history = t1.history;
  }
  const t2 = transition('interpreted', 'compiled', 'system', 'Contract compiled', contract.audit.state_history);
  if (t2.success) {
    contract.deployment.state = t2.newState;
    contract.audit.state_history = t2.history;
  }

  if (validation.valid) {
    const t3 = transition('compiled', 'validated', 'system', 'Validation passed', contract.audit.state_history);
    if (t3.success) {
      contract.deployment.state = t3.newState;
      contract.audit.state_history = t3.history;
    }
  }

  store.contracts.set(contract.contract_id, contract);

  // Update order
  const order = store.orders.get(orderId);
  if (order) {
    order.contract_id = contract.contract_id;
    order.status = validation.valid ? 'validated' : 'compiled';
    store.orders.set(orderId, order);
  }

  logAudit('system', 'compile_contract', contract.contract_id, `Contract compiled, readiness: ${contract.readiness_score}`);
  return contract;
}

export function getContract(id: string): AgentContract | undefined {
  return store.contracts.get(id);
}

export function getAllContracts(): AgentContract[] {
  return Array.from(store.contracts.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getContractsByCustomer(customerId: string): AgentContract[] {
  return Array.from(store.contracts.values()).filter(c => c.identity.owner_customer_id === customerId);
}

export function transitionContractState(contractId: string, targetState: AgentState, actor: string, reason: string): { success: boolean; error?: string } {
  const contract = store.contracts.get(contractId);
  if (!contract) return { success: false, error: 'Contract not found' };

  const result = transition(contract.deployment.state, targetState, actor, reason, contract.audit.state_history);
  if (result.success) {
    contract.deployment.state = result.newState;
    contract.audit.state_history = result.history;
    if (targetState === 'approved') contract.audit.approved_by = actor;
    contract.updated_at = new Date().toISOString();
    store.contracts.set(contractId, contract);
    logAudit(actor, 'state_transition', contractId, `${contract.audit.state_history.at(-2)?.to || 'null'} → ${targetState}: ${reason}`);
  }
  return { success: result.success, error: result.error };
}

// Instance operations
export function createInstance(contractId: string, customerId: string): AgentInstance {
  const instance: AgentInstance = {
    instance_id: uuidv4(),
    contract_id: contractId,
    customer_id: customerId,
    state: 'staged',
    environment: 'sandbox',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  store.instances.set(instance.instance_id, instance);
  logAudit('system', 'create_instance', instance.instance_id, `Instance staged for contract ${contractId}`);
  return instance;
}

export function getInstance(id: string): AgentInstance | undefined {
  return store.instances.get(id);
}

export function getInstancesByCustomer(customerId: string): AgentInstance[] {
  return Array.from(store.instances.values()).filter(i => i.customer_id === customerId);
}

export function getInstancesByContract(contractId: string): AgentInstance[] {
  return Array.from(store.instances.values()).filter(i => i.contract_id === contractId);
}

export function getAllInstances(): AgentInstance[] {
  return Array.from(store.instances.values());
}

export function updateInstanceState(instanceId: string, state: AgentState): void {
  const i = store.instances.get(instanceId);
  if (i) { i.state = state; i.updated_at = new Date().toISOString(); store.instances.set(instanceId, i); }
}

// Connected packs
export function connectPack(customerId: string, packId: string): void {
  const current = store.connectedPacks.get(customerId) || [];
  if (!current.includes(packId)) {
    current.push(packId);
    store.connectedPacks.set(customerId, current);
  }
}

export function getConnectedPacks(customerId: string): string[] {
  return store.connectedPacks.get(customerId) || [];
}

// Logging
export function addActionLog(log: AgentActionLog): boolean {
  // Validate required fields
  if (!log.stage || !log.action_type || !log.outcome || !log.timestamp || !log.contract_id) {
    return false; // Reject incomplete logs
  }
  store.logs.push(log);
  return true;
}

export function getActionLogs(contractId?: string): AgentActionLog[] {
  if (contractId) return store.logs.filter(l => l.contract_id === contractId);
  return [...store.logs];
}

export function addUsageEvent(contractId: string, actionsCount: number, tokenCost: number, toolCost: number): void {
  store.usageEvents.push({
    id: uuidv4(),
    contract_id: contractId,
    timestamp: new Date().toISOString(),
    actions_count: actionsCount,
    token_cost: tokenCost,
    tool_cost: toolCost,
  });
}

export function getUsageEvents(contractId?: string) {
  if (contractId) return store.usageEvents.filter(e => e.contract_id === contractId);
  return [...store.usageEvents];
}

function logAudit(actor: string, action: string, target: string, details: string): void {
  store.auditEvents.push({
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    actor,
    action,
    target,
    details,
  });
}

export function getAuditEvents(): typeof store.auditEvents {
  return [...store.auditEvents].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// Dashboard stats
export function getDashboardStats() {
  const contracts = getAllContracts();
  const instances = getAllInstances();
  return {
    total_customers: store.customers.size,
    total_orders: store.orders.size,
    total_contracts: contracts.length,
    total_instances: instances.length,
    live_agents: instances.filter(i => i.state === 'live').length,
    staged_agents: instances.filter(i => i.state === 'staged').length,
    paused_agents: instances.filter(i => i.state === 'paused').length,
    total_actions: store.logs.length,
    total_usage_events: store.usageEvents.length,
    avg_readiness: contracts.length > 0 ? Math.round(contracts.reduce((s, c) => s + c.readiness_score, 0) / contracts.length) : 0,
    pending_orders: Array.from(store.orders.values()).filter(o => o.status === 'pending').length,
  };
}
