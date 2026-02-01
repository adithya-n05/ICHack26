// backend/src/services/rerouting.ts
// Graph-based intelligent rerouting algorithm
// Uses A* / Dijkstra-like approach with multi-factor risk scoring

import { runQuery } from '../lib/neo4j';
import { normalizePort, getPortByUnlocode } from './entityNormalization';

// ============================================================================
// Types
// ============================================================================

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
  distance: number;  // km
  baseTime: number;  // hours
  baseCost: number;  // relative units
}

export interface RiskFactors {
  political: number;      // 0-1 political instability
  weather: number;        // 0-1 weather disruption probability
  congestion: number;     // 0-1 port/route congestion
  conflict: number;       // 0-1 conflict zone risk
  sanctions: number;      // 0-1 sanctions/trade restrictions
  piracy: number;         // 0-1 piracy risk (maritime)
  chokepoint: number;     // 0-1 chokepoint vulnerability
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
  score: number;  // Combined optimization score (lower is better)
}

export interface ReroutingOptions {
  optimizeFor: 'risk' | 'time' | 'cost' | 'balanced';
  maxHops: number;
  excludeCountries: string[];
  excludePorts: string[];
  excludeChokepoints: string[];
  preferTransportModes?: ('sea' | 'air' | 'rail' | 'road')[];
  maxRiskThreshold: number;
  timeWeight: number;
  costWeight: number;
  riskWeight: number;
}

// ============================================================================
// Risk Data (real-world informed)
// ============================================================================

const COUNTRY_RISK: Record<string, Partial<RiskFactors>> = {
  // High-risk countries
  'RU': { political: 0.8, conflict: 0.6, sanctions: 0.9 },
  'UA': { conflict: 0.9, political: 0.7 },
  'YE': { conflict: 0.9, piracy: 0.8, political: 0.9 },
  'SO': { piracy: 0.9, conflict: 0.8, political: 0.9 },
  'SY': { conflict: 0.9, political: 0.9, sanctions: 0.8 },
  'IR': { political: 0.7, sanctions: 0.9 },
  'KP': { political: 0.9, sanctions: 1.0 },
  'VE': { political: 0.7, sanctions: 0.6 },
  'MM': { political: 0.7, conflict: 0.5 },
  
  // Medium-risk countries
  'CN': { political: 0.4, sanctions: 0.3 },
  'IN': { political: 0.3, congestion: 0.4 },
  'PK': { political: 0.5, conflict: 0.3 },
  'EG': { political: 0.4, chokepoint: 0.6 },
  'TR': { political: 0.4 },
  'BR': { political: 0.3 },
  'ID': { political: 0.3, piracy: 0.3 },
  'PH': { political: 0.3, weather: 0.4 },
  
  // Low-risk countries
  'US': { political: 0.1, congestion: 0.3 },
  'JP': { political: 0.1, weather: 0.2 },
  'DE': { political: 0.1 },
  'NL': { political: 0.1 },
  'SG': { political: 0.1, congestion: 0.2 },
  'KR': { political: 0.2 },
  'GB': { political: 0.1 },
  'AU': { political: 0.1 },
  'CA': { political: 0.1 },
};

const CHOKEPOINT_RISK: Record<string, number> = {
  'suez': 0.7,           // Suez Canal - vulnerability to blockage
  'panama': 0.5,         // Panama Canal - capacity constraints
  'hormuz': 0.8,         // Strait of Hormuz - geopolitical tension
  'malacca': 0.4,        // Strait of Malacca - piracy, congestion
  'bab_el_mandeb': 0.8,  // Bab el-Mandeb - conflict zone
  'singapore': 0.3,      // Singapore Strait - congestion
  'gibraltar': 0.2,      // Strait of Gibraltar - relatively safe
  'bosphorus': 0.4,      // Bosphorus - capacity, geopolitical
  'cape_good_hope': 0.3, // Cape of Good Hope - weather, distance
  'dover': 0.2,          // Dover Strait - congestion
};

