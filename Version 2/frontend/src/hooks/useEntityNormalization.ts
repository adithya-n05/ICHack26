// frontend/src/hooks/useEntityNormalization.ts
// Hooks for UN/LOCODE and ISO country normalization

import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Types
export interface NormalizedPort {
  unlocode: string;
  name: string;
  alternateNames: string[];
  country: string;
  subdivision?: string;
  coordinates: { lat: number; lng: number };
  function: string[];
  status: 'active' | 'inactive' | 'unknown';
}

export interface NormalizedCountry {
  iso2: string;
  iso3: string;
  numericCode: string;
  name: string;
  officialName?: string;
  region: string;
  subregion: string;
}

export interface NormalizationResult<T> {
  normalized: T | null;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'alias' | 'none';
  alternatives?: T[];
}

export interface BatchNormalizationResult {
  results: NormalizationResult<NormalizedPort>[];
  summary: {
    total: number;
    normalized: number;
    exact: number;
    fuzzy: number;
    alias: number;
    notFound: number;
  };
}

export interface PortSearchResult {
  query: string;
  count: number;
  ports: NormalizedPort[];
}

export interface UnlocodeValidation {
  code: string;
  validFormat: boolean;
  countryCode: string | null;
  exists: boolean;
  port: NormalizedPort | null;
}

// Hook for normalizing a single port name
export function usePortNormalization() {
  const [result, setResult] = useState<NormalizationResult<NormalizedPort> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalize = useCallback(async (portName: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/normalize/port`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: portName }),
      });
      
      if (!response.ok) throw new Error('Failed to normalize port');
      
      const data = await response.json();
      setResult(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, normalize };
}

// Hook for batch port normalization
export function useBatchPortNormalization() {
  const [result, setResult] = useState<BatchNormalizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeBatch = useCallback(async (portNames: string[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/normalize/ports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names: portNames }),
      });
      
      if (!response.ok) throw new Error('Failed to normalize ports');
      
      const data = await response.json();
      setResult(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, normalizeBatch };
}

// Hook for country normalization
export function useCountryNormalization() {
  const [result, setResult] = useState<NormalizationResult<NormalizedCountry> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalize = useCallback(async (countryName: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/normalize/country`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: countryName }),
      });
      
      if (!response.ok) throw new Error('Failed to normalize country');
      
      const data = await response.json();
      setResult(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, normalize };
}

// Hook for searching ports
export function usePortSearch() {
  const [result, setResult] = useState<PortSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, limit: number = 10) => {
    if (!query || query.length < 2) {
      setResult(null);
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${API_BASE}/normalize/ports/search?q=${encodeURIComponent(query)}&limit=${limit}`
      );
      
      if (!response.ok) throw new Error('Failed to search ports');
      
      const data = await response.json();
      setResult(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, search };
}

// Hook for getting ports by country
export function useCountryPorts() {
  const [ports, setPorts] = useState<NormalizedPort[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPorts = useCallback(async (countryCode: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${API_BASE}/normalize/ports/country/${encodeURIComponent(countryCode)}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch country ports');
      
      const data = await response.json();
      setPorts(data.ports);
      return data.ports;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { ports, loading, error, fetchPorts };
}

// Hook for validating UN/LOCODE
export function useUnlocodeValidation() {
  const [validation, setValidation] = useState<UnlocodeValidation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${API_BASE}/normalize/validate/unlocode/${encodeURIComponent(code)}`
      );
      
      if (!response.ok) throw new Error('Failed to validate UN/LOCODE');
      
      const data = await response.json();
      setValidation(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { validation, loading, error, validate };
}

// Hook for getting port by UN/LOCODE
export function usePortByUnlocode() {
  const [port, setPort] = useState<NormalizedPort | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPort = useCallback(async (unlocode: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${API_BASE}/normalize/port/${encodeURIComponent(unlocode)}`
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          setPort(null);
          return null;
        }
        throw new Error('Failed to fetch port');
      }
      
      const data = await response.json();
      setPort(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { port, loading, error, fetchPort };
}

// Utility function to format confidence as percentage
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

// Utility function to get match type badge color
export function getMatchTypeBadgeColor(matchType: string): string {
  switch (matchType) {
    case 'exact':
      return '#22c55e'; // green
    case 'alias':
      return '#3b82f6'; // blue
    case 'fuzzy':
      return '#f59e0b'; // amber
    default:
      return '#ef4444'; // red
  }
}
