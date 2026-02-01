// backend/src/services/riskEngine.ts
// Agent B: Risk Prediction Engine
// Analyzes graph patterns and calculates risk scores for supply chain entities

import { runQuery } from '../lib/neo4j';
import { getDriver } from '../lib/neo4j';

// Utility to convert Neo4j BigInt to Number
function toNumber(value: any): number {
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return value;
  return 0;
}

export interface RiskScore {
  entityId: string;
  entityType: 'company' | 'port' | 'route' | 'country';
  entityName: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  factors: RiskFactor[];
  trend: 'improving' | 'stable' | 'worsening';
  prediction7d: number;
  prediction30d: number;
  updatedAt: string;
}

export interface RiskFactor {
  type: 'event' | 'proximity' | 'concentration' | 'geopolitical' | 'weather';
  description: string;
  severity: number; // 1-10
  weight: number; // contribution to total score
}

// Event type severity weights
const EVENT_SEVERITY_WEIGHTS: Record<string, number> = {
  war: 10,
  conflict: 9,
  earthquake: 8,
  hurricane: 8,
  tsunami: 9,
  flood: 6,
  storm: 5,
  protest: 4,
  strike: 5,
  sanctions: 7,
  tariff: 6,
  political: 5,
  infrastructure: 6,
  default: 5,
};

// High-risk regions with baseline risk scores
const GEOPOLITICAL_HOTSPOTS: Record<string, number> = {
  TW: 8, // Taiwan - cross-strait tensions
  UA: 9, // Ukraine - active conflict
  RU: 7, // Russia - sanctions
  CN: 5, // China - trade tensions
  IR: 7, // Iran - sanctions
  KP: 8, // North Korea
  IL: 6, // Israel - regional tensions
  YE: 8, // Yemen - conflict
  MM: 6, // Myanmar - instability
  SY: 9, // Syria - conflict
};

// Seasonal risk factors (month -> regions affected)
const SEASONAL_RISKS: Record<number, { regions: string[]; factor: string; multiplier: number }[]> = {
  6: [{ regions: ['TW', 'JP', 'PH', 'CN'], factor: 'Typhoon season begins', multiplier: 1.3 }],
  7: [{ regions: ['TW', 'JP', 'PH', 'CN', 'VN'], factor: 'Peak typhoon season', multiplier: 1.5 }],
  8: [{ regions: ['TW', 'JP', 'PH', 'CN', 'VN'], factor: 'Peak typhoon season', multiplier: 1.5 }],
  9: [{ regions: ['TW', 'JP', 'PH', 'CN', 'VN'], factor: 'Typhoon season', multiplier: 1.4 }],
  10: [{ regions: ['TW', 'JP', 'PH'], factor: 'Late typhoon season', multiplier: 1.2 }],
  1: [{ regions: ['US', 'CA'], factor: 'Winter storms', multiplier: 1.2 }],
  2: [{ regions: ['US', 'CA'], factor: 'Winter storms', multiplier: 1.2 }],
};

/**
 * Calculate risk score for a company
 */
