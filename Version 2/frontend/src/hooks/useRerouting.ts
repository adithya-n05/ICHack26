// frontend/src/hooks/useRerouting.ts
// Hooks for intelligent graph-based rerouting

import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Types
export interface RouteNode {
  id: string;
  type: 'port' | 'company' | 'warehouse';
  name: string;
  country: string;
  coordinates: { lat: number; lng: number };
  unlocode?: string;
}

export interface RouteEdge {
  from: string;
  to: string;
  transportMode: 'sea' | 'air' | 'rail' | 'road' | 'multimodal';
  distance: number;
  baseTime: number;
  baseCost: number;
}

export interface ScoredRoute {
  path: RouteNode[];
  edges: RouteEdge[];
  totalDistance: number;
  estimatedTime: number;
  estimatedCost: number;
  riskScore: number;
  riskBreakdown: Record<string, number>;
  reliability: number;
  score: number;
}

export interface ReroutingOptions {
  optimizeFor?: 'risk' | 'time' | 'cost' | 'balanced';
  maxHops?: number;
  excludeCountries?: string[];
  excludePorts?: string[];
  excludeChokepoints?: string[];
  maxRiskThreshold?: number;
  timeWeight?: number;
  costWeight?: number;
  riskWeight?: number;
}

export interface ReroutingResult {
  from: string;
  to: string;
  options: ReroutingOptions;
  original: ScoredRoute | null;
  alternatives: ScoredRoute[];
  recommendation: string;
}

export interface RouteResilienceAnalysis {
  route: string[];
  overallResilience: number;
  vulnerabilities: Array<{ node: string; risk: string; score: number }>;
  redundancyScore: number;
  recommendations: string[];
}

export interface Chokepoint {
  id: string;
  name: string;
  risk: number;
  alternatives: string[];
}

export interface QuickRouteResult {
  from: string;
  to: string;
  avoided: string[];
  bestRoute: {
    path: string[];
    distance: number;
    time: number;
    risk: number;
  } | null;
  alternativeCount: number;
  recommendation: string;
}

export interface ScenarioComparison {
  scenarioName: string;
  bestRoute: {
    path: string[];
    distance: number;
    time: number;
    cost: number;
    risk: number;
    reliability: number;
  } | null;
  alternativesFound: number;
}

// Hook for finding rerouting alternatives
export function useRerouting() {
  const [result, setResult] = useState<ReroutingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findAlternatives = useCallback(async (
    from: string,
    to: string,
    options: ReroutingOptions = {}
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/rerouting/find`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, options }),
      });
      
      if (!response.ok) throw new Error('Failed to find rerouting alternatives');
      
      const data = await response.json();
      setResult(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, findAlternatives };
}

// Hook for quick route lookup
export function useQuickRoute() {
  const [result, setResult] = useState<QuickRouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findQuickRoute = useCallback(async (
    from: string,
    to: string,
    avoidCountries: string[] = []
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        from,
        to,
        ...(avoidCountries.length > 0 && { avoid: avoidCountries.join(',') }),
      });
      
      const response = await fetch(`${API_BASE}/rerouting/quick?${params}`);
      
      if (!response.ok) throw new Error('Failed to find quick route');
      
      const data = await response.json();
      setResult(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, findQuickRoute };
}

// Hook for route resilience analysis
export function useRouteResilience() {
  const [analysis, setAnalysis] = useState<RouteResilienceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeResilience = useCallback(async (route: string[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/rerouting/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route }),
      });
      
      if (!response.ok) throw new Error('Failed to analyze route resilience');
      
      const data = await response.json();
      setAnalysis(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { analysis, loading, error, analyzeResilience };
}

// Hook for getting chokepoint information
export function useChokepoints() {
  const [chokepoints, setChokepoints] = useState<Chokepoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChokepoints = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/rerouting/chokepoints`);
      
      if (!response.ok) throw new Error('Failed to fetch chokepoints');
      
      const data = await response.json();
      setChokepoints(data.chokepoints);
      return data.chokepoints;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { chokepoints, loading, error, fetchChokepoints };
}

// Hook for comparing route scenarios
export function useRouteComparison() {
  const [result, setResult] = useState<{
    from: string;
    to: string;
    scenarios: ScenarioComparison[];
    recommendation: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compareScenarios = useCallback(async (
    from: string,
    to: string,
    scenarios: Array<{
      name: string;
      excludeCountries?: string[];
      excludePorts?: string[];
      optimizeFor?: string;
    }>
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/rerouting/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, scenarios }),
      });
      
      if (!response.ok) throw new Error('Failed to compare scenarios');
      
      const data = await response.json();
      setResult(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, compareScenarios };
}

// Utility: Format time in hours to human readable
export function formatTransitTime(hours: number): string {
  if (hours < 24) {
    return `${Math.round(hours)} hours`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  if (remainingHours === 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  return `${days}d ${remainingHours}h`;
}

// Utility: Format distance in km
export function formatDistance(km: number): string {
  if (km < 1000) {
    return `${Math.round(km)} km`;
  }
  return `${(km / 1000).toFixed(1)}k km`;
}

// Utility: Get risk level color
export function getRiskColor(score: number): string {
  if (score < 0.3) return '#22c55e';  // green
  if (score < 0.5) return '#eab308';  // yellow
  if (score < 0.7) return '#f97316';  // orange
  return '#ef4444';                    // red
}

// Utility: Get risk level label
export function getRiskLabel(score: number): string {
  if (score < 0.3) return 'Low';
  if (score < 0.5) return 'Moderate';
  if (score < 0.7) return 'Elevated';
  return 'High';
}
