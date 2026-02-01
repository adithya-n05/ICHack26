// backend/src/agents/alertAgent.ts
// Agent D: Alert Agent
// Handles user notifications and acknowledgments

import { BaseAgent } from './baseAgent';
import { AgentConfig, AgentDecision, DecisionContext } from './types';
import { Server as SocketServer } from 'socket.io';

interface Alert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  entityId?: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

const config: AgentConfig = {
  id: 'alert-agent',
  name: 'Alert Agent',
  description: 'Manages user notifications, alert routing, and acknowledgment tracking',
  capabilities: [
    {
      name: 'Risk Alerts',
      description: 'Send alerts when risks are detected or escalate',
      inputTypes: ['HIGH_RISK_DETECTED', 'RISK_ESCALATION', 'REQUEST_ALERT'],
      outputTypes: ['ALERT_SENT'],
    },
    {
      name: 'Mitigation Notifications',
      description: 'Notify users when mitigation plans are ready',
      inputTypes: ['MITIGATION_PLAN_READY', 'ALTERNATIVES_FOUND'],
      outputTypes: ['ALERT_SENT'],
    },
    {
      name: 'Acknowledgment Tracking',
      description: 'Track user acknowledgment of alerts',
      inputTypes: ['USER_ACKNOWLEDGED'],
      outputTypes: ['ALERT_SENT'],
    },
  ],
  autonomousActions: true,
  maxConcurrentTasks: 10,
};

export class AlertAgent extends BaseAgent {
  private io: SocketServer | null = null;

  constructor() {
    super(config);
  }

  /**
   * Initialize with Socket.IO server
   */
  initialize(socketServer: SocketServer): void {
    this.io = socketServer;
    
    // Listen for user acknowledgments
    this.io.on('connection', (socket) => {
      socket.on('acknowledge-alert', (alertId: string, userId: string) => {
        this.handleUserAcknowledgment(alertId, userId);
      });
    });
  }

  protected async onStart(): Promise<void> {
    this.updateMemory('pendingAlerts', {});
    this.updateMemory('alertHistory', []);
    this.updateMemory('alertsSent', 0);
    this.updateMemory('alertsAcknowledged', 0);
  }

  protected async onStop(): Promise<void> {
    // Cleanup
  }

  protected async decide(context: DecisionContext): Promise<AgentDecision> {
    const { triggeredBy } = context;

    switch (triggeredBy.type) {
      case 'HIGH_RISK_DETECTED':
        return this.handleHighRiskAlert(context);

      case 'RISK_ESCALATION':
        return this.handleEscalationAlert(context);

      case 'MITIGATION_PLAN_READY':
        return this.handleMitigationAlert(context);

      case 'ALTERNATIVES_FOUND':
        return this.handleAlternativesAlert(context);

      case 'REQUEST_ALERT':
        return this.handleAlertRequest(context);

      case 'RISK_RESOLVED':
        return this.handleRiskResolvedAlert(context);

      default:
        return {
          action: 'ignore',
          reason: `Unhandled message type: ${triggeredBy.type}`,
          outputMessages: [],
        };
    }
  }

  /**
   * Handle high risk detection alert
   */
  private async handleHighRiskAlert(context: DecisionContext): Promise<AgentDecision> {
    const { entity, riskScore, triggerEvent, requiresImmediate } = context.triggeredBy.payload;

    const alert: Alert = {
      id: `alert-${Date.now()}`,
      type: 'high_risk',
      severity: requiresImmediate ? 'critical' : 'warning',
      title: `High Risk Detected: ${entity?.name || riskScore?.entityName || 'Unknown'}`,
      message: this.formatRiskMessage(riskScore, triggerEvent),
      entityId: entity?.id || riskScore?.entityId,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };

    return this.sendAlert(alert, context);
  }

  /**
   * Handle escalation alert
   */
  private async handleEscalationAlert(context: DecisionContext): Promise<AgentDecision> {
    const { entity, previousScore, currentScore, increase, immediateActions } = context.triggeredBy.payload;

    const alert: Alert = {
      id: `alert-${Date.now()}`,
      type: 'risk_escalation',
      severity: 'critical',
      title: `⚠️ RISK ESCALATION: ${entity?.name || entity?.id}`,
      message: `Risk score increased from ${previousScore} to ${currentScore} (+${increase} points). ${
        immediateActions ? `${immediateActions.length} immediate actions required.` : ''
      }`,
      entityId: entity?.id,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };

    return this.sendAlert(alert, context);
  }

  /**
   * Handle mitigation plan ready alert
   */
  private async handleMitigationAlert(context: DecisionContext): Promise<AgentDecision> {
    const { entityId, plan, urgency } = context.triggeredBy.payload;

    const alert: Alert = {
      id: `alert-${Date.now()}`,
      type: 'mitigation_ready',
      severity: urgency === 'immediate' ? 'critical' : 'info',
      title: `Mitigation Plan Available`,
      message: `A mitigation plan with ${plan?.actions?.length || 0} actions and ${
        plan?.alternativeSuppliers?.length || 0
      } alternative suppliers is ready for ${entityId}.`,
      entityId,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };

    return this.sendAlert(alert, context);
  }

  /**
   * Handle alternatives found alert
   */
  private async handleAlternativesAlert(context: DecisionContext): Promise<AgentDecision> {
    const { entityId, alternativeSuppliers, count } = context.triggeredBy.payload;

    // Only alert if explicitly requested or if no alternatives
    if (count === 0) {
      const alert: Alert = {
        id: `alert-${Date.now()}`,
        type: 'no_alternatives',
        severity: 'warning',
        title: `No Alternative Suppliers Found`,
        message: `Unable to find alternative suppliers for ${entityId}. Manual intervention may be required.`,
        entityId,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      };

      return this.sendAlert(alert, context);
    }

    // Don't spam with every alternatives found message
    return {
      action: 'ignore',
      reason: 'Alternatives found - no alert needed (covered by mitigation plan)',
      outputMessages: [],
    };
  }

