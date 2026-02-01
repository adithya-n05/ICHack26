// backend/src/services/mitigationAgent.ts
// Agent C: Mitigation & Alternative Recommendation Agent
// Suggests alternative suppliers, routes, and generates action plans

import { runQuery } from '../lib/neo4j';
import { getDriver } from '../lib/neo4j';
import { RiskScore, calculateCompanyRisk, calculatePortRisk } from './riskEngine';
import { 
  findReroutingAlternatives, 
  getChokepointRisks, 
  analyzeRouteResilience,
  ScoredRoute,
  ReroutingOptions 
} from './rerouting';
import { complete as llmComplete } from './llmService';

export interface AlternativeSupplier {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  country: string;
  countryCode: string;
  products: string[];
  riskScore: number;
  distanceFromOriginal: number; // km
  recommendation: {
    score: number; // 1-100
    reasons: string[];
    concerns: string[];
  };
}

export interface AlternativeRoute {
  id: string;
  path: { id: string; name: string; type: string; country?: string }[];
  totalHops: number;
  riskScore: number;
  avoidedRisks: string[];
  estimatedDelay: number; // days
  estimatedTimeHours: number;
  totalDistanceKm: number;
  transportMode: 'sea' | 'air' | 'multimodal';
  chokepoints: string[];
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
  actions: MitigationAction[];
  alternativeSuppliers: AlternativeSupplier[];
  alternativeRoutes: AlternativeRoute[];
  estimatedRiskReduction: number;
  generatedAt: string;
}

export interface MitigationAction {
  priority: 'immediate' | 'short-term' | 'long-term';
  action: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
}

/**
 * Find alternative suppliers for a given material/product category
 */
export async function findAlternativeSuppliers(
  companyId: string,
  productCategory?: string,
  excludeCountries: string[] = []
): Promise<AlternativeSupplier[]> {
  if (!getDriver()) return [];

  const cypher = `
    // Get the original company
    MATCH (original:Company {id: $companyId})
    
    // Find other companies with similar products, not in excluded countries
    MATCH (alt:Company)
    WHERE alt.id <> $companyId
      AND (alt.countryCode IS NULL OR NOT alt.countryCode IN $excludeCountries)
      AND (
        $productCategory IS NULL 
        OR any(p IN alt.products WHERE toLower(p) CONTAINS toLower($productCategory))
        OR any(p IN original.products WHERE any(ap IN alt.products WHERE toLower(ap) CONTAINS toLower(p)))
      )
    
    // Calculate distance
    WITH original, alt,
         point.distance(
           point({latitude: original.lat, longitude: original.lng}),
           point({latitude: alt.lat, longitude: alt.lng})
         ) / 1000 AS distanceKm
    
    // Get events affecting alternative
    OPTIONAL MATCH (e:Event)-[:AFFECTS]->(alt)
    WITH alt, distanceKm, count(e) AS eventCount, max(e.severity) AS maxSeverity
    
    RETURN 
      alt.id AS id,
      alt.name AS name,
      alt.lat AS lat,
      alt.lng AS lng,
      alt.country AS country,
      alt.countryCode AS countryCode,
      alt.products AS products,
      alt.type AS type,
      distanceKm,
      eventCount,
      COALESCE(maxSeverity, 0) AS maxSeverity
    ORDER BY eventCount ASC, maxSeverity ASC, distanceKm ASC
    LIMIT 10
  `;

  try {
    const results = await runQuery(cypher, {
      companyId,
      productCategory: productCategory || null,
      excludeCountries,
    });

    return results.map((r: any) => {
      // Calculate recommendation score
      let score = 70; // Base score
      const reasons: string[] = [];
      const concerns: string[] = [];

      // Lower risk = higher score
      if (r.eventCount === 0) {
        score += 15;
        reasons.push('No active disruption events');
      } else {
        score -= r.eventCount * 5;
        concerns.push(`${r.eventCount} events affecting this supplier`);
      }

      // Geographic diversification bonus
      if (!excludeCountries.includes(r.countryCode)) {
        score += 10;
        reasons.push('Located outside high-risk regions');
      }

      // Distance penalty (prefer closer alternatives)
      if (r.distanceKm < 1000) {
        score += 5;
        reasons.push('Relatively close proximity');
      } else if (r.distanceKm > 5000) {
        score -= 5;
        concerns.push('Significant shipping distance');
      }

      return {
        id: r.id,
        name: r.name,
        location: { lat: r.lat, lng: r.lng },
        country: r.country || 'Unknown',
        countryCode: r.countryCode || '',
        products: r.products || [],
        riskScore: Math.min((r.eventCount * 10) + (r.maxSeverity * 5), 100),
        distanceFromOriginal: Math.round(r.distanceKm || 0),
        recommendation: {
          score: Math.max(0, Math.min(100, score)),
          reasons,
          concerns,
        },
      };
    });
  } catch (err) {
    console.error('Error finding alternative suppliers:', err);
    return [];
  }
}

