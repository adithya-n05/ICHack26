export interface Coordinate {
  lng: number;
  lat: number;
}

export interface SupplyNode {
  id: string;
  name: string;
  type: 'supplier' | 'port' | 'warehouse' | 'factory';
  coordinates: [number, number]; // [lng, lat]
  country: string;
  countryCode: string;
  riskScore: number;
  metadata: {
    company?: string;
    products?: string[];
    capacity?: number;
    leadTime?: number;
    unitCost?: number;
  };
}

export interface SupplyRoute {
  id: string;
  name: string;
  sourceId: string;
  destinationId: string;
  coordinates: [number, number][]; // Array of [lng, lat] waypoints
  transportMode: 'sea' | 'air' | 'rail' | 'road';
  estimatedDays: number;
  status: 'healthy' | 'at-risk' | 'disrupted';
  riskScore: number;
  isSimulated?: boolean; // For rerouted arcs
}

export interface RiskZone {
  id: string;
  name: string;
  type: 'war' | 'earthquake' | 'storm' | 'political' | 'tariff';
  coordinates: [number, number]; // Center point
  intensity: number; // 0-1
  radius: number; // in km
  description: string;
}

export interface AlternativeSupplier {
  id: string;
  name: string;
  coordinates: [number, number];
  country: string;
  riskScore: number;
  costDelta: number; // percentage
  leadTimeDays: number;
  capacity: number;
  rank: number;
}

export interface TariffBarrier {
  id: string;
  name: string;
  sourceCountry: string;
  targetCountry: string;
  sourceCoordinates: [number, number];
  targetCoordinates: [number, number];
  tariffPercent: number;
  products: string[];
  effectiveDate: Date;
}

export interface Vessel {
  id: string;
  mmsi: string;
  name: string;
  coordinates: [number, number];
  heading: number;
  speed: number; // knots
  destination?: string;
  eta?: Date;
  path?: [number, number][]; // Historical path for TripsLayer
  timestamps?: number[]; // Timestamps for each path point
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  timestamp: Date;
  severity: 'critical' | 'warning' | 'info' | 'positive';
  region: string;
  impactScore: number;
  url?: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: 'disaster' | 'policy' | 'market';
  severity: 'critical' | 'warning' | 'info';
  title: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isSimulation?: boolean;
}

export interface SimulationResult {
  affectedRoutes: string[];
  newDisruptionScores: Record<string, number>;
  recommendedAlternatives: AlternativeSupplier[];
  costImpact: number;
  summary: string;
}

export type ViewMode = 'live' | 'historical' | 'simulation';

export type SidebarTab = 'intel' | 'details' | 'chat';

export interface AppState {
  // Map state
  viewMode: ViewMode;
  selectedNodeId: string | null;
  selectedRouteId: string | null;
  showAlternatives: boolean;
  simulationActive: boolean;
  placementMode: boolean; // For adding new nodes

  // Data
  nodes: SupplyNode[];
  routes: SupplyRoute[];
  riskZones: RiskZone[];
  alternatives: AlternativeSupplier[];
  tariffBarriers: TariffBarrier[];
  vessels: Vessel[];
  news: NewsItem[];
  timelineEvents: TimelineEvent[];
  chatMessages: ChatMessage[];
  simulatedRoutes: SupplyRoute[]; // Rerouted paths

  // UI state
  sidebarTab: SidebarTab;
  timelinePosition: number; // 0-100
  currentTime: number; // For animation

  // Actions
  setViewMode: (mode: ViewMode) => void;
  selectNode: (id: string | null) => void;
  selectRoute: (id: string | null) => void;
  setShowAlternatives: (show: boolean) => void;
  setSimulationActive: (active: boolean) => void;
  setPlacementMode: (mode: boolean) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setTimelinePosition: (pos: number) => void;
  setCurrentTime: (time: number) => void;
  addNode: (node: SupplyNode) => void;
  addRoute: (route: SupplyRoute) => void;
  updateNodes: (nodes: SupplyNode[]) => void;
  updateRoutes: (routes: SupplyRoute[]) => void;
  updateRiskZones: (zones: RiskZone[]) => void;
  updateVessels: (vessels: Vessel[]) => void;
  updateNews: (news: NewsItem[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  setSimulatedRoutes: (routes: SupplyRoute[]) => void;
}