  /**
   * Handle explicit alert request
   */
  private async handleAlertRequest(context: DecisionContext): Promise<AgentDecision> {
    const { type, severity, entityId, ...rest } = context.triggeredBy.payload;

    const alert: Alert = {
      id: `alert-${Date.now()}`,
      type: type || 'general',
      severity: severity || 'info',
      title: this.generateTitle(type, rest),
      message: this.generateMessage(type, rest),
      entityId,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };

    return this.sendAlert(alert, context);
  }

  /**
   * Handle risk resolved alert
   */
  private async handleRiskResolvedAlert(context: DecisionContext): Promise<AgentDecision> {
    const { resolvedEntities, count } = context.triggeredBy.payload;

    if (!resolvedEntities || resolvedEntities.length === 0) {
      return {
        action: 'ignore',
        reason: 'No entities to report as resolved',
        outputMessages: [],
      };
    }

    const alert: Alert = {
      id: `alert-${Date.now()}`,
      type: 'risk_resolved',
      severity: 'info',
      title: `Risk Resolved`,
      message: `${count || resolvedEntities.length} entities are no longer at high risk: ${
        resolvedEntities.slice(0, 3).join(', ')
      }${resolvedEntities.length > 3 ? '...' : ''}`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };

    return this.sendAlert(alert, context);
  }

  /**
   * Send an alert via Socket.IO
   */
  private async sendAlert(alert: Alert, context: DecisionContext): Promise<AgentDecision> {
    // Store in pending
    const pendingAlerts = this.getMemory<Record<string, Alert>>('pendingAlerts', {})!;
    pendingAlerts[alert.id] = alert;

    // Store in history
    const history = this.getMemory<Alert[]>('alertHistory', [])!;
    history.unshift(alert);
    if (history.length > 100) history.pop();

    // Increment counter
    const alertsSent = this.getMemory<number>('alertsSent', 0)! + 1;

    // Emit via Socket.IO
    if (this.io) {
      this.io.emit('risk-alert', {
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        entityId: alert.entityId,
        timestamp: alert.timestamp,
      });
      console.log(`[Alert Agent] 📢 Sent alert: ${alert.title}`);
    } else {
      console.log(`[Alert Agent] ⚠️ No Socket.IO - Alert would be: ${alert.title}`);
    }

    return {
      action: 'process',
      reason: `Sent ${alert.severity} alert: ${alert.title}`,
      outputMessages: [{
        type: 'ALERT_SENT',
        toAgent: 'orchestrator',
        payload: {
          alertId: alert.id,
          type: alert.type,
          severity: alert.severity,
          entityId: alert.entityId,
        },
        priority: 'low',
        requiresAck: false,
      }],
      memoryUpdates: {
        pendingAlerts,
        alertHistory: history,
        alertsSent,
      },
    };
  }

  /**
   * Handle user acknowledgment
   */
  private handleUserAcknowledgment(alertId: string, userId: string): void {
    const pendingAlerts = this.getMemory<Record<string, Alert>>('pendingAlerts', {})!;
    const alert = pendingAlerts[alertId];

    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = new Date().toISOString();

      // Move to acknowledged
      delete pendingAlerts[alertId];

      const acknowledged = this.getMemory<number>('alertsAcknowledged', 0)! + 1;
      this.updateMemory('alertsAcknowledged', acknowledged);
      this.updateMemory('pendingAlerts', pendingAlerts);

      // Notify orchestrator
      this.sendMessage({
        type: 'USER_ACKNOWLEDGED',
        toAgent: 'orchestrator',
        payload: {
          alertId,
          userId,
          entityId: alert.entityId,
          alertType: alert.type,
        },
        priority: 'low',
        requiresAck: false,
      });

      console.log(`[Alert Agent] ✓ Alert ${alertId} acknowledged by ${userId}`);
    }
  }

  /**
   * Format risk message
   */
  private formatRiskMessage(riskScore: any, triggerEvent: any): string {
    let message = '';

    if (riskScore) {
      message += `Risk Score: ${riskScore.riskScore}/100 (${riskScore.riskLevel}). `;
      message += `Trend: ${riskScore.trend}. `;
    }

    if (triggerEvent) {
      message += `Triggered by: ${triggerEvent.title || triggerEvent.type}. `;
    }

    if (riskScore?.factors?.length > 0) {
      message += `Key factors: ${riskScore.factors.slice(0, 2).map((f: any) => f.description).join('; ')}.`;
    }

    return message || 'Risk detected - see details.';
  }

  /**
   * Generate alert title
   */
  private generateTitle(type: string, data: any): string {
    switch (type) {
      case 'mitigation_ready':
        return 'Mitigation Plan Available';
      case 'risk_escalation':
        return '⚠️ Risk Escalation Alert';
      case 'high_risk':
        return 'High Risk Detected';
      default:
        return 'Supply Chain Alert';
    }
  }

  /**
   * Generate alert message
   */
  private generateMessage(type: string, data: any): string {
    switch (type) {
      case 'mitigation_ready':
        return `${data.alternativesCount || 0} alternatives found, ${data.actionCount || 0} actions recommended.`;
      case 'risk_escalation':
        return `Risk increased from ${data.previousScore} to ${data.currentScore}.`;
      default:
        return JSON.stringify(data);
    }
  }
}
