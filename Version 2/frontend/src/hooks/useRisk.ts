// frontend/src/hooks/useRisk.ts
// Hook for fetching risk assessment data

import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface RiskFactor {
  type: 'event' | 'proximity' | 'concentration' | 'geopolitical' | 'weather';
  description: string;
  severity: number;
  weight: number;
}

export interface RiskScore {
  entityId: string;
  entityType: 'company' | 'port' | 'route' | 'country';
  entityName: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  factors: RiskFactor[];
  trend: 'improving' | 'stable' | 'worsening';
  prediction7d: number;
  prediction30d: number;
  updatedAt: string;
}

export interface SupplyChainHealth {
  overallScore: number;
  healthLevel: 'healthy' | 'warning' | 'degraded' | 'critical';
  criticalCount: number;
  highRiskCount: number;
  activeEvents: number;
  topRisks: { name: string; score: number; type: string }[];
}

export interface AlternativeSupplier {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  country: string;
  countryCode: string;
  products: string[];
  riskScore: number;
  distanceFromOriginal: number;
  recommendation: {
    score: number;
    reasons: string[];
    concerns: string[];
  };
}

export interface MitigationPlan {
  entityId: string;
  entityName: string;
  entityType: string;
  currentRisk: RiskScore;
  actions: {
    priority: 'immediate' | 'short-term' | 'long-term';
    action: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
  }[];
  alternativeSuppliers: AlternativeSupplier[];
  estimatedRiskReduction: number;
  generatedAt: string;
}

/**
 * Hook for fetching supply chain health
 */
export function useSupplyChainHealth() {
  const [health, setHealth] = useState<SupplyChainHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/risk/health`);
      if (!res.ok) throw new Error('Failed to fetch health');
      const data = await res.json();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    // Refresh every 2 minutes
    const interval = setInterval(fetchHealth, 120000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return { health, loading, error, refresh: fetchHealth };
}

/**
 * Hook for fetching high-risk entities
 */
export function useHighRiskEntities(minScore: number = 40) {
  const [entities, setEntities] = useState<RiskScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntities = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/risk/high-risk?minScore=${minScore}`);
      if (!res.ok) throw new Error('Failed to fetch high-risk entities');
      const data = await res.json();
      setEntities(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [minScore]);

  useEffect(() => {
    fetchEntities();
    const interval = setInterval(fetchEntities, 120000);
    return () => clearInterval(interval);
  }, [fetchEntities]);

  return { entities, loading, error, refresh: fetchEntities };
}

/**
 * Hook for fetching risk score for a specific entity
 */
export function useEntityRisk(entityId: string | null, entityType: 'company' | 'port' | 'country') {
  const [risk, setRisk] = useState<RiskScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRisk = useCallback(async () => {
    if (!entityId) {
      setRisk(null);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/risk/${entityType}/${entityId}`);
      if (!res.ok) {
        if (res.status === 503) {
          // Knowledge graph not configured
          setRisk(null);
          setError(null);
          return;
        }
        throw new Error('Failed to fetch risk');
      }
      const data = await res.json();
      setRisk(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

  useEffect(() => {
    fetchRisk();
  }, [fetchRisk]);

  return { risk, loading, error, refresh: fetchRisk };
}

/**
 * Hook for fetching alternative suppliers
 */
export function useAlternativeSuppliers(
  companyId: string | null,
  excludeCountries: string[] = []
) {
  const [alternatives, setAlternatives] = useState<AlternativeSupplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlternatives = useCallback(async () => {
    if (!companyId) {
      setAlternatives([]);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (excludeCountries.length > 0) {
        params.set('excludeCountries', excludeCountries.join(','));
      }
      const url = `${API_BASE}/api/risk/alternatives/suppliers/${companyId}?${params}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch alternatives');
      const data = await res.json();
      setAlternatives(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [companyId, excludeCountries.join(',')]);

  useEffect(() => {
    fetchAlternatives();
  }, [fetchAlternatives]);

  return { alternatives, loading, error, refresh: fetchAlternatives };
}

/**
 * Hook for fetching mitigation plan
 */
export function useMitigationPlan(
  entityId: string | null,
  entityType: 'company' | 'port'
) {
  const [plan, setPlan] = useState<MitigationPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    if (!entityId) {
      setPlan(null);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/risk/mitigation/${entityType}/${entityId}`);
      if (!res.ok) {
        if (res.status === 503) {
          setPlan(null);
          setError(null);
          return;
        }
        throw new Error('Failed to fetch mitigation plan');
      }
      const data = await res.json();
      setPlan(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  return { plan, loading, error, refresh: fetchPlan };
}
