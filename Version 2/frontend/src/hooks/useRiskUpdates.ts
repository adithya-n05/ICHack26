import { useEffect, useCallback } from 'react';
import { socket } from '../lib/socket';
import type { RiskUpdatePayload } from '../../../shared/types';

/**
 * Hook to listen for real-time risk updates via WebSocket
 */
export const useRiskUpdates = (
  onRiskUpdated: (payload: RiskUpdatePayload) => void
) => {
  useEffect(() => {
    // Subscribe to risk updates
    socket.on('risk-updated', onRiskUpdated);

    // Cleanup on unmount
    return () => {
      socket.off('risk-updated', onRiskUpdated);
    };
  }, [onRiskUpdated]);

  const manualRefresh = useCallback(() => {
    // Trigger manual refresh by emitting event (if backend supports it)
    socket.emit('request-risk-refresh');
  }, []);

  return { manualRefresh, isConnected: socket.connected };
};