const MARITIME_ROUTES: Array<{
  from: string;
  to: string;
  distance: number;
  time: number;
  chokepoints: string[];
}> = [
  { from: 'CNSHA', to: 'SGSIN', distance: 2500, time: 96, chokepoints: [] },
  { from: 'CNSHA', to: 'KRPUS', distance: 900, time: 40, chokepoints: [] },
  { from: 'CNSHA', to: 'JPTYO', distance: 1800, time: 72, chokepoints: [] },
  { from: 'SGSIN', to: 'NLRTM', distance: 15000, time: 720, chokepoints: ['malacca', 'suez'] },
  { from: 'SGSIN', to: 'NLRTM', distance: 21000, time: 1008, chokepoints: ['cape_good_hope'] }, // Alternative
  { from: 'SGSIN', to: 'USLAX', distance: 14000, time: 672, chokepoints: ['malacca'] },
  { from: 'SGSIN', to: 'AEJEA', distance: 6000, time: 240, chokepoints: ['malacca'] },
  { from: 'CNSHA', to: 'USLAX', distance: 10000, time: 480, chokepoints: [] },
  { from: 'CNSHA', to: 'NLRTM', distance: 20000, time: 960, chokepoints: ['malacca', 'suez'] },
  { from: 'KRPUS', to: 'USLAX', distance: 9500, time: 456, chokepoints: [] },
  { from: 'JPTYO', to: 'USLAX', distance: 8500, time: 408, chokepoints: [] },
  { from: 'JPTYO', to: 'USNYC', distance: 18000, time: 864, chokepoints: ['panama'] },
  { from: 'NLRTM', to: 'USNYC', distance: 6000, time: 240, chokepoints: [] },
  { from: 'DEHAM', to: 'USNYC', distance: 6200, time: 250, chokepoints: [] },
  { from: 'GBFXT', to: 'USNYC', distance: 5500, time: 220, chokepoints: [] },
  { from: 'AEJEA', to: 'INNSA', distance: 2500, time: 120, chokepoints: [] },
  { from: 'AEJEA', to: 'NLRTM', distance: 10000, time: 480, chokepoints: ['suez', 'gibraltar'] },
  { from: 'TWKHH', to: 'USLAX', distance: 10500, time: 504, chokepoints: [] },
  { from: 'VNSGN', to: 'USLAX', distance: 11500, time: 552, chokepoints: [] },
  { from: 'MYPKG', to: 'NLRTM', distance: 14500, time: 696, chokepoints: ['malacca', 'suez'] },
  { from: 'THLCH', to: 'NLRTM', distance: 15500, time: 744, chokepoints: ['malacca', 'suez'] },
  { from: 'IDJKT', to: 'NLRTM', distance: 14000, time: 672, chokepoints: ['malacca', 'suez'] },
  { from: 'BRSSZ', to: 'NLRTM', distance: 10000, time: 480, chokepoints: [] },
  { from: 'BRSSZ', to: 'CNSHA', distance: 20000, time: 960, chokepoints: ['cape_good_hope'] },
  { from: 'ZADUR', to: 'CNSHA', distance: 12000, time: 576, chokepoints: [] },
  { from: 'EGPSD', to: 'NLRTM', distance: 5500, time: 264, chokepoints: ['suez', 'gibraltar'] },
  { from: 'GRPIR', to: 'CNSHA', distance: 14000, time: 672, chokepoints: ['suez', 'malacca'] },
];

// ============================================================================
// Graph Building
// ============================================================================

interface GraphNode {
  id: string;
  data: RouteNode;
  edges: Map<string, GraphEdge>;
}

interface GraphEdge {
  target: string;
  data: RouteEdge;
  riskScore: number;
}

class RouteGraph {
  nodes: Map<string, GraphNode> = new Map();
  
  addNode(node: RouteNode): void {
    if (!this.nodes.has(node.id)) {
      this.nodes.set(node.id, { id: node.id, data: node, edges: new Map() });
    }
  }
  
