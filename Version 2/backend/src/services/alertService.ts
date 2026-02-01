// backend/src/services/alertService.ts
// Real-time alert service for supply chain risk notifications

import { Server as SocketServer } from 'socket.io';
import { getHighRiskEntities, getSupplyChainHealth, RiskScore } from './riskEngine';
import { getDriver } from '../lib/neo4j';

let io: SocketServer | null = null;
let lastHealthScore: number | null = null;
let lastHighRiskCount: number = 0;

export interface RiskAlert {
  id: string;
  type: 'new_risk' | 'risk_escalation' | 'risk_resolved' | 'health_degraded' | 'critical_event';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  entityId?: string;
  entityName?: string;
  entityType?: string;
  riskScore?: number;
  timestamp: string;
}

/**
 * Initialize alert service with Socket.IO server
 */
export function initializeAlertService(socketServer: SocketServer): void {
  io = socketServer;
  console.log('Alert service initialized');
}

/**
 * Broadcast a risk alert to all connected clients
 */
export function broadcastAlert(alert: RiskAlert): void {
  if (!io) return;
  
  io.emit('risk-alert', alert);
  console.log(`Alert broadcast: ${alert.type} - ${alert.title}`);
}

/**
 * Check for risk changes and broadcast alerts
 * Called periodically by cron job
 */
export async function checkAndBroadcastAlerts(): Promise<void> {
  if (!io || !getDriver()) return;

  try {
    // Check overall health
    const health = await getSupplyChainHealth();
    
    // Alert if health degraded significantly
    if (lastHealthScore !== null && health.overallScore < lastHealthScore - 10) {
      broadcastAlert({
        id: `health-${Date.now()}`,
        type: 'health_degraded',
        severity: health.healthLevel === 'critical' ? 'critical' : 'warning',
        title: 'Supply Chain Health Degraded',
        message: `Overall health dropped from ${lastHealthScore} to ${health.overallScore}`,
        timestamp: new Date().toISOString(),
      });
    }

    // Alert for new critical entities
    const highRiskEntities = await getHighRiskEntities(60);
    
    if (highRiskEntities.length > lastHighRiskCount) {
      const newCount = highRiskEntities.length - lastHighRiskCount;
      broadcastAlert({
        id: `high-risk-${Date.now()}`,
        type: 'new_risk',
        severity: 'warning',
        title: `${newCount} New High-Risk Entities`,
        message: `Detected ${newCount} new entities with elevated risk scores`,
        timestamp: new Date().toISOString(),
      });
    }

    // Check for critical entities
    const criticalEntities = highRiskEntities.filter(e => e.riskLevel === 'critical');
    for (const entity of criticalEntities.slice(0, 3)) { // Limit to 3 alerts
      broadcastAlert({
        id: `critical-${entity.entityId}-${Date.now()}`,
        type: 'critical_event',
        severity: 'critical',
        title: `Critical Risk: ${entity.entityName}`,
        message: `${entity.entityType} "${entity.entityName}" has reached critical risk level (${entity.riskScore}/100)`,
        entityId: entity.entityId,
        entityName: entity.entityName,
        entityType: entity.entityType,
        riskScore: entity.riskScore,
        timestamp: new Date().toISOString(),
      });
    }

    // Update tracking
    lastHealthScore = health.overallScore;
    lastHighRiskCount = highRiskEntities.length;

  } catch (err) {
    console.error('Alert check error:', err);
  }
}

/**
 * Create alert from a new event
 */
export function alertFromEvent(event: {
  id: string;
  title: string;
  type: string;
  severity: number;
  location: { lat: number; lng: number };
}): void {
  if (!io) return;
  
  // Only alert for high-severity events
  if (event.severity < 6) return;

  const severity = event.severity >= 8 ? 'critical' : 'warning';
  
  broadcastAlert({
    id: `event-${event.id}`,
    type: 'critical_event',
    severity,
    title: `New ${event.type} Event`,
    message: event.title,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get recent alerts (from memory cache)
 */
const alertHistory: RiskAlert[] = [];
const MAX_ALERT_HISTORY = 50;

export function addToAlertHistory(alert: RiskAlert): void {
  alertHistory.unshift(alert);
  if (alertHistory.length > MAX_ALERT_HISTORY) {
    alertHistory.pop();
  }
}

export function getRecentAlerts(limit: number = 20): RiskAlert[] {
  return alertHistory.slice(0, limit);
}

// Override broadcast to also store in history
const originalBroadcast = broadcastAlert;
export { originalBroadcast };

// Wrap broadcastAlert to also store history
const wrappedBroadcastAlert = (alert: RiskAlert): void => {
  addToAlertHistory(alert);
  if (!io) return;
  io.emit('risk-alert', alert);
  console.log(`Alert broadcast: ${alert.type} - ${alert.title}`);
};

// Re-export wrapped version
export { wrappedBroadcastAlert as broadcastRiskAlert };
