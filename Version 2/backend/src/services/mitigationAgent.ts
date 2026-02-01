// backend/src/services/mitigationAgent.ts
// Agent C: Mitigation & Alternative Recommendation Agent
// Suggests alternative suppliers, routes, and generates action plans

import { runQuery } from '../lib/neo4j';
import { getDriver } from '../lib/neo4j';
import { RiskScore, calculateCompanyRisk, calculatePortRisk } from './riskEngine';

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
  path: { id: string; name: string; type: string }[];
  totalHops: number;
  riskScore: number;
  avoidedRisks: string[];
  estimatedDelay: number; // days
  recommendation: {
    score: number;
    reasons: string[];
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
 */
export async function findAlternativeRoutes(
  fromId: string,
  toId: string,
  excludeCountries: string[] = [],
  maxHops: number = 5
): Promise<AlternativeRoute[]> {
  if (!getDriver()) return [];

  const cypher = `
    MATCH (start {id: $fromId})
    MATCH (end {id: $toId})
    
    // Find paths avoiding excluded countries
    MATCH path = shortestPath((start)-[:USES|TRANSITS*1..${maxHops}]-(end))
    
    // Filter paths not going through excluded countries
    WHERE ALL(node IN nodes(path) WHERE 
      NOT (node.countryCode IN $excludeCountries)
    )
    
    // Get risk info for path
    UNWIND nodes(path) AS pathNode
    OPTIONAL MATCH (e:Event)-[:AFFECTS]->(pathNode)
    
    WITH path, collect(DISTINCT e.severity) AS severities, nodes(path) AS pathNodes
    
    RETURN 
      [n IN pathNodes | {id: n.id, name: n.name, type: labels(n)[0]}] AS nodes,
      length(path) AS hops,
      CASE WHEN size(severities) > 0 
           THEN reduce(s = 0, x IN severities | s + COALESCE(x, 0)) / size(severities)
           ELSE 0 
      END AS avgRisk
    ORDER BY avgRisk ASC, hops ASC
    LIMIT 5
  `;

  try {
    const results = await runQuery(cypher, {
      fromId,
      toId,
      excludeCountries,
    });

    return results.map((r: any, idx: number) => ({
      id: `route-alt-${idx}`,
      path: r.nodes || [],
      totalHops: r.hops || 0,
      riskScore: Math.round((r.avgRisk || 0) * 10),
      avoidedRisks: excludeCountries.map(c => `Avoiding ${c}`),
      estimatedDelay: (r.hops || 1) * 2, // Rough estimate: 2 days per hop
      recommendation: {
        score: Math.max(0, 100 - (r.avgRisk || 0) * 10 - (r.hops || 0) * 5),
        reasons: [
          r.avgRisk < 3 ? 'Low risk route' : 'Moderate risk route',
          `${r.hops} transit points`,
        ],
      },
    }));
  } catch (err) {
    console.error('Error finding alternative routes:', err);
    return [];
  }
}

/**
 * Generate a mitigation plan for an at-risk entity
 */
export async function generateMitigationPlan(
  entityId: string,
  entityType: 'company' | 'port'
): Promise<MitigationPlan | null> {
  if (!getDriver()) return null;

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

  // Generate actions based on risk factors
  for (const factor of currentRisk.factors) {
    if (factor.type === 'event' && factor.severity >= 7) {
      actions.push({
        priority: 'immediate',
        action: 'Activate contingency suppliers',
        description: `High-severity events (${factor.severity}/10) detected. Consider activating backup suppliers immediately.`,
        impact: 'high',
        effort: 'medium',
      });
    }

    if (factor.type === 'geopolitical') {
      actions.push({
        priority: 'short-term',
        action: 'Diversify geographic exposure',
        description: 'Entity located in geopolitical hotspot. Consider sourcing from alternative regions.',
        impact: 'high',
        effort: 'high',
      });
    }

    if (factor.type === 'concentration') {
      actions.push({
        priority: 'long-term',
        action: 'Reduce supply chain concentration',
        description: 'High dependency on single routes/suppliers. Develop multi-source strategy.',
        impact: 'medium',
        effort: 'high',
      });
    }

    if (factor.type === 'weather') {
      actions.push({
        priority: 'short-term',
        action: 'Monitor weather forecasts',
        description: `Seasonal weather risk elevated. Monitor forecasts and prepare for potential delays.`,
        impact: 'medium',
        effort: 'low',
      });
    }
  }

  // Add generic actions based on risk level
  if (currentRisk.riskLevel === 'critical') {
    actions.unshift({
      priority: 'immediate',
      action: 'Escalate to leadership',
      description: 'Critical risk level detected. Immediate executive attention required.',
      impact: 'high',
      effort: 'low',
    });
  }

  // Find alternatives if entity is a company
  if (entityType === 'company') {
    // Get high-risk countries to exclude
    const highRiskCountries = currentRisk.factors
      .filter(f => f.type === 'geopolitical')
      .length > 0 ? ['TW', 'UA', 'RU'] : [];

    alternativeSuppliers = await findAlternativeSuppliers(entityId, undefined, highRiskCountries);
  }

  // Calculate estimated risk reduction
  const bestAlternativeScore = alternativeSuppliers.length > 0
    ? Math.min(...alternativeSuppliers.map(s => s.riskScore))
    : currentRisk.riskScore;
  const estimatedRiskReduction = Math.max(0, currentRisk.riskScore - bestAlternativeScore);

  return {
    entityId,
    entityName: currentRisk.entityName,
    entityType,
    currentRisk,
    actions: actions.slice(0, 5), // Top 5 actions
    alternativeSuppliers: alternativeSuppliers.slice(0, 5),
    alternativeRoutes,
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
  if (!getDriver() || entityIds.length === 0) return [];

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