  addEdge(from: string, to: string, edge: RouteEdge, riskScore: number): void {
    const fromNode = this.nodes.get(from);
    const toNode = this.nodes.get(to);
    
    if (fromNode && toNode) {
      fromNode.edges.set(to, { target: to, data: edge, riskScore });
      // Add reverse edge for bidirectional routing
      toNode.edges.set(from, { 
        target: from, 
        data: { ...edge, from: to, to: from }, 
        riskScore 
      });
    }
  }
  
  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }
  
  getEdge(from: string, to: string): GraphEdge | undefined {
    return this.nodes.get(from)?.edges.get(to);
  }
}

/**
 * Build route graph from static data and optional Neo4j data
 */
async function buildGraph(useNeo4j: boolean = true): Promise<RouteGraph> {
  const graph = new RouteGraph();
  
  // Add ports from maritime routes
  const portIds = new Set<string>();
  for (const route of MARITIME_ROUTES) {
    portIds.add(route.from);
    portIds.add(route.to);
  }
  
  // Add port nodes
  for (const portId of portIds) {
    const portData = getPortByUnlocode(portId);
    if (portData) {
      graph.addNode({
        id: portId,
        type: 'port',
        name: portData.name,
        country: portData.country,
        coordinates: portData.coordinates,
        unlocode: portId,
      });
    }
  }
  
  // Add edges from maritime routes
  for (const route of MARITIME_ROUTES) {
    const fromPort = getPortByUnlocode(route.from);
    const toPort = getPortByUnlocode(route.to);
    
    if (!fromPort || !toPort) continue;
    
    // Calculate risk score for this route
    const fromRisk = COUNTRY_RISK[fromPort.country] || {};
    const toRisk = COUNTRY_RISK[toPort.country] || {};
    
    let riskScore = 0;
    
    // Country risk average
    const countryRiskFactors = ['political', 'conflict', 'sanctions', 'piracy'] as const;
    for (const factor of countryRiskFactors) {
      riskScore += ((fromRisk[factor] || 0) + (toRisk[factor] || 0)) / 2;
    }
    riskScore /= countryRiskFactors.length;
    
    // Add chokepoint risk
    for (const chokepoint of route.chokepoints) {
      riskScore += (CHOKEPOINT_RISK[chokepoint] || 0) * 0.3;
    }
    
    // Normalize to 0-1
    riskScore = Math.min(1, riskScore);
    
    const edge: RouteEdge = {
      from: route.from,
      to: route.to,
      transportMode: 'sea',
      distance: route.distance,
      baseTime: route.time,
      baseCost: route.distance * 0.1, // Simplified cost model
    };
    
    graph.addEdge(route.from, route.to, edge, riskScore);
  }
  
  // Optionally augment with Neo4j data
  if (useNeo4j) {
    try {
      const cypher = `
        MATCH (p1:Port)-[r:CONNECTED_TO]->(p2:Port)
        RETURN p1.id AS from, p2.id AS to, 
               r.distance AS distance, r.time AS time,
               p1.country AS fromCountry, p2.country AS toCountry
      `;
      const results = await runQuery(cypher);
      
      for (const row of results) {
        if (graph.getNode(row.from) && graph.getNode(row.to)) {
          const edge: RouteEdge = {
            from: row.from,
            to: row.to,
            transportMode: 'sea',
            distance: row.distance || 1000,
            baseTime: row.time || 48,
            baseCost: (row.distance || 1000) * 0.1,
          };
          
          const fromRisk = COUNTRY_RISK[row.fromCountry] || {};
          const toRisk = COUNTRY_RISK[row.toCountry] || {};
          const riskScore = (
            (fromRisk.political || 0) + (toRisk.political || 0) +
            (fromRisk.conflict || 0) + (toRisk.conflict || 0)
          ) / 4;
          
          graph.addEdge(row.from, row.to, edge, riskScore);
        }
      }
    } catch (error) {
      console.log('Neo4j not available, using static data only');
    }
  }
  
  return graph;
}

// ============================================================================
// A* Pathfinding with Risk-Aware Heuristics
// ============================================================================

