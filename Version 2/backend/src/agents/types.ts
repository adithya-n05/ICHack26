// backend/src/agents/types.ts
// Shared types for the multi-agent system

export type AgentId = 
  | 'data-ingestion-agent'
  | 'risk-analysis-agent'
  | 'mitigation-agent'
  | 'alert-agent'
  | 'orchestrator'
  | 'api-gateway';  // For messages originating from API routes

export type MessageType =
  // Data Ingestion → Others
  | 'NEW_EVENTS_INGESTED'
  | 'NEW_NEWS_INGESTED'
  | 'DATA_SOURCE_FAILED'
  
  // Risk Analysis → Others
  | 'RISK_ASSESSMENT_COMPLETE'
  | 'HIGH_RISK_DETECTED'
  | 'RISK_ESCALATION'
  | 'RISK_RESOLVED'
  
  // Mitigation → Others
  | 'MITIGATION_PLAN_READY'
  | 'ALTERNATIVES_FOUND'
  | 'NO_ALTERNATIVES_AVAILABLE'
  | 'MITIGATION_EXECUTED'
  
  // Alert → Others
  | 'ALERT_SENT'
  | 'USER_ACKNOWLEDGED'
  
  // Orchestrator commands
  | 'REQUEST_RISK_ANALYSIS'
  | 'REQUEST_MITIGATION'
  | 'REQUEST_ALERT'
  | 'SYSTEM_HEALTH_CHECK'
  | 'AGENT_HEARTBEAT';

export interface AgentMessage {
  id: string;
  type: MessageType;
  fromAgent: AgentId;
  toAgent: AgentId | 'broadcast';
  payload: Record<string, any>;
  timestamp: string;
  correlationId?: string; // For tracking related messages
  priority: 'low' | 'normal' | 'high' | 'critical';
  requiresAck: boolean;
}

export interface AgentState {
  id: AgentId;
  status: 'idle' | 'processing' | 'error' | 'offline';
  lastHeartbeat: string;
  currentTask?: string;
  processedMessages: number;
  errorCount: number;
  memory: Record<string, any>; // Agent's working memory
}

export interface AgentCapability {
  name: string;
  description: string;
  inputTypes: MessageType[];
  outputTypes: MessageType[];
}

export interface AgentConfig {
  id: AgentId;
  name: string;
  description: string;
  capabilities: AgentCapability[];
  autonomousActions: boolean; // Can act without orchestrator approval
  maxConcurrentTasks: number;
}

export interface DecisionContext {
  triggeredBy: AgentMessage;
  relatedMessages: AgentMessage[];
  agentMemory: Record<string, any>;
  systemState: {
    activeRisks: number;
    pendingMitigations: number;
    recentAlerts: number;
  };
}

export interface AgentDecision {
  action: 'process' | 'delegate' | 'escalate' | 'ignore';
  reason: string;
  outputMessages: Omit<AgentMessage, 'id' | 'timestamp' | 'fromAgent'>[];
  memoryUpdates?: Record<string, any>;
}
