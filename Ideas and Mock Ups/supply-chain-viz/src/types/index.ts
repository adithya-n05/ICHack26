export interface Coordinate {
  lng: number;
  lat: number;
}

export interface SupplyNode {
  id: string;
  name: string;
  type: 'supplier' | 'checkpoint' | 'destination' | 'port' | 'warehouse';
  location: Coordinate;
  country: string;
  countryCode: string;
  riskScore: number;
  metadata: {
    company?: string;
    products?: string[];
    capacity?: number;
  };
}

export interface SupplyRoute {
  id: string;
  name: string;
  sourceNodeId: string;
  destinationNodeId: string;
  waypoints: Coordinate[];
  transportMode: 'sea' | 'air' | 'rail' | 'road';
  estimatedDays: number;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'disrupted' | 'rerouted';
}

export interface RiskZone {
  id: string;
  name: string;
  type: 'war_zone' | 'natural_disaster' | 'political_instability' | 'trade_restriction';
  center: Coordinate;
  radius: number;
  severity: number;
  description: string;
  affectedCountries: string[];
}

export interface Supplier {
  id: string;
  name: string;
  location: Coordinate;
  country: string;
  products: string[];
  riskScore: number;
  leadTimeDays: number;
  capacityUtilization: number;
}

export interface NewsHeadline {
  id: string;
  title: string;
  source: string;
  sentiment: 'negative' | 'neutral' | 'positive';
  region: string;
  timestamp: Date;
}

export interface ImpactAnalysis {
  query: string;
  affectedRoutes: string[];
  affectedSuppliers: string[];
  riskLevel: number;
  summary: string;
  headlines: NewsHeadline[];
}