/**
 * Find alternative shipping routes avoiding high-risk areas
 * Uses the graph-based A* rerouting algorithm with real port data
 */
export async function findAlternativeRoutes(
  fromId: string,
  toId: string,
  options: {
    excludeCountries?: string[];
    excludePorts?: string[];
    excludeChokepoints?: string[];
    maxHops?: number;
    includeAirFreight?: boolean;
    eventAffectedAreas?: string[];
  } = {}
): Promise<AlternativeRoute[]> {
  const {
    excludeCountries = [],
    excludePorts = [],
    excludeChokepoints = [],
    maxHops = 6,
    includeAirFreight = true,
    eventAffectedAreas = [],
  } = options;

  const alternatives: AlternativeRoute[] = [];
  
  // Get chokepoint risks to identify risky chokepoints
  const chokepointRisks = getChokepointRisks();
  const highRiskChokepoints = chokepointRisks
    .filter(cp => cp.risk > 0.5)
    .map(cp => cp.id);
  
  // Combine user exclusions with high-risk chokepoints
  const allExcludedChokepoints = [...new Set([...excludeChokepoints, ...highRiskChokepoints])];

  try {
    // Strategy 1: Optimized for risk avoidance (avoid dangerous areas)
    const riskOptimized = await findReroutingAlternatives(fromId, toId, {
      optimizeFor: 'risk',
      maxHops,
      excludeCountries: [...excludeCountries, ...eventAffectedAreas],
      excludePorts,
      excludeChokepoints: allExcludedChokepoints,
      maxRiskThreshold: 0.6,
      riskWeight: 0.6,
      timeWeight: 0.2,
      costWeight: 0.2,
    });

    if (riskOptimized.alternatives.length > 0) {
      for (let i = 0; i < Math.min(2, riskOptimized.alternatives.length); i++) {
        const route = riskOptimized.alternatives[i];
        alternatives.push(convertToAlternativeRoute(route, 'risk-optimized', allExcludedChokepoints, i));
      }
    }

    // Strategy 2: Time-optimized (fastest route avoiding affected areas)
    const timeOptimized = await findReroutingAlternatives(fromId, toId, {
      optimizeFor: 'time',
      maxHops: maxHops + 1, // Allow one extra hop for speed
      excludeCountries: eventAffectedAreas, // Only avoid event-affected areas
      excludePorts,
      excludeChokepoints,
      maxRiskThreshold: 0.75,
      riskWeight: 0.3,
      timeWeight: 0.5,
      costWeight: 0.2,
    });

    if (timeOptimized.alternatives.length > 0) {
      const route = timeOptimized.alternatives[0];
      // Only add if it's different from risk-optimized routes
      const pathKey = route.path.map(p => p.id).join('-');
      const existingPaths = alternatives.map(a => a.path.map(p => p.id).join('-'));
      if (!existingPaths.includes(pathKey)) {
        alternatives.push(convertToAlternativeRoute(route, 'time-optimized', excludeChokepoints, alternatives.length));
      }
    }

    // Strategy 3: Cost-optimized (cheapest reliable route)
    const costOptimized = await findReroutingAlternatives(fromId, toId, {
      optimizeFor: 'cost',
      maxHops,
      excludeCountries: eventAffectedAreas,
      excludePorts,
      excludeChokepoints,
      maxRiskThreshold: 0.7,
      riskWeight: 0.25,
      timeWeight: 0.25,
      costWeight: 0.5,
    });

    if (costOptimized.alternatives.length > 0) {
      const route = costOptimized.alternatives[0];
      const pathKey = route.path.map(p => p.id).join('-');
      const existingPaths = alternatives.map(a => a.path.map(p => p.id).join('-'));
      if (!existingPaths.includes(pathKey)) {
        alternatives.push(convertToAlternativeRoute(route, 'cost-optimized', excludeChokepoints, alternatives.length));
      }
    }

    // Strategy 4: Add air freight option for urgent shipments
    if (includeAirFreight && alternatives.length > 0) {
      const airRoute = generateAirFreightOption(fromId, toId, alternatives[0]);
      if (airRoute) {
        alternatives.push(airRoute);
      }
    }

  } catch (err) {
    console.error('Error finding alternative routes:', err);
  }

  // Sort by recommendation score
  return alternatives.sort((a, b) => b.recommendation.score - a.recommendation.score);
}

