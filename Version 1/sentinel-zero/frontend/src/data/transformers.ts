import type { NewsItem, RiskZone, SupplyNode, SupplyRoute } from '../types';

type ApiRiskZone = {
  id: string;
  name: string;
  type: string;
  coordinates: [number, number];
  intensity: number;
  radius: number;
  description: string;
};

type ApiNewsItem = {
  id: string;
  title: string;
  source: string | null;
  severity?: string | null;
  region: string | null;
  impactScore?: number | null;
  impact_score?: number | null;
  timestamp: string | Date;
  url?: string | null;
};

type ApiNode = {
  id: string;
  name: string;
  type: string;
  coordinates: { type: 'Point'; coordinates: [number, number] } | [number, number];
  country: string | null;
  country_code: string | null;
  risk_score: number | null;
  metadata?: Record<string, unknown> | null;
};

type ApiRoute = {
  id: string;
  name: string | null;
  source_id: string;
  destination_id: string;
  transport_mode: string | null;
  status: string;
  risk_score: number | null;
  coordinates?: [number, number][];
};

const RISK_TYPES = new Set(['war', 'earthquake', 'storm', 'political', 'tariff']);
const NODE_TYPES = new Set(['supplier', 'port', 'warehouse', 'factory']);
const TRANSPORT_MODES = new Set(['sea', 'air', 'rail', 'road']);
const ROUTE_STATUS = new Set(['healthy', 'at-risk', 'disrupted']);
const NEWS_SEVERITIES = new Set(['critical', 'warning', 'info', 'positive']);

const asDate = (value: string | Date): Date => {
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const normalizeRiskType = (value: string): RiskZone['type'] =>
  (RISK_TYPES.has(value) ? value : 'political') as RiskZone['type'];

const normalizeNodeType = (value: string): SupplyNode['type'] =>
  (NODE_TYPES.has(value) ? value : 'supplier') as SupplyNode['type'];

const normalizeTransportMode = (value: string | null): SupplyRoute['transportMode'] =>
  (value && TRANSPORT_MODES.has(value) ? value : 'sea') as SupplyRoute['transportMode'];

const normalizeRouteStatus = (value: string): SupplyRoute['status'] =>
  (ROUTE_STATUS.has(value) ? value : 'healthy') as SupplyRoute['status'];

const normalizeSeverity = (value: string | null | undefined): NewsItem['severity'] =>
  (value && NEWS_SEVERITIES.has(value) ? value : 'info') as NewsItem['severity'];

const toLngLat = (
  coordinates: ApiNode['coordinates']
): [number, number] | null => {
  if (Array.isArray(coordinates) && coordinates.length === 2) {
    return coordinates;
  }
  if (coordinates && !Array.isArray(coordinates)) {
    return coordinates.coordinates;
  }
  return null;
};

export const normalizeRiskZones = (apiZones: ApiRiskZone[]): RiskZone[] =>
  apiZones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    type: normalizeRiskType(zone.type),
    coordinates: zone.coordinates,
    intensity: zone.intensity,
    radius: zone.radius,
    description: zone.description,
  }));

export const normalizeNewsItems = (apiNews: ApiNewsItem[]): NewsItem[] =>
  apiNews.map((item) => ({
    id: item.id,
    title: item.title,
    source: item.source ?? 'Unknown',
    timestamp: asDate(item.timestamp),
    severity: normalizeSeverity(item.severity ?? null),
    region: item.region ?? 'Global',
    impactScore: item.impactScore ?? item.impact_score ?? 0,
    url: item.url ?? undefined,
  }));

export const normalizeNodes = (apiNodes: ApiNode[]): SupplyNode[] =>
  apiNodes
    .map((node) => {
      const coordinates = toLngLat(node.coordinates);
      if (!coordinates) return null;
      return {
        id: node.id,
        name: node.name,
        type: normalizeNodeType(node.type),
        coordinates,
        country: node.country ?? 'Unknown',
        countryCode: node.country_code ?? 'UN',
        riskScore: node.risk_score ?? 0,
        metadata: node.metadata ?? {},
      };
    })
    .filter((node): node is SupplyNode => node !== null);

export const normalizeRoutes = (apiRoutes: ApiRoute[]): SupplyRoute[] =>
  apiRoutes
    .map((route) => {
      if (!route.coordinates || route.coordinates.length === 0) {
        return null;
      }
      return {
        id: route.id,
        name: route.name ?? 'Route',
        sourceId: route.source_id,
        destinationId: route.destination_id,
        coordinates: route.coordinates,
        transportMode: normalizeTransportMode(route.transport_mode),
        estimatedDays: 0,
        status: normalizeRouteStatus(route.status),
        riskScore: route.risk_score ?? 0,
      };
    })
    .filter((route): route is SupplyRoute => route !== null);