export async function calculateCompanyRisk(companyId: string): Promise<RiskScore | null> {
  if (!getDriver()) return null;

  const cypher = `
    MATCH (c:Company {id: $companyId})
    
    // Get direct events affecting this company
    OPTIONAL MATCH (e:Event)-[af:AFFECTS]->(c)
    WITH c, collect({
      id: e.id,
      type: e.type,
      severity: e.severity,
      title: e.title,
      distance: af.distance
    }) AS directEvents
    
    // Get events affecting connected routes
    OPTIONAL MATCH (c)-[:USES]->(r:Route)
    OPTIONAL MATCH (e2:Event)-[af2:AFFECTS]->(r)
    WITH c, directEvents, collect({
      id: e2.id,
      type: e2.type,
      severity: e2.severity,
      title: e2.title,
      routeId: r.id
    }) AS routeEvents
    
    // Get events affecting supplier chain (up to 2 hops)
    OPTIONAL MATCH (c)-[:USES|SUPPLIER_TO*1..2]-(supplier:Company)
    OPTIONAL MATCH (e3:Event)-[af3:AFFECTS]->(supplier)
    WITH c, directEvents, routeEvents, collect(DISTINCT {
      id: e3.id,
      type: e3.type,
      severity: e3.severity,
      title: e3.title,
      supplierName: supplier.name
    }) AS supplierEvents
    
    // Get country risk
    OPTIONAL MATCH (c)-[:LOCATED_IN]->(country:Country)
    
    RETURN 
      c.id AS id,
      c.name AS name,
      c.countryCode AS countryCode,
      c.lat AS lat,
      c.lng AS lng,
      directEvents,
      routeEvents,
      supplierEvents,
      country.code AS linkedCountryCode
  `;

  try {
    const results = await runQuery(cypher, { companyId });
    if (results.length === 0) return null;

    const data = results[0];
    const factors: RiskFactor[] = [];
    let totalScore = 0;

    // Factor 1: Direct events
    const directEvents = (data.directEvents || []).filter((e: any) => e.id);
    if (directEvents.length > 0) {
      const avgSeverity = directEvents.reduce((sum: number, e: any) => sum + (e.severity || 5), 0) / directEvents.length;
      const weight = Math.min(directEvents.length * 5, 30);
      factors.push({
        type: 'event',
        description: `${directEvents.length} events directly affecting location`,
        severity: avgSeverity,
        weight,
      });
      totalScore += avgSeverity * weight / 10;
    }

    // Factor 2: Route events
    const routeEvents = (data.routeEvents || []).filter((e: any) => e.id);
    if (routeEvents.length > 0) {
      const avgSeverity = routeEvents.reduce((sum: number, e: any) => sum + (e.severity || 5), 0) / routeEvents.length;
      const weight = Math.min(routeEvents.length * 3, 20);
      factors.push({
        type: 'event',
        description: `${routeEvents.length} events affecting supply routes`,
        severity: avgSeverity,
        weight,
      });
      totalScore += avgSeverity * weight / 10;
    }

    // Factor 3: Supplier chain events
    const supplierEvents = (data.supplierEvents || []).filter((e: any) => e.id);
    if (supplierEvents.length > 0) {
      const avgSeverity = supplierEvents.reduce((sum: number, e: any) => sum + (e.severity || 5), 0) / supplierEvents.length;
      const weight = Math.min(supplierEvents.length * 2, 15);
      factors.push({
        type: 'event',
        description: `${supplierEvents.length} events affecting suppliers`,
        severity: avgSeverity,
        weight,
      });
      totalScore += avgSeverity * weight / 10;
    }

    // Factor 4: Geopolitical hotspot
    const countryCode = data.countryCode || data.linkedCountryCode;
    if (countryCode && GEOPOLITICAL_HOTSPOTS[countryCode]) {
      const hotspotRisk = GEOPOLITICAL_HOTSPOTS[countryCode];
      factors.push({
        type: 'geopolitical',
        description: `Located in geopolitical hotspot region`,
        severity: hotspotRisk,
        weight: 15,
      });
      totalScore += hotspotRisk * 1.5;
    }

    // Factor 5: Seasonal risk
    const currentMonth = new Date().getMonth() + 1;
    const seasonalRisks = SEASONAL_RISKS[currentMonth] || [];
    for (const risk of seasonalRisks) {
      if (risk.regions.includes(countryCode)) {
        factors.push({
          type: 'weather',
          description: risk.factor,
          severity: Math.round(risk.multiplier * 5),
          weight: 10,
        });
        totalScore += risk.multiplier * 5;
      }
    }

    // Normalize score to 0-100
    const normalizedScore = Math.min(Math.round(totalScore), 100);
    
    // Determine risk level
    let riskLevel: RiskScore['riskLevel'] = 'low';
    if (normalizedScore >= 75) riskLevel = 'critical';
    else if (normalizedScore >= 50) riskLevel = 'high';
    else if (normalizedScore >= 25) riskLevel = 'medium';

    // Simple trend calculation (would need historical data for real trend)
    const trend: RiskScore['trend'] = totalScore > 50 ? 'worsening' : totalScore > 25 ? 'stable' : 'improving';

    // Predictions (simple decay model)
    const prediction7d = Math.max(0, normalizedScore - 5);
    const prediction30d = Math.max(0, normalizedScore - 15);

    return {
      entityId: companyId,
      entityType: 'company',
      entityName: data.name || 'Unknown',
      riskLevel,
      riskScore: normalizedScore,
      factors,
      trend,
      prediction7d,
      prediction30d,
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error calculating company risk:', err);
    return null;
  }
}

/**
 * Calculate risk score for a port
 */
export async function calculatePortRisk(portId: string): Promise<RiskScore | null> {
  if (!getDriver()) return null;

  const cypher = `
    MATCH (p:Port {id: $portId})
    
    // Get events affecting this port
    OPTIONAL MATCH (e:Event)-[af:AFFECTS]->(p)
    WITH p, collect({
      id: e.id,
      type: e.type,
      severity: e.severity,
      title: e.title,
      distance: af.distance
    }) AS events
    
    // Get route count through this port
    OPTIONAL MATCH (r:Route)-[:TRANSITS]->(p)
    WITH p, events, count(DISTINCT r) AS routeCount
    
    // Get country
    OPTIONAL MATCH (p)-[:LOCATED_IN]->(country:Country)
    
    RETURN 
      p.id AS id,
      p.name AS name,
      p.countryCode AS countryCode,
      events,
      routeCount,
      country.code AS linkedCountryCode
  `;

  try {
    const results = await runQuery(cypher, { portId });
    if (results.length === 0) return null;

    const data = results[0];
    const factors: RiskFactor[] = [];
    let totalScore = 0;

    // Factor 1: Direct events
    const events = (data.events || []).filter((e: any) => e.id);
    if (events.length > 0) {
      const avgSeverity = events.reduce((sum: number, e: any) => sum + (e.severity || 5), 0) / events.length;
      const weight = Math.min(events.length * 8, 40);
      factors.push({
        type: 'event',
        description: `${events.length} events affecting port`,
        severity: avgSeverity,
        weight,
      });
      totalScore += avgSeverity * weight / 10;
    }

    // Factor 2: Concentration risk (how many routes depend on this port)
    // Convert BigInt to Number if needed (Neo4j can return BigInt)
    const routeCount = toNumber(data.routeCount);
    if (routeCount > 5) {
      factors.push({
        type: 'concentration',
        description: `${routeCount} routes depend on this port (high concentration)`,
        severity: Math.min(routeCount, 10),
        weight: 15,
      });
      totalScore += Math.min(routeCount, 10) * 1.5;
    }

    // Factor 3: Geopolitical
    const countryCode = data.countryCode || data.linkedCountryCode;
    if (countryCode && GEOPOLITICAL_HOTSPOTS[countryCode]) {
      const hotspotRisk = GEOPOLITICAL_HOTSPOTS[countryCode];
      factors.push({
        type: 'geopolitical',
        description: `Port in geopolitical hotspot`,
        severity: hotspotRisk,
        weight: 20,
      });
      totalScore += hotspotRisk * 2;
    }

    const normalizedScore = Math.min(Math.round(totalScore), 100);
    
    let riskLevel: RiskScore['riskLevel'] = 'low';
    if (normalizedScore >= 75) riskLevel = 'critical';
    else if (normalizedScore >= 50) riskLevel = 'high';
    else if (normalizedScore >= 25) riskLevel = 'medium';

    const trend: RiskScore['trend'] = totalScore > 50 ? 'worsening' : 'stable';

    return {
      entityId: portId,
      entityType: 'port',
      entityName: data.name || 'Unknown',
      riskLevel,
      riskScore: normalizedScore,
      factors,
      trend,
      prediction7d: Math.max(0, normalizedScore - 5),
      prediction30d: Math.max(0, normalizedScore - 15),
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error calculating port risk:', err);
    return null;
  }
}

/**
 * Calculate risk for a country
 */
export async function calculateCountryRisk(countryCode: string): Promise<RiskScore | null> {
  if (!getDriver()) return null;

  const cypher = `
    MATCH (c:Country {code: $countryCode})
    
    // Get events in this country
    OPTIONAL MATCH (e:Event)-[:OCCURRED_IN]->(c)
    WITH c, collect({
      id: e.id,
      type: e.type,
      severity: e.severity,
      title: e.title
    }) AS events
    
    // Get companies/ports in this country
    OPTIONAL MATCH (entity)-[:LOCATED_IN]->(c)
    WHERE entity:Company OR entity:Port
    WITH c, events, count(DISTINCT entity) AS entityCount
    
    RETURN 
      c.code AS code,
      c.name AS name,
      events,
      entityCount
  `;

  try {
    const results = await runQuery(cypher, { countryCode });
    if (results.length === 0) return null;

    const data = results[0];
    const factors: RiskFactor[] = [];
    let totalScore = 0;

    // Factor 1: Events in country
    const events = (data.events || []).filter((e: any) => e.id);
    if (events.length > 0) {
      const avgSeverity = events.reduce((sum: number, e: any) => sum + (e.severity || 5), 0) / events.length;
      const weight = Math.min(events.length * 5, 40);
      factors.push({
        type: 'event',
        description: `${events.length} active events in country`,
        severity: avgSeverity,
        weight,
      });
      totalScore += avgSeverity * weight / 10;
    }

    // Factor 2: Baseline geopolitical risk
    if (GEOPOLITICAL_HOTSPOTS[countryCode]) {
      const hotspotRisk = GEOPOLITICAL_HOTSPOTS[countryCode];
      factors.push({
        type: 'geopolitical',
        description: 'Known geopolitical hotspot',
        severity: hotspotRisk,
        weight: 30,
      });
      totalScore += hotspotRisk * 3;
    }

    // Factor 3: Supply chain importance
    // Convert BigInt to Number if needed (Neo4j can return BigInt)
    const entityCount = toNumber(data.entityCount);
    if (entityCount > 3) {
      factors.push({
        type: 'concentration',
        description: `${entityCount} supply chain entities in country`,
        severity: Math.min(entityCount, 10),
        weight: 15,
      });
      totalScore += Math.min(entityCount / 2, 10);
    }

    const normalizedScore = Math.min(Math.round(totalScore), 100);
    
    let riskLevel: RiskScore['riskLevel'] = 'low';
    if (normalizedScore >= 75) riskLevel = 'critical';
    else if (normalizedScore >= 50) riskLevel = 'high';
    else if (normalizedScore >= 25) riskLevel = 'medium';

    return {
      entityId: countryCode,
      entityType: 'country',
      entityName: data.name || countryCode,
      riskLevel,
      riskScore: normalizedScore,
      factors,
      trend: totalScore > 40 ? 'worsening' : 'stable',
      prediction7d: Math.max(0, normalizedScore - 3),
      prediction30d: Math.max(0, normalizedScore - 10),
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error calculating country risk:', err);
    return null;
  }
}

/**
 * Get all entities above a risk threshold
 */
export async function getHighRiskEntities(minScore: number = 50): Promise<RiskScore[]> {
  if (!getDriver()) return [];

  // Get all companies and ports with events affecting them
  const cypher = `
    MATCH (e:Event)-[:AFFECTS]->(target)
    WHERE target:Company OR target:Port
    WITH target, collect(e) AS events, max(e.severity) AS maxSeverity
    WHERE maxSeverity >= $minSeverity
    RETURN 
      target.id AS id,
      target.name AS name,
      labels(target)[0] AS type,
      target.countryCode AS countryCode,
      size(events) AS eventCount,
      maxSeverity
    ORDER BY maxSeverity DESC, eventCount DESC
    LIMIT 20
  `;

  try {
    const results = await runQuery(cypher, { minSeverity: minScore / 10 });
    
    // Calculate full risk for each
    const risks: RiskScore[] = [];
    for (const r of results) {
      let risk: RiskScore | null = null;
      if (r.type === 'Company') {
        risk = await calculateCompanyRisk(r.id);
      } else if (r.type === 'Port') {
        risk = await calculatePortRisk(r.id);
      }
      if (risk && risk.riskScore >= minScore) {
        risks.push(risk);
      }
    }

    return risks.sort((a, b) => b.riskScore - a.riskScore);
  } catch (err) {
    console.error('Error getting high risk entities:', err);
    return [];
  }
}

/**
 * Calculate overall supply chain health score
 */
export async function getSupplyChainHealth(): Promise<{
  overallScore: number;
  healthLevel: 'healthy' | 'warning' | 'degraded' | 'critical';
  criticalCount: number;
  highRiskCount: number;
  activeEvents: number;
  topRisks: { name: string; score: number; type: string }[];
}> {
  if (!getDriver()) {
    return {
      overallScore: 100,
      healthLevel: 'healthy',
      criticalCount: 0,
      highRiskCount: 0,
      activeEvents: 0,
      topRisks: [],
    };
  }

  const cypher = `
    // Count events by severity
    MATCH (e:Event)
    WITH count(e) AS totalEvents,
         sum(CASE WHEN e.severity >= 8 THEN 1 ELSE 0 END) AS criticalEvents,
         sum(CASE WHEN e.severity >= 5 AND e.severity < 8 THEN 1 ELSE 0 END) AS highEvents
    
    // Count affected entities
    MATCH (e2:Event)-[:AFFECTS]->(target)
    WITH totalEvents, criticalEvents, highEvents,
         count(DISTINCT target) AS affectedEntities
    
    RETURN totalEvents, criticalEvents, highEvents, affectedEntities
  `;

  try {
    const results = await runQuery(cypher);
    const data = results[0] || { totalEvents: 0, criticalEvents: 0, highEvents: 0, affectedEntities: 0 };

    // Calculate health score (inverse of risk)
    const riskPenalty = (data.criticalEvents * 10) + (data.highEvents * 5) + (data.affectedEntities * 2);
    const overallScore = Math.max(0, 100 - riskPenalty);

    let healthLevel: 'healthy' | 'warning' | 'degraded' | 'critical' = 'healthy';
    if (overallScore < 25) healthLevel = 'critical';
    else if (overallScore < 50) healthLevel = 'degraded';
    else if (overallScore < 75) healthLevel = 'warning';

    // Get top risks
    const highRisks = await getHighRiskEntities(40);
    const topRisks = highRisks.slice(0, 5).map(r => ({
      name: r.entityName,
      score: r.riskScore,
      type: r.entityType,
    }));

    return {
      overallScore: Math.round(overallScore),
      healthLevel,
      criticalCount: data.criticalEvents || 0,
      highRiskCount: data.highEvents || 0,
      activeEvents: data.totalEvents || 0,
      topRisks,
    };
  } catch (err) {
    console.error('Error calculating supply chain health:', err);
    return {
      overallScore: 100,
      healthLevel: 'healthy',
      criticalCount: 0,
      highRiskCount: 0,
      activeEvents: 0,
      topRisks: [],
    };
  }
}
