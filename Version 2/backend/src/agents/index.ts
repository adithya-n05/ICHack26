// backend/src/agents/index.ts
// Multi-Agent System Entry Point
// Exports all agents and provides initialization functions

import { Server as SocketServer } from 'socket.io';

// Type exports
export * from './types';

// Core infrastructure
export { messageBus } from './messageBus';
export { BaseAgent } from './baseAgent';

// Agent exports
export { DataIngestionAgent } from './dataIngestionAgent';
export { RiskAnalysisAgent } from './riskAnalysisAgent';
export { MitigationAgent } from './mitigationAgent';
export { AlertAgent } from './alertAgent';
export { Orchestrator, orchestrator } from './orchestrator';

// Re-export the singleton for convenience
import { orchestrator } from './orchestrator';

/**
 * Initialize and start the multi-agent system
 * Call this from main server startup
 */
export async function startAgentSystem(io?: SocketServer): Promise<void> {
  console.log('');
  console.log('┌───────────────────────────────────────────────────────────┐');
  console.log('│          SENTINEL ZERO MULTI-AGENT SYSTEM                 │');
  console.log('│                                                           │');
  console.log('│  Agents:                                                  │');
  console.log('│    A. Data Ingestion Agent - GDELT/USGS/NOAA/News         │');
  console.log('│    B. Risk Analysis Agent  - Monte Carlo + ML             │');
  console.log('│    C. Mitigation Agent     - Alternatives + LLM           │');
  console.log('│    D. Alert Agent          - Socket.IO notifications      │');
  console.log('│    E. Orchestrator         - System coordination          │');
  console.log('│                                                           │');
  console.log('│  Communication: Event-driven message bus                  │');
  console.log('│  Protocol: Pub/Sub with ACK tracking                      │');
  console.log('└───────────────────────────────────────────────────────────┘');
  console.log('');

  await orchestrator.start(io);
}

/**
 * Gracefully stop the multi-agent system
 * Call this on server shutdown
 */
export async function stopAgentSystem(): Promise<void> {
  console.log('[Agent System] Initiating graceful shutdown...');
  await orchestrator.stop();
  console.log('[Agent System] Shutdown complete');
}

/**
 * Get current system status
 */
export function getAgentSystemStatus() {
  return orchestrator.getStatus();
}

/**
 * Request risk analysis for an entity
 */
export function requestRiskAnalysis(entityId: string, entityType: string): void {
  orchestrator.requestRiskAnalysis(entityId, entityType);
}

/**
 * Request mitigation planning for an entity
 */
export function requestMitigation(entityId: string, entityType: string): void {
  orchestrator.requestMitigation(entityId, entityType);
}
