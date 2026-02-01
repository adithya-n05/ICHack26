// backend/src/agents/orchestrator.ts
// Central Orchestrator Agent
// Coordinates all agents, manages priorities, and handles system-wide decisions

import { EventEmitter } from 'events';
import { Server as SocketServer } from 'socket.io';
import { messageBus } from './messageBus';
import { AgentMessage, AgentState, MessageType } from './types';
import { BaseAgent } from './baseAgent';
import { DataIngestionAgent } from './dataIngestionAgent';
import { RiskAnalysisAgent } from './riskAnalysisAgent';
import { MitigationAgent } from './mitigationAgent';
import { AlertAgent } from './alertAgent';

interface SystemMetrics {
  startedAt: string;
  messagesProcessed: number;
  alertsSent: number;
  risksDetected: number;
  mitigationsGenerated: number;
  agentErrors: number;
}

interface AgentHealth {
  id: string;
  name: string;
  status: string;
  lastHeartbeat: string;
  processedMessages: number;
  errorCount: number;
}

export class Orchestrator extends EventEmitter {
  private agents: Map<string, BaseAgent> = new Map();
  private alertAgent: AlertAgent;
  private metrics: SystemMetrics;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor() {
    super();
    this.alertAgent = new AlertAgent();
    this.metrics = {
      startedAt: new Date().toISOString(),
      messagesProcessed: 0,
      alertsSent: 0,
      risksDetected: 0,
      mitigationsGenerated: 0,
      agentErrors: 0,
    };
  }

