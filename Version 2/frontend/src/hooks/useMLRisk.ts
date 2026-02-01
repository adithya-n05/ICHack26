// frontend/src/hooks/useMLRisk.ts
// Hooks for ML-enhanced risk assessment

import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ============================================================================
// Types
// ============================================================================

export interface RiskFactor {
  name: string;
  weight: number;
  score: number;
  contribution: number;
  source: 'event' | 'news_sentiment' | 'historical' | 'geopolitical' | 'network';
}

export interface MLRiskAssessment {
  entityId: string;
  entityType: 'company' | 'port' | 'country';
  riskScore: number;
  confidence: number;
  factors: RiskFactor[];
  trend: 'increasing' | 'stable' | 'decreasing';
  predictedScore7d: number;
  aiAnalysis?: string;
}

export interface SentimentAnalysis {
  sentiment: {
    score: number;
    magnitude: number;
    aspects: Array<{ topic: string; sentiment: number }>;
  };
  riskLevel: 'critical' | 'high' | 'moderate' | 'low' | 'minimal';
  riskScore: number;
}

export interface SimilarEvent {
  eventId: string;
  similarity: number;
  severity: number;
  title: string;
}

// ============================================================================
// ML Risk Assessment Hook
// ============================================================================

export function useMLRiskAssessment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<MLRiskAssessment | null>(null);

  const assessRisk = useCallback(async (
    entityId: string,
    entityType: 'company' | 'port' | 'country'
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_BASE}/risk/ml/${entityType}/${entityId}`);
      if (!res.ok) throw new Error('Failed to assess risk');
      
      const data = await res.json();
      setAssessment(data);
      return data as MLRiskAssessment;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAssessment = useCallback(() => {
    setAssessment(null);
    setError(null);
  }, []);

  return {
    assessment,
    loading,
    error,
    assessRisk,
    clearAssessment,
  };
}

// ============================================================================
// Batch ML Risk Assessment Hook
// ============================================================================

export function useBatchMLRisk() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<MLRiskAssessment[]>([]);

  const assessBatch = useCallback(async (
    entities: Array<{ id: string; type: 'company' | 'port' | 'country' }>
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_BASE}/risk/ml/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entities }),
      });
      
      if (!res.ok) throw new Error('Failed to batch assess risk');
      
      const data = await res.json();
      setAssessments(data);
      return data as MLRiskAssessment[];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    assessments,
    loading,
    error,
    assessBatch,
  };
}

// ============================================================================
// Text Sentiment Analysis Hook
// ============================================================================

export function useTextAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SentimentAnalysis | null>(null);

  const analyzeText = useCallback(async (text: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_BASE}/risk/analyze-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      if (!res.ok) throw new Error('Failed to analyze text');
      
      const data = await res.json();
      setResult(data);
      return data as SentimentAnalysis;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    result,
    loading,
    error,
    analyzeText,
  };
}

// ============================================================================
// Similar Events Hook
// ============================================================================

export function useSimilarEvents() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<SimilarEvent[]>([]);

  const findSimilar = useCallback(async (
    title: string,
    description?: string,
    limit: number = 5
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_BASE}/risk/similar-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, limit }),
      });
      
      if (!res.ok) throw new Error('Failed to find similar events');
      
      const data = await res.json();
      setEvents(data);
      return data as SimilarEvent[];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    events,
    loading,
    error,
    findSimilar,
  };
}