/**
 * Convert ScoredRoute to AlternativeRoute format
 */
function convertToAlternativeRoute(
  route: ScoredRoute,
  strategy: string,
  avoidedChokepoints: string[],
  index: number
): AlternativeRoute {
  const reasons: string[] = [];
  const concerns: string[] = [];

  // Analyze route characteristics
  if (route.riskScore < 0.3) {
    reasons.push('Low overall risk score');
  } else if (route.riskScore < 0.5) {
    reasons.push('Moderate risk level');
  } else {
    concerns.push('Elevated risk - monitor closely');
  }

  if (avoidedChokepoints.length > 0) {
    reasons.push(`Avoids ${avoidedChokepoints.length} high-risk chokepoints`);
  }

  if (route.path.length <= 3) {
    reasons.push('Direct route with minimal stopovers');
  } else if (route.path.length >= 5) {
    concerns.push('Multiple transshipment points increase handling risk');
  }

  if (route.reliability > 0.7) {
    reasons.push('High reliability score');
  }

  // Estimate delay compared to direct route
  const baselineTime = route.totalDistance / 800; // Rough: 800km/day avg shipping
  const estimatedDelay = Math.max(0, (route.estimatedTime / 24) - baselineTime);

  // Calculate recommendation score (0-100)
  let score = 70; // Base score
  score -= route.riskScore * 30; // Risk penalty
  score += route.reliability * 20; // Reliability bonus
  score -= (route.path.length - 2) * 3; // Hop penalty
  score = Math.max(10, Math.min(95, score)); // Clamp

  // Identify chokepoints in route
  const routeChokepoints = identifyChokepointsInRoute(route);

  return {
    id: `route-${strategy}-${index}`,
    path: route.path.map(node => ({
      id: node.id || node.unlocode || '',
      name: node.name,
      type: node.type,
      country: node.country,
    })),
    totalHops: route.path.length - 1,
    riskScore: Math.round(route.riskScore * 100),
    avoidedRisks: avoidedChokepoints.map(cp => `Avoids ${formatChokepointName(cp)}`),
    estimatedDelay: Math.round(estimatedDelay),
    estimatedTimeHours: Math.round(route.estimatedTime),
    totalDistanceKm: Math.round(route.totalDistance),
    transportMode: 'sea',
    chokepoints: routeChokepoints,
    recommendation: {
      score: Math.round(score),
      reasons,
      concerns,
    },
  };
}