  /**
   * Initialize and start the orchestrator with all agents
   */
  async start(io?: SocketServer): Promise<void> {
    if (this.isRunning) {
      console.log('[Orchestrator] Already running');
      return;
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('        MULTI-AGENT SYSTEM ORCHESTRATOR STARTING          ');
    console.log('═══════════════════════════════════════════════════════════');

    this.isRunning = true;
    this.metrics.startedAt = new Date().toISOString();

    // Initialize agents
    const dataIngestionAgent = new DataIngestionAgent();
    const riskAnalysisAgent = new RiskAnalysisAgent();
    const mitigationAgent = new MitigationAgent();

    this.agents.set('data-ingestion-agent', dataIngestionAgent);
    this.agents.set('risk-analysis-agent', riskAnalysisAgent);
    this.agents.set('mitigation-agent', mitigationAgent);
    this.agents.set('alert-agent', this.alertAgent);

    // Initialize alert agent with Socket.IO if provided
    if (io) {
      this.alertAgent.initialize(io);
    }

    // Subscribe to all messages for monitoring
    messageBus.subscribe('orchestrator', ['all']);
    messageBus.on('agent:orchestrator', this.handleMessage.bind(this));
    messageBus.on('message', this.onAnyMessage.bind(this));
    messageBus.on('ack-timeout', this.handleAckTimeout.bind(this));

    // Start all agents
    console.log('[Orchestrator] Starting agents...');
    for (const [id, agent] of this.agents) {
      try {
        await agent.start();
        console.log(`[Orchestrator] ✓ ${agent.getConfig().name} started`);
      } catch (err) {
        console.error(`[Orchestrator] ✗ Failed to start ${id}:`, err);
      }
    }

    // Start health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds

    console.log('═══════════════════════════════════════════════════════════');
    console.log('        MULTI-AGENT SYSTEM ONLINE                         ');
    console.log(`        Agents Active: ${this.agents.size}                `);
    console.log('═══════════════════════════════════════════════════════════');

    // Emit ready event
    this.emit('ready', this.getStatus());
  }

  /**
   * Stop the orchestrator and all agents
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('[Orchestrator] Shutting down...');
    this.isRunning = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Stop all agents
    for (const [id, agent] of this.agents) {
      try {
        await agent.stop();
        console.log(`[Orchestrator] ✓ ${id} stopped`);
      } catch (err) {
        console.error(`[Orchestrator] ✗ Error stopping ${id}:`, err);
      }
    }

    messageBus.unsubscribe('orchestrator');
    messageBus.off('message', this.onAnyMessage.bind(this));

    console.log('[Orchestrator] Shutdown complete');
  }

  /**
   * Handle messages directed to orchestrator
   */
  private async handleMessage(message: AgentMessage): Promise<void> {
    console.log(`[Orchestrator] Received: ${message.type} from ${message.fromAgent}`);

    switch (message.type) {
      case 'AGENT_HEARTBEAT':
        this.handleHeartbeat(message);
        break;

      case 'HIGH_RISK_DETECTED':
        this.handleHighRisk(message);
        break;

      case 'RISK_ESCALATION':
        this.handleEscalation(message);
        break;

      case 'DATA_SOURCE_FAILED':
        this.handleDataSourceFailure(message);
        break;

      case 'RISK_ASSESSMENT_COMPLETE':
        this.handleAssessmentComplete(message);
        break;

      case 'MITIGATION_PLAN_READY':
        this.handleMitigationReady(message);
        break;

      case 'NO_ALTERNATIVES_AVAILABLE':
        this.handleNoAlternatives(message);
        break;

      case 'ALERT_SENT':
        this.metrics.alertsSent++;
        break;

      case 'USER_ACKNOWLEDGED':
        this.handleUserAcknowledgment(message);
        break;

      default:
        // Log but don't act on unknown messages
        console.log(`[Orchestrator] Unhandled message type: ${message.type}`);
    }
  }

  /**
   * Monitor all messages
   */
  private onAnyMessage(message: AgentMessage): void {
    this.metrics.messagesProcessed++;
  }

  /**
   * Handle agent heartbeat
   */
  private handleHeartbeat(message: AgentMessage): void {
    const { status, errorCount, error, failedMessage } = message.payload;

    if (error) {
      this.metrics.agentErrors++;
      console.warn(`[Orchestrator] Agent ${message.fromAgent} reported error: ${error}`);
    }
  }

  /**
   * Handle high risk detection
   */
  private handleHighRisk(message: AgentMessage): void {
    this.metrics.risksDetected++;

    const { entity, riskScore, requiresImmediate } = message.payload;

    console.log(`[Orchestrator] 🚨 High risk: ${entity?.name || riskScore?.entityName} (${riskScore?.riskScore || '?'}/100)`);

    // If critical and requires immediate action, orchestrate response
    if (requiresImmediate || (riskScore?.riskScore >= 80)) {
      // Ensure mitigation agent processes this
      messageBus.publish({
        type: 'REQUEST_MITIGATION',
        fromAgent: 'orchestrator',
        toAgent: 'mitigation-agent',
        payload: {
          entityId: entity?.id || riskScore?.entityId,
          entityType: entity?.type || riskScore?.entityType,
          riskScore,
          priority: 'critical',
        },
        priority: 'critical',
        requiresAck: true,
      });
    }
  }

  /**
   * Handle risk escalation
   */
  private handleEscalation(message: AgentMessage): void {
    const { entity, previousScore, currentScore, increase } = message.payload;

    console.log(`[Orchestrator] ⚠️ ESCALATION: ${entity?.id} ${previousScore} → ${currentScore}`);

    // Coordinate immediate response
    // 1. Request mitigation with urgency
    messageBus.publish({
      type: 'REQUEST_MITIGATION',
      fromAgent: 'orchestrator',
      toAgent: 'mitigation-agent',
      payload: {
        ...message.payload,
        urgency: 'immediate',
      },
      priority: 'critical',
      requiresAck: true,
    });

    // 2. Request immediate alert
    messageBus.publish({
      type: 'REQUEST_ALERT',
      fromAgent: 'orchestrator',
      toAgent: 'alert-agent',
      payload: {
        type: 'escalation',
        severity: 'critical',
        entityId: entity?.id,
        previousScore,
        currentScore,
        increase,
      },
      priority: 'critical',
      requiresAck: true,
    });
  }

  /**
   * Handle data source failure
   */
  private handleDataSourceFailure(message: AgentMessage): void {
    const { source, failingSources, consecutiveFailures } = message.payload;

    console.error(`[Orchestrator] 🔴 Data source failure: ${source || failingSources?.join(', ')}`);

    // Alert about infrastructure issue
    messageBus.publish({
      type: 'REQUEST_ALERT',
      fromAgent: 'orchestrator',
      toAgent: 'alert-agent',
      payload: {
        type: 'infrastructure',
        severity: 'warning',
        title: 'Data Source Degradation',
        message: `Data source ${source || failingSources?.join(', ')} experiencing issues. ${consecutiveFailures || '?'} consecutive failures.`,
      },
      priority: 'high',
      requiresAck: false,
    });
  }

  /**
   * Handle assessment complete
   */
  private handleAssessmentComplete(message: AgentMessage): void {
    const { criticalRisks, newRisksDetected } = message.payload;

    if (criticalRisks > 0) {
      console.log(`[Orchestrator] Assessment: ${criticalRisks} critical, ${newRisksDetected} total new risks`);
    }
  }

  /**
   * Handle mitigation ready
   */
  private handleMitigationReady(message: AgentMessage): void {
    this.metrics.mitigationsGenerated++;
    console.log(`[Orchestrator] ✓ Mitigation plan ready for ${message.payload.entityId}`);
  }

  /**
   * Handle no alternatives available
   */
  private handleNoAlternatives(message: AgentMessage): void {
    console.warn(`[Orchestrator] ⚠️ No alternatives for ${message.payload.entityId}`);

    // This is critical - escalate to human
    messageBus.publish({
      type: 'REQUEST_ALERT',
      fromAgent: 'orchestrator',
      toAgent: 'alert-agent',
      payload: {
        type: 'manual_intervention_required',
        severity: 'critical',
        entityId: message.payload.entityId,
        reason: message.payload.reason,
      },
      priority: 'critical',
      requiresAck: true,
    });
  }

  /**
   * Handle user acknowledgment
   */
  private handleUserAcknowledgment(message: AgentMessage): void {
    const { alertId, userId, entityId, alertType } = message.payload;
    console.log(`[Orchestrator] User ${userId} acknowledged ${alertType} alert for ${entityId}`);
  }

  /**
   * Handle ACK timeout
   */
  private handleAckTimeout(message: AgentMessage): void {
    console.warn(`[Orchestrator] ACK timeout for ${message.type} → ${message.toAgent}`);
    this.metrics.agentErrors++;

    // Could implement retry logic here
  }

  /**
   * Perform health check on all agents
   */
  private performHealthCheck(): void {
    messageBus.publish({
      type: 'SYSTEM_HEALTH_CHECK',
      fromAgent: 'orchestrator',
      toAgent: 'broadcast',
      payload: {
        timestamp: new Date().toISOString(),
        metrics: this.metrics,
      },
      priority: 'low',
      requiresAck: false,
    });
  }

  /**
   * Request risk analysis for an entity
   */
  requestRiskAnalysis(entityId: string, entityType: string): void {
    messageBus.publish({
      type: 'REQUEST_RISK_ANALYSIS',
      fromAgent: 'orchestrator',
      toAgent: 'risk-analysis-agent',
      payload: { entityId, entityType },
      priority: 'normal',
      requiresAck: true,
    });
  }

  /**
   * Request mitigation for an entity
   */
  requestMitigation(entityId: string, entityType: string): void {
    messageBus.publish({
      type: 'REQUEST_MITIGATION',
      fromAgent: 'orchestrator',
      toAgent: 'mitigation-agent',
      payload: { entityId, entityType },
      priority: 'high',
      requiresAck: true,
    });
  }

  /**
   * Get system status
   */
  getStatus(): {
    isRunning: boolean;
    uptime: number;
    metrics: SystemMetrics;
    agents: AgentHealth[];
    recentMessages: AgentMessage[];
  } {
    const agents: AgentHealth[] = [];

    for (const [id, agent] of this.agents) {
      const state = agent.getState();
      const config = agent.getConfig();
      agents.push({
        id: state.id,
        name: config.name,
        status: state.status,
        lastHeartbeat: state.lastHeartbeat,
        processedMessages: state.processedMessages,
        errorCount: state.errorCount,
      });
    }

    return {
      isRunning: this.isRunning,
      uptime: Date.now() - new Date(this.metrics.startedAt).getTime(),
      metrics: this.metrics,
      agents,
      recentMessages: messageBus.getHistory({
        since: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      }).slice(-20),
    };
  }

  /**
   * Get message history
   */
  getMessageHistory(filters?: {
    fromAgent?: string;
    toAgent?: string;
    type?: MessageType;
    since?: string;
  }): AgentMessage[] {
    return messageBus.getHistory(filters as any);
  }
}

// Singleton instance
export const orchestrator = new Orchestrator();
