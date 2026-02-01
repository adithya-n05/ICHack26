import type { RiskAssessment, RiskSummary, Alternative } from '../../../shared/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Fetch risk assessments with optional filters
 */
export const getRiskAssessments = async (filters?: {
  eventId?: string;
  riskCategory?: string;
  limit?: number;
}): Promise<RiskAssessment[]> => {
  const params = new URLSearchParams();

  if (filters?.eventId) params.append('eventId', filters.eventId);
  if (filters?.riskCategory) params.append('riskCategory', filters.riskCategory);
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const response = await fetch(
    `${API_BASE_URL}/api/risk/assessments?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch risk assessments');
  }

  const data = await response.json();
  return data.assessments;
};

/**
 * Get a specific risk assessment by ID
 */
export const getRiskAssessment = async (id: string): Promise<RiskAssessment | null> => {
  const response = await fetch(`${API_BASE_URL}/api/risk/assessments/${id}`);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch risk assessment');
  }

  const data = await response.json();
  return data.assessment;
};

/**
 * Get risk assessment for a specific event
 */
export const getEventRisk = async (eventId: string): Promise<RiskAssessment | null> => {
  const response = await fetch(`${API_BASE_URL}/api/risk/event/${eventId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch event risk');
  }

  const data = await response.json();
  return data.assessment;
};

/**
 * Get alternative suppliers/routes for an event
 */
export const getEventAlternatives = async (
  eventId: string
): Promise<{ suppliers: Alternative[]; routes: Alternative[] }> => {
  const response = await fetch(
    `${API_BASE_URL}/api/risk/event/${eventId}/alternatives`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch alternatives');
  }

  const data = await response.json();
  return data.alternatives;
};

/**
 * Get risk summary statistics
 */
export const getRiskSummary = async (): Promise<RiskSummary> => {
  const response = await fetch(`${API_BASE_URL}/api/risk/summary`);

  if (!response.ok) {
    throw new Error('Failed to fetch risk summary');
  }

  const data = await response.json();
  return data.summary;
};

/**
 * Get affected entities for an event
 */
export const getAffectedEntities = async (
  eventId: string
): Promise<{ type: string; id: string; name: string; distanceKm?: number }[]> => {
  const response = await fetch(
    `${API_BASE_URL}/api/risk/affected-entities/${eventId}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch affected entities');
  }

  const data = await response.json();
  return data.affectedEntities;
};