/**
 * Identify chokepoints that a route passes through
 */
function identifyChokepointsInRoute(route: ScoredRoute): string[] {
  const chokepoints: string[] = [];
  const portCountries = route.path.map(p => p.country);
  
  // Check for common chokepoint countries
  if (portCountries.includes('EG') || portCountries.includes('Egypt')) {
    chokepoints.push('Suez Canal');
  }
  if (portCountries.includes('PA') || portCountries.includes('Panama')) {
    chokepoints.push('Panama Canal');
  }
  if (portCountries.includes('SG') || portCountries.includes('Singapore')) {
    chokepoints.push('Singapore Strait / Malacca');
  }
  if (portCountries.includes('YE') || portCountries.includes('DJ') || portCountries.includes('Yemen') || portCountries.includes('Djibouti')) {
    chokepoints.push('Bab el-Mandeb');
  }
  
  return chokepoints;
}

/**
 * Format chokepoint ID to human-readable name
 */
function formatChokepointName(id: string): string {
  const names: Record<string, string> = {
    'suez': 'Suez Canal',
    'panama': 'Panama Canal',
    'hormuz': 'Strait of Hormuz',
    'malacca': 'Strait of Malacca',
    'bab_el_mandeb': 'Bab el-Mandeb Strait',
    'singapore': 'Singapore Strait',
    'gibraltar': 'Strait of Gibraltar',
    'bosphorus': 'Bosphorus Strait',
    'cape_good_hope': 'Cape of Good Hope',
  };
  return names[id] || id;
}

/**
 * Generate air freight option for urgent shipments
 */
function generateAirFreightOption(
  fromId: string,
  toId: string,
  referenceSeaRoute: AlternativeRoute
): AlternativeRoute | null {
  // Air freight is typically 10-15x faster but 4-6x more expensive
  const seaTimeHours = referenceSeaRoute.estimatedTimeHours || 500;
  const airTimeHours = Math.max(24, seaTimeHours / 12); // Much faster
  
  // Only suggest if sea route takes more than 5 days
  if (seaTimeHours < 120) {
    return null;
  }

  return {
    id: 'route-air-freight-0',
    path: [
      { id: fromId, name: `Air Hub near ${fromId}`, type: 'airport' },
      { id: toId, name: `Air Hub near ${toId}`, type: 'airport' },
    ],
    totalHops: 1,
    riskScore: 15, // Air freight typically lower logistical risk
    avoidedRisks: [
      'Avoids all maritime chokepoints',
      'No weather/piracy delays',
      'No port congestion',
    ],
    estimatedDelay: 0,
    estimatedTimeHours: Math.round(airTimeHours),
    totalDistanceKm: referenceSeaRoute.totalDistanceKm * 0.7, // Air is more direct
    transportMode: 'air',
    chokepoints: [],
    recommendation: {
      score: 75,
      reasons: [
        `${Math.round(seaTimeHours / airTimeHours)}x faster than sea freight`,
        'Bypasses all maritime disruptions',
        'Suitable for urgent/high-value cargo',
      ],
      concerns: [
        'Significantly higher cost (4-6x sea freight)',
        'Limited to smaller shipment sizes',
        'Carbon footprint 40-50x higher',
      ],
    },
  };
}

/**
 * Generate a mitigation plan for an at-risk entity
 * Now includes specific route alternatives with real port stopovers
 */