interface PathState {
  nodeId: string;
  path: string[];
  gScore: number;  // Actual cost from start
  fScore: number;  // Estimated total cost (g + heuristic)
  riskAccum: number;
  distanceAccum: number;
  timeAccum: number;
  costAccum: number;
}

/**
 * Haversine distance for heuristic
 */
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * A* pathfinding with multi-objective optimization
 */
async function findPaths(
  graph: RouteGraph,
  startId: string,
  endId: string,
  options: ReroutingOptions
): Promise<ScoredRoute[]> {
  const startNode = graph.getNode(startId);
  const endNode = graph.getNode(endId);
  
  if (!startNode || !endNode) {
    return [];
  }
  
  const excludeCountrySet = new Set(options.excludeCountries.map(c => c.toUpperCase()));
  const excludePortSet = new Set(options.excludePorts.map(p => p.toUpperCase()));
  
  // Priority queue (min-heap based on fScore)
  const openSet: PathState[] = [{
    nodeId: startId,
    path: [startId],
    gScore: 0,
    fScore: 0,
    riskAccum: 0,
    distanceAccum: 0,
    timeAccum: 0,
    costAccum: 0,
  }];
  
  const completedPaths: PathState[] = [];
  const visited = new Map<string, number>(); // nodeId -> best gScore
  
  while (openSet.length > 0 && completedPaths.length < 10) {
    // Get lowest fScore
    openSet.sort((a, b) => a.fScore - b.fScore);
    const current = openSet.shift()!;
    
    // Check if reached destination
    if (current.nodeId === endId) {
      completedPaths.push(current);
      continue;
    }
    
    // Check hop limit
    if (current.path.length > options.maxHops) {
      continue;
    }
    
    // Skip if we've visited with better score
    const prevScore = visited.get(current.nodeId);
    if (prevScore !== undefined && prevScore <= current.gScore) {
      continue;
    }
    visited.set(current.nodeId, current.gScore);
    
    // Explore neighbors
    const currentNode = graph.getNode(current.nodeId)!;
    
    for (const [neighborId, edge] of currentNode.edges) {
      // Skip if already in path (no cycles)
      if (current.path.includes(neighborId)) continue;
      
      // Check exclusions
      const neighborNode = graph.getNode(neighborId)!;
      if (excludeCountrySet.has(neighborNode.data.country)) continue;
      if (excludePortSet.has(neighborId)) continue;
      
      // Check risk threshold
      const newRisk = current.riskAccum + edge.riskScore;
      const avgRisk = newRisk / (current.path.length);
      if (avgRisk > options.maxRiskThreshold) continue;
      
      // Calculate edge cost based on optimization preference
      let edgeCost = 0;
      switch (options.optimizeFor) {
        case 'risk':
          edgeCost = edge.riskScore * 1000;
          break;
        case 'time':
          edgeCost = edge.data.baseTime;
          break;
        case 'cost':
          edgeCost = edge.data.baseCost;
          break;
        case 'balanced':
        default:
          edgeCost = 
            edge.data.baseTime * options.timeWeight +
            edge.data.baseCost * options.costWeight +
            edge.riskScore * options.riskWeight * 1000;
      }
      
      const newGScore = current.gScore + edgeCost;
      
      // Heuristic: straight-line distance to goal
      const heuristic = haversineDistance(
        neighborNode.data.coordinates.lat,
        neighborNode.data.coordinates.lng,
        endNode.data.coordinates.lat,
        endNode.data.coordinates.lng
      ) * 0.01; // Scale factor
      
      const newFScore = newGScore + heuristic;
      
      openSet.push({
        nodeId: neighborId,
        path: [...current.path, neighborId],
        gScore: newGScore,
        fScore: newFScore,
        riskAccum: newRisk,
        distanceAccum: current.distanceAccum + edge.data.distance,
        timeAccum: current.timeAccum + edge.data.baseTime,
        costAccum: current.costAccum + edge.data.baseCost,
      });
    }
  }
  
  // Convert to ScoredRoute format
  return completedPaths.map(pathState => {
    const pathNodes: RouteNode[] = pathState.path.map(
      id => graph.getNode(id)!.data
    );
    
    const edges: RouteEdge[] = [];
    for (let i = 0; i < pathState.path.length - 1; i++) {
      const edge = graph.getEdge(pathState.path[i], pathState.path[i + 1]);
      if (edge) {
        edges.push(edge.data);
      }
    }
    
    const avgRisk = pathState.riskAccum / Math.max(1, edges.length);
    
    // Calculate risk breakdown
    const riskBreakdown: Record<string, number> = {
      countryRisk: 0,
      chokepointRisk: 0,
      distanceRisk: pathState.distanceAccum / 20000, // Normalize by typical long route
    };
    
    for (const node of pathNodes) {
      const cr = COUNTRY_RISK[node.country] || {};
      riskBreakdown.countryRisk += (cr.political || 0) + (cr.conflict || 0);
    }
    riskBreakdown.countryRisk /= pathNodes.length;
    
    // Calculate reliability (inverse of risk variance)
    const reliability = 1 - avgRisk;
    
    return {
      path: pathNodes,
      edges,
      totalDistance: pathState.distanceAccum,
      estimatedTime: pathState.timeAccum,
      estimatedCost: pathState.costAccum,
      riskScore: avgRisk,
      riskBreakdown,
      reliability,
      score: pathState.gScore,
    };
  }).sort((a, b) => a.score - b.score);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Find optimal rerouting alternatives between two points
 */
export async function findReroutingAlternatives(
  from: string,
  to: string,
  options: Partial<ReroutingOptions> = {}
): Promise<{
  original: ScoredRoute | null;
  alternatives: ScoredRoute[];
  recommendation: string;
}> {
  const defaultOptions: ReroutingOptions = {
    optimizeFor: 'balanced',
    maxHops: 6,
    excludeCountries: [],
    excludePorts: [],
    excludeChokepoints: [],
    maxRiskThreshold: 0.8,
    timeWeight: 0.3,
    costWeight: 0.3,
    riskWeight: 0.4,
  };
  
  const opts = { ...defaultOptions, ...options };
  
  // Normalize port names to UN/LOCODE
  let fromCode = from.toUpperCase();
  let toCode = to.toUpperCase();
  
  // Try to normalize if not already UNLOCODE format
  if (!/^[A-Z]{2}[A-Z0-9]{3}$/.test(fromCode)) {
    const normalized = normalizePort(from);
    if (normalized.normalized) {
      fromCode = normalized.normalized.unlocode;
    }
  }
  
  if (!/^[A-Z]{2}[A-Z0-9]{3}$/.test(toCode)) {
    const normalized = normalizePort(to);
    if (normalized.normalized) {
      toCode = normalized.normalized.unlocode;
    }
  }
  
  // Build graph
  const graph = await buildGraph(true);
  
  // Find paths without exclusions first (original route)
  const originalPaths = await findPaths(graph, fromCode, toCode, {
    ...opts,
    excludeCountries: [],
    excludePorts: [],
    excludeChokepoints: [],
  });
  
  const original = originalPaths.length > 0 ? originalPaths[0] : null;
  
  // Find alternative paths with exclusions
  const alternatives = await findPaths(graph, fromCode, toCode, opts);
  
  // Generate recommendation
  let recommendation = 'No significant route optimization found.';
  
  if (alternatives.length > 0 && original) {
    const best = alternatives[0];
    
    if (best.riskScore < original.riskScore * 0.7) {
      recommendation = `Recommended: ${best.path.map(p => p.name).join(' → ')} reduces risk by ${Math.round((1 - best.riskScore / original.riskScore) * 100)}%`;
    } else if (best.estimatedTime < original.estimatedTime * 0.9) {
      recommendation = `Time-optimized route: ${best.path.map(p => p.name).join(' → ')} saves ${Math.round(original.estimatedTime - best.estimatedTime)} hours`;
    } else if (best.estimatedCost < original.estimatedCost * 0.85) {
      recommendation = `Cost-optimized route available with ${Math.round((1 - best.estimatedCost / original.estimatedCost) * 100)}% savings`;
    }
  } else if (alternatives.length > 0) {
    const best = alternatives[0];
    recommendation = `Best available route: ${best.path.map(p => p.name).join(' → ')} with risk score ${(best.riskScore * 100).toFixed(1)}%`;
  }
  
  return { original, alternatives, recommendation };
}

/**
 * Get resilience analysis for a route
 */
export async function analyzeRouteResilience(
  routePath: string[]
): Promise<{
  overallResilience: number;
  vulnerabilities: Array<{ node: string; risk: string; score: number }>;
  redundancyScore: number;
  recommendations: string[];
}> {
  const vulnerabilities: Array<{ node: string; risk: string; score: number }> = [];
  const recommendations: string[] = [];
  
  let totalRisk = 0;
  
  for (const portId of routePath) {
    const port = getPortByUnlocode(portId);
    if (!port) continue;
    
    const countryRisk = COUNTRY_RISK[port.country] || {};
    
    // Check each risk factor
    if ((countryRisk.political || 0) > 0.5) {
      vulnerabilities.push({
        node: port.name,
        risk: 'Political instability',
        score: countryRisk.political || 0,
      });
    }
    
    if ((countryRisk.conflict || 0) > 0.3) {
      vulnerabilities.push({
        node: port.name,
        risk: 'Conflict zone proximity',
        score: countryRisk.conflict || 0,
      });
    }
    
    if ((countryRisk.sanctions || 0) > 0.5) {
      vulnerabilities.push({
        node: port.name,
        risk: 'Sanctions risk',
        score: countryRisk.sanctions || 0,
      });
      recommendations.push(`Consider alternative to ${port.name} due to sanctions risk`);
    }
    
    if ((countryRisk.piracy || 0) > 0.3) {
      vulnerabilities.push({
        node: port.name,
        risk: 'Piracy risk',
        score: countryRisk.piracy || 0,
      });
    }
    
    totalRisk += Object.values(countryRisk).reduce((a, b) => a + (b || 0), 0);
  }
  
  // Calculate overall resilience (inverse of avg risk)
  const avgRisk = totalRisk / Math.max(1, routePath.length * 5);
  const overallResilience = Math.max(0, 1 - avgRisk);
  
  // Redundancy score based on path length and alternatives
  const redundancyScore = routePath.length >= 3 ? 0.7 : 0.4;
  
  // Add general recommendations
  if (overallResilience < 0.5) {
    recommendations.push('Route has significant vulnerabilities - consider diversification');
  }
  
  if (vulnerabilities.length > routePath.length / 2) {
    recommendations.push('Multiple high-risk nodes detected - review each segment');
  }
  
  return {
    overallResilience,
    vulnerabilities: vulnerabilities.sort((a, b) => b.score - a.score),
    redundancyScore,
    recommendations,
  };
}

/**
 * Get list of critical chokepoints with current risk levels
 */
export function getChokepointRisks(): Array<{
  id: string;
  name: string;
  risk: number;
  alternatives: string[];
}> {
  const chokepoints = [
    { id: 'suez', name: 'Suez Canal', alternatives: ['Cape of Good Hope'] },
    { id: 'panama', name: 'Panama Canal', alternatives: ['Cape Horn', 'Suez + Indian Ocean'] },
    { id: 'hormuz', name: 'Strait of Hormuz', alternatives: ['Overland pipelines'] },
    { id: 'malacca', name: 'Strait of Malacca', alternatives: ['Lombok Strait', 'Sunda Strait'] },
    { id: 'bab_el_mandeb', name: 'Bab el-Mandeb', alternatives: ['Cape of Good Hope'] },
    { id: 'singapore', name: 'Singapore Strait', alternatives: ['Lombok Strait'] },
    { id: 'gibraltar', name: 'Strait of Gibraltar', alternatives: ['Northern European route'] },
    { id: 'bosphorus', name: 'Bosphorus Strait', alternatives: ['Overland rail'] },
  ];
  
  return chokepoints.map(cp => ({
    ...cp,
    risk: CHOKEPOINT_RISK[cp.id] || 0,
  }));
}
