/**
 * useRealtimeData - Hook for fetching real-time data from the backend
 *
 * Connects to WebSocket for live updates and fetches initial data via REST API
 * Fixed with simpler dependency management
 */

import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import {
  normalizeNewsItems,
  normalizeNodes,
  normalizeRiskZones,
  normalizeRoutes,
} from '../data/transformers';

const API_BASE = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001/ws';

export function useRealtimeData() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Get store actions directly inside effect to avoid stale closures
    const {
      updateRiskZones,
      updateNews,
      updateNodes,
      updateRoutes,
    } = useStore.getState();

    const fetchAggregatedData = async () => {
      console.log('[useRealtimeData] Fetching aggregated data from API...');

      try {
        const response = await fetch(`${API_BASE}/api/data`);

        if (!response.ok) {
          throw new Error(`API responded with ${response.status}`);
        }

        const data = await response.json();

        if (!isMountedRef.current) return;

        if (data.success) {
          if (Array.isArray(data.riskZones)) {
            const transformedZones = normalizeRiskZones(data.riskZones);
            if (transformedZones.length > 0) {
              console.log(`[useRealtimeData] Updating store with ${transformedZones.length} risk zones`);
              updateRiskZones(transformedZones);
            }
          }

          if (Array.isArray(data.news)) {
            const transformedNews = normalizeNewsItems(data.news);
            if (transformedNews.length > 0) {
              console.log(`[useRealtimeData] Updating store with ${transformedNews.length} news items`);
              updateNews(transformedNews);
            }
          }
        }
      } catch (error) {
        console.error('[useRealtimeData] Failed to fetch aggregated data:', error);
        // Keep using sample data on error
      }
    };

    const fetchSupplyChainData = async () => {
      console.log('[useRealtimeData] Fetching supply chain data from API...');

      const [nodesResponse, routesResponse] = await Promise.allSettled([
        fetch(`${API_BASE}/api/supply-chain/nodes`),
        fetch(`${API_BASE}/api/supply-chain/routes`),
      ]);

      if (!isMountedRef.current) return;

      if (nodesResponse.status === 'fulfilled' && nodesResponse.value.ok) {
        const nodesData = await nodesResponse.value.json();
        if (nodesData.success && Array.isArray(nodesData.data)) {
          const normalizedNodes = normalizeNodes(nodesData.data);
          if (normalizedNodes.length > 0) {
            console.log(`[useRealtimeData] Updating store with ${normalizedNodes.length} nodes`);
            updateNodes(normalizedNodes);
          }
        }
      }

      if (routesResponse.status === 'fulfilled' && routesResponse.value.ok) {
        const routesData = await routesResponse.value.json();
        if (routesData.success && Array.isArray(routesData.data)) {
          const normalizedRoutes = normalizeRoutes(routesData.data);
          if (normalizedRoutes.length > 0) {
            console.log(`[useRealtimeData] Updating store with ${normalizedRoutes.length} routes`);
            updateRoutes(normalizedRoutes);
          }
        }
      }
    };

    // Connect to WebSocket
    const connectWebSocket = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      try {
        console.log('[useRealtimeData] Connecting to WebSocket...');
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          console.log('[useRealtimeData] WebSocket connected');
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('[useRealtimeData] WebSocket message:', message.type);

            // Refetch data on any update
            if (message.type === 'RISK_ZONES_UPDATE' || message.type === 'FULL_UPDATE' || message.type === 'NEWS_UPDATE') {
              fetchAggregatedData();
            }
          } catch (err) {
            console.error('[useRealtimeData] Error parsing WebSocket message:', err);
          }
        };

        ws.onerror = () => {
          console.warn('[useRealtimeData] WebSocket error');
        };

        ws.onclose = () => {
          console.log('[useRealtimeData] WebSocket closed, reconnecting in 5s...');
          wsRef.current = null;

          if (isMountedRef.current) {
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
          }
        };

        wsRef.current = ws;
      } catch (error) {
        console.warn('[useRealtimeData] Failed to connect WebSocket:', error);
      }
    };

    // Initial fetch
    fetchAggregatedData();
    fetchSupplyChainData();

    // Connect WebSocket
    connectWebSocket();

    // Cleanup
    return () => {
      isMountedRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []); // Empty deps - run once on mount
}

export default useRealtimeData;