export async function generateMitigationPlan(
  entityId: string,
  entityType: 'company' | 'port',
  context?: {
    affectedRoute?: { from: string; to: string };
    eventType?: string;
    eventLocation?: string;
    severity?: number;
  }
): Promise<MitigationPlan | null> {
  // Get current risk
  let currentRisk: RiskScore | null = null;
  if (entityType === 'company') {
    currentRisk = await calculateCompanyRisk(entityId);
  } else if (entityType === 'port') {
    currentRisk = await calculatePortRisk(entityId);
  }

  if (!currentRisk) return null;

  const actions: MitigationAction[] = [];
  let alternativeSuppliers: AlternativeSupplier[] = [];
  let alternativeRoutes: AlternativeRoute[] = [];

  // Determine high-risk areas to avoid based on current events
  const areasToAvoid: string[] = [];
  const chokepointsToAvoid: string[] = [];
  
  for (const factor of currentRisk.factors) {
    // Identify specific areas/chokepoints to avoid based on event types
    if (factor.type === 'event' || factor.type === 'geopolitical') {
      const desc = factor.description?.toLowerCase() || '';
      if (desc.includes('suez') || desc.includes('red sea')) {
        chokepointsToAvoid.push('suez', 'bab_el_mandeb');
        areasToAvoid.push('EG', 'YE', 'DJ');
      }
      if (desc.includes('malacca') || desc.includes('singapore')) {
        chokepointsToAvoid.push('malacca', 'singapore');
      }
      if (desc.includes('panama')) {
        chokepointsToAvoid.push('panama');
        areasToAvoid.push('PA');
      }
      if (desc.includes('taiwan') || desc.includes('china')) {
        areasToAvoid.push('TW', 'CN');
      }
      if (desc.includes('ukraine') || desc.includes('russia')) {
        areasToAvoid.push('UA', 'RU');
        chokepointsToAvoid.push('bosphorus');
      }
    }
  }

  // Generate specific route-based actions
  for (const factor of currentRisk.factors) {
    if (factor.type === 'event' && factor.severity >= 7) {
      // HIGH SEVERITY: Immediate rerouting needed
      if (context?.affectedRoute) {
        const routes = await findAlternativeRoutes(
          context.affectedRoute.from,
          context.affectedRoute.to,
          {
            excludeCountries: areasToAvoid,
            excludeChokepoints: chokepointsToAvoid,
            includeAirFreight: factor.severity >= 8,
            eventAffectedAreas: areasToAvoid,
          }
        );
        alternativeRoutes = routes;

        if (routes.length > 0) {
          const bestRoute = routes[0];
          const routeDescription = bestRoute.path.map(p => p.name).join(' → ');
          
          actions.push({
            priority: 'immediate',
            action: `Reroute via ${routeDescription}`,
            description: `Divert shipments through ${bestRoute.path[1]?.name || 'alternative port'}. ` +
              `This route ${bestRoute.avoidedRisks[0]?.toLowerCase() || 'avoids the affected area'}. ` +
              `Estimated transit: ${Math.round(bestRoute.estimatedTimeHours / 24)} days.`,
            impact: 'high',
            effort: 'medium',
          });

          // If very severe, also suggest air freight
          if (factor.severity >= 8 && routes.some(r => r.transportMode === 'air')) {
            const airRoute = routes.find(r => r.transportMode === 'air');
            if (airRoute) {
              actions.push({
                priority: 'immediate',
                action: 'Consider air freight for critical cargo',
                description: `Air freight available: ${Math.round(airRoute.estimatedTimeHours)} hours transit vs ${Math.round(bestRoute.estimatedTimeHours)} hours by sea. ` +
                  `Use for high-value or time-sensitive shipments.`,
                impact: 'high',
                effort: 'high',
              });
            }
          }
        }
      } else {
        // No specific route provided - give general guidance
        actions.push({
          priority: 'immediate',
          action: 'Activate contingency shipping routes',
          description: `High-severity event (${factor.severity}/10) affecting supply chain. ` +
            `Contact logistics partners to identify alternative routing options.`,
          impact: 'high',
          effort: 'medium',
        });
      }
    }

    if (factor.type === 'geopolitical') {
      // Get chokepoint alternatives
      const chokepointRisks = getChokepointRisks();
      const affectedChokepoint = chokepointRisks.find(cp => 
        factor.description?.toLowerCase().includes(cp.name.toLowerCase())
      );
      
      if (affectedChokepoint && affectedChokepoint.alternatives.length > 0) {
        actions.push({
          priority: 'short-term',
          action: `Prepare ${affectedChokepoint.alternatives[0]} routing`,
          description: `${affectedChokepoint.name} shows elevated risk (${Math.round(affectedChokepoint.risk * 100)}%). ` +
            `Alternative routes via ${affectedChokepoint.alternatives.join(' or ')} available. ` +
            `Pre-negotiate rates with carriers for rapid switching.`,
          impact: 'high',
          effort: 'medium',
        });
      } else {
        actions.push({
          priority: 'short-term',
          action: 'Diversify geographic exposure',
          description: 'Geopolitical risks elevated. Map current chokepoint dependencies and identify backup routes.',
          impact: 'high',
          effort: 'high',
        });
      }
    }

    if (factor.type === 'concentration') {
      actions.push({
        priority: 'long-term',
        action: 'Develop multi-port strategy',
        description: 'High dependency on single routes. Qualify backup ports in different regions ' +
          '(e.g., if using Singapore, also qualify Port Klang or Tanjung Pelepas).',
        impact: 'medium',
        effort: 'high',
      });
    }

    if (factor.type === 'weather') {
      actions.push({
        priority: 'short-term',
        action: 'Schedule shipments around weather windows',
        description: `Seasonal weather risk detected. Consider routing via ${
          factor.description?.toLowerCase().includes('typhoon') ? 'southern routes avoiding Pacific typhoon belt' :
          factor.description?.toLowerCase().includes('monsoon') ? 'routes avoiding Indian Ocean during monsoon' :
          'weather-safe corridors'
        }. Monitor 7-day forecasts before dispatch.`,
        impact: 'medium',
        effort: 'low',
      });
    }
  }

  // Add escalation action for critical risk
  if (currentRisk.riskLevel === 'critical') {
    actions.unshift({
      priority: 'immediate',
      action: 'Escalate to leadership & activate BCP',
      description: 'Critical risk level. Convene supply chain crisis team. ' +
        'Review business continuity plans and customer communication strategy.',
      impact: 'high',
      effort: 'low',
    });
  }

  // Find alternative suppliers if entity is a company
  if (entityType === 'company') {
    alternativeSuppliers = await findAlternativeSuppliers(entityId, undefined, areasToAvoid);
    
    if (alternativeSuppliers.length > 0 && currentRisk.riskScore > 50) {
      const bestAlt = alternativeSuppliers[0];
      actions.push({
        priority: 'short-term',
        action: `Qualify backup supplier: ${bestAlt.name}`,
        description: `${bestAlt.name} in ${bestAlt.country} identified as potential backup. ` +
          `Risk score: ${bestAlt.riskScore}/100. Begin qualification process.`,
        impact: 'high',
        effort: 'high',
      });
    }
  }

  // If we have routes, also run resilience analysis
  if (alternativeRoutes.length > 0 && alternativeRoutes[0].path.length >= 2) {
    try {
      const pathIds = alternativeRoutes[0].path.map(p => p.id);
      const resilience = await analyzeRouteResilience(pathIds);
      
      if (resilience.vulnerabilities.length > 0) {
        const topVuln = resilience.vulnerabilities[0];
        actions.push({
          priority: 'long-term',
          action: `Address vulnerability: ${topVuln.node}`,
          description: `${topVuln.node} shows ${topVuln.risk} risk (${Math.round(topVuln.score * 100)}%). ` +
            `Consider alternative transshipment points.`,
          impact: 'medium',
          effort: 'medium',
        });
      }
    } catch (err) {
      // Ignore resilience analysis errors
    }
  }

  // Calculate estimated risk reduction
  const bestRouteRisk = alternativeRoutes.length > 0
    ? alternativeRoutes[0].riskScore
    : currentRisk.riskScore;
  const bestSupplierRisk = alternativeSuppliers.length > 0
    ? alternativeSuppliers[0].riskScore
    : currentRisk.riskScore;
  const estimatedRiskReduction = Math.max(
    0,
    currentRisk.riskScore - Math.min(bestRouteRisk, bestSupplierRisk)
  );

  return {
    entityId,
    entityName: currentRisk.entityName,
    entityType,
    currentRisk,
    actions: actions.slice(0, 6), // Top 6 actions
    alternativeSuppliers: alternativeSuppliers.slice(0, 5),
    alternativeRoutes: alternativeRoutes.slice(0, 4),
    estimatedRiskReduction,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get quick mitigation suggestions for a list of affected entities
 */
export async function getQuickMitigations(entityIds: string[]): Promise<{
  entityId: string;
  quickAction: string;
  alternativeCount: number;
}[]> {
  if (entityIds.length === 0) return [];

  const suggestions: { entityId: string; quickAction: string; alternativeCount: number }[] = [];

  for (const id of entityIds.slice(0, 10)) { // Limit to 10
    const alternatives = await findAlternativeSuppliers(id, undefined, []);
    const lowRiskAlternatives = alternatives.filter(a => a.riskScore < 30);

    let quickAction = 'Monitor situation';
    if (lowRiskAlternatives.length >= 3) {
      quickAction = `${lowRiskAlternatives.length} low-risk alternatives available`;
    } else if (alternatives.length > 0) {
      quickAction = 'Limited alternatives - increase monitoring';
    } else {
      quickAction = 'No alternatives found - critical dependency';
    }

    suggestions.push({
      entityId: id,
      quickAction,
      alternativeCount: alternatives.length,
    });
  }

  return suggestions;
}

/**
 * Get route-specific mitigation when a shipping route is disrupted
 * This is the main function for getting concrete rerouting suggestions
 */
export async function getRouteMitigation(
  fromPortId: string,
  toPortId: string,
  disruptionInfo?: {
    eventType?: string;
    eventLocation?: string;
    affectedChokepoint?: string;
    severity?: number;
  }
): Promise<{
  originalRoute: string;
  disruption: string;
  alternatives: AlternativeRoute[];
  recommendation: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
}> {
  const chokepointsToAvoid: string[] = [];
  const countriesToAvoid: string[] = [];
  
  // Parse disruption info to determine what to avoid
  if (disruptionInfo) {
    if (disruptionInfo.affectedChokepoint) {
      chokepointsToAvoid.push(disruptionInfo.affectedChokepoint);
    }
    
    // Map common event locations to countries/chokepoints
    const location = disruptionInfo.eventLocation?.toLowerCase() || '';
    const eventType = disruptionInfo.eventType?.toLowerCase() || '';
    
    if (location.includes('suez') || location.includes('red sea') || location.includes('egypt')) {
      chokepointsToAvoid.push('suez', 'bab_el_mandeb');
      countriesToAvoid.push('EG', 'YE', 'DJ');
    }
    if (location.includes('panama')) {
      chokepointsToAvoid.push('panama');
    }
    if (location.includes('malacca') || location.includes('singapore') || location.includes('strait')) {
      chokepointsToAvoid.push('malacca', 'singapore');
    }
    if (location.includes('taiwan') || location.includes('china') || eventType.includes('taiwan')) {
      countriesToAvoid.push('TW', 'CN');
    }
    if (location.includes('hormuz') || location.includes('iran') || location.includes('gulf')) {
      chokepointsToAvoid.push('hormuz');
      countriesToAvoid.push('IR');
    }
    if (location.includes('black sea') || location.includes('ukraine') || location.includes('russia')) {
      chokepointsToAvoid.push('bosphorus');
      countriesToAvoid.push('UA', 'RU');
    }
  }

  // Find alternative routes
  const alternatives = await findAlternativeRoutes(fromPortId, toPortId, {
    excludeChokepoints: chokepointsToAvoid,
    excludeCountries: countriesToAvoid,
    includeAirFreight: (disruptionInfo?.severity || 5) >= 7,
    eventAffectedAreas: countriesToAvoid,
  });

  // Determine urgency
  let urgency: 'critical' | 'high' | 'medium' | 'low' = 'medium';
  if (disruptionInfo?.severity) {
    if (disruptionInfo.severity >= 8) urgency = 'critical';
    else if (disruptionInfo.severity >= 6) urgency = 'high';
    else if (disruptionInfo.severity >= 4) urgency = 'medium';
    else urgency = 'low';
  }

  // Generate recommendation text
  let recommendation = '';
  if (alternatives.length === 0) {
    recommendation = 'No viable alternative routes found. Consider air freight or delaying non-critical shipments.';
  } else {
    const best = alternatives[0];
    const routeStr = best.path.map(p => p.name).join(' → ');
    
    if (best.transportMode === 'air') {
      recommendation = `URGENT: Use air freight (${Math.round(best.estimatedTimeHours)}h transit) for critical cargo.`;
    } else {
      const avoidedStr = best.avoidedRisks.length > 0 ? ` This ${best.avoidedRisks[0].toLowerCase()}.` : '';
      recommendation = `Recommended reroute: ${routeStr}.${avoidedStr} Est. ${Math.round(best.estimatedTimeHours / 24)} days transit.`;
    }

    // Add secondary option if available
    if (alternatives.length > 1 && alternatives[1].transportMode !== alternatives[0].transportMode) {
      const secondary = alternatives[1];
      if (secondary.transportMode === 'air') {
        recommendation += ` For urgent cargo: air freight available (${Math.round(secondary.estimatedTimeHours)}h).`;
      } else {
        recommendation += ` Alternative: ${secondary.path.map(p => p.name).join(' → ')}.`;
      }
    }
  }

  // Build disruption description
  const disruptionDesc = disruptionInfo 
    ? `${disruptionInfo.eventType || 'Disruption'} at ${disruptionInfo.eventLocation || 'route'}`
    : 'Route disruption detected';

  return {
    originalRoute: `${fromPortId} → ${toPortId}`,
    disruption: disruptionDesc,
    alternatives,
    recommendation,
    urgency,
  };
}

/**
 * Get mitigation options for a specific chokepoint disruption
 */
export async function getChokepointMitigation(
  chokepointId: string,
  affectedRoutes: Array<{ from: string; to: string }>
): Promise<{
  chokepoint: string;
  riskLevel: number;
  standardAlternatives: string[];
  reroutedShipments: Array<{
    original: string;
    alternative: AlternativeRoute | null;
    recommendation: string;
  }>;
}> {
  const chokepointRisks = getChokepointRisks();
  const chokepoint = chokepointRisks.find(cp => cp.id === chokepointId);
  
  if (!chokepoint) {
    return {
      chokepoint: chokepointId,
      riskLevel: 0.5,
      standardAlternatives: [],
      reroutedShipments: [],
    };
  }

  const reroutedShipments: Array<{
    original: string;
    alternative: AlternativeRoute | null;
    recommendation: string;
  }> = [];

  for (const route of affectedRoutes.slice(0, 5)) { // Limit to 5 routes
    const alternatives = await findAlternativeRoutes(route.from, route.to, {
      excludeChokepoints: [chokepointId],
      includeAirFreight: chokepoint.risk > 0.7,
    });

    const best = alternatives.length > 0 ? alternatives[0] : null;
    const recommendation = best 
      ? `Reroute via ${best.path.map(p => p.name).join(' → ')}`
      : `No sea alternative - consider air freight or ${chokepoint.alternatives[0] || 'delay shipment'}`;

    reroutedShipments.push({
      original: `${route.from} → ${route.to}`,
      alternative: best,
      recommendation,
    });
  }

  return {
    chokepoint: chokepoint.name,
    riskLevel: chokepoint.risk,
    standardAlternatives: chokepoint.alternatives,
    reroutedShipments,
  };
}
