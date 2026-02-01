// frontend/src/hooks/useAlerts.ts
// Hook for real-time risk alerts via WebSocket

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../lib/socket';

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

const MAX_ALERTS = 50;

/**
 * Hook for receiving real-time risk alerts
 */
export function useAlerts() {
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const isMountedRef = useRef(true);

  // Handler for new alerts
  const handleAlert = useCallback((alert: RiskAlert) => {
    if (!isMountedRef.current) return;
    
    setAlerts((prev) => {
      // Avoid duplicates
      if (prev.some((a) => a.id === alert.id)) return prev;
      
      const updated = [alert, ...prev];
      if (updated.length > MAX_ALERTS) {
        updated.pop();
      }
      return updated;
    });
    
    setUnreadCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const socket = getSocket();
    
    // Use type assertion since socket.io-client types can be inconsistent
    (socket as any).on('risk-alert', handleAlert);

    return () => {
      isMountedRef.current = false;
      (socket as any).off('risk-alert', handleAlert);
    };
  }, [handleAlert]);

  // Mark all as read
  const markAllRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Clear all alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setUnreadCount(0);
  }, []);

  // Dismiss a specific alert
  const dismissAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  // Get alerts by severity
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  const warningAlerts = alerts.filter((a) => a.severity === 'warning');

  return {
    alerts,
    unreadCount,
    criticalAlerts,
    warningAlerts,
    markAllRead,
    clearAlerts,
    dismissAlert,
  };
}

/**
 * Hook for alert notifications (with sound/visual effects)
 */
export function useAlertNotifications(enabled: boolean = true) {
  const { alerts, criticalAlerts } = useAlerts();
  const lastAlertRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    
    const latestAlert = alerts[0];
    if (!latestAlert || latestAlert.id === lastAlertRef.current) return;
    
    lastAlertRef.current = latestAlert.id;

    // Play sound for critical alerts (if supported)
    if (latestAlert.severity === 'critical') {
      try {
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('⚠️ Critical Supply Chain Alert', {
            body: latestAlert.title,
            icon: '/favicon.ico',
          });
        }
      } catch (e) {
        // Ignore notification errors
      }
    }
  }, [alerts, enabled]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  return {
    criticalCount: criticalAlerts.length,
    requestPermission,
  };
}
