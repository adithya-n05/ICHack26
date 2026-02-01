import type { GeoPoint } from './geo';
import type { ConnectionStatus } from './connection';

/**
 * Risk assessment entity type
 */
export type RiskEntityType = 'node' | 'connection';

/**
 * Affected entity in risk assessment
 */
export interface AffectedEntity {
  type: RiskEntityType;
  id: string;
  name: string;
  distanceKm?: number;
}

/**
 * Alternative supplier or route
 */
export interface Alternative {
  id: string;
  name: string;
  type: string;
  location?: GeoPoint;
  city?: string;
  country?: string;
  reason: string;
  confidence: number;
  distanceKm?: number;
}

/**
 * Risk assessment reasoning structure
 */
export interface RiskReasoning {
  summary: string;
  factors: string[];
  eventIds: string[];
}

/**
 * Complete risk assessment from backend
 */
export interface RiskAssessment {
  id: string;
  eventId: string;
  riskCategory: ConnectionStatus;
  severityScore: number;
  confidence: number;
  reasoning: RiskReasoning;
  affectedEntities: AffectedEntity[];
  alternatives: {
    suppliers: Alternative[];
    routes: Alternative[];
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Risk summary statistics
 */
export interface RiskSummary {
  total: number;
  healthy: number;
  monitoring: number;
  'at-risk': number;
  critical: number;
  disrupted: number;
}

/**
 * Risk update WebSocket payload
 */
export interface RiskUpdatePayload {
  eventId: string;
  status: 'updated' | 'processing' | 'error';
  riskCategory?: ConnectionStatus;
  severityScore?: number;
}
