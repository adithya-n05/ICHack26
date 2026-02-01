// backend/src/graph/queries.ts
// Graph queries for risk analysis and routing

import { runQuery } from '../lib/neo4j';

/**
 * Get all routes affected by events above a severity threshold
 */
export async function getAffectedRoutes(minSeverity: number = 5): Promise<any[]> {
  const cypher = `
    MATCH (e:Event)-[:AFFECTS]->(target)
    WHERE e.severity >= $minSeverity
    OPTIONAL MATCH (target)<-[:TRANSITS]-(r:Route)
    OPTIONAL MATCH (target)-[:USES]->(r2:Route)
    WITH e, target, COALESCE(r, r2) AS route
    WHERE route IS NOT NULL
    RETURN DISTINCT 
      route.id AS routeId,
      route.status AS status,
      route.transportMode AS transportMode,
      collect(DISTINCT {
        eventId: e.id,
        eventType: e.type,
        eventTitle: e.title,
        severity: e.severity
      }) AS affectingEvents,
      max(e.severity) AS maxSeverity
    ORDER BY maxSeverity DESC
  `;

  return runQuery(cypher, { minSeverity });
}

/**
 * Get exposure score for a company based on graph connectivity
 * Higher score = more exposed to disruption risk
 */
export async function getCompanyExposure(companyId: string): Promise<{
  exposureScore: number;
  affectedRoutes: number;
  nearbyEvents: number;
  supplierRisk: number;
}> {
  const cypher = `
    MATCH (c:Company {id: $companyId})
    
    // Count routes this company uses
    OPTIONAL MATCH (c)-[:USES]->(r:Route)
    WITH c, count(DISTINCT r) AS routeCount
    
    // Count events affecting connected nodes
    OPTIONAL MATCH (c)-[:USES|SUPPLIER_TO*1..3]-(connected)
    OPTIONAL MATCH (e:Event)-[:AFFECTS]->(connected)
    WHERE e.severity >= 5
    WITH c, routeCount, count(DISTINCT e) AS eventCount
    
    // Count direct nearby events
    OPTIONAL MATCH (e2:Event)
    WHERE abs(e2.lat - c.lat) < 5 AND abs(e2.lng - c.lng) < 5
    WITH c, routeCount, eventCount, count(DISTINCT e2) AS nearbyEvents
    
    // Calculate exposure score (weighted sum)
    RETURN 
      routeCount AS affectedRoutes,
      eventCount + nearbyEvents AS nearbyEvents,
      (routeCount * 0.3 + eventCount * 0.5 + nearbyEvents * 0.2) AS exposureScore,
      0 AS supplierRisk
  `;

  const results = await runQuery(cypher, { companyId });
  
  if (results.length === 0) {
    return { exposureScore: 0, affectedRoutes: 0, nearbyEvents: 0, supplierRisk: 0 };
  }

  return results[0];
}

/**
 * Find alternative routes avoiding high-risk areas
 */
export async function findAlternativeRoutes(
  fromNodeId: string,
  toNodeId: string,
  excludeCountries: string[] = []
): Promise<any[]> {
  const cypher = `
    MATCH (start {id: $fromNodeId})
    MATCH (end {id: $toNodeId})
    
    // Find paths through ports, avoiding excluded countries
    MATCH path = (start)-[:USES|TRANSITS*1..5]-(end)
    WHERE ALL(node IN nodes(path) WHERE 
      NOT (node:Port AND node.countryCode IN $excludeCountries)
      AND NOT (node:Company AND node.countryCode IN $excludeCountries)
    )
    
    // Calculate path risk score
    WITH path, 
         [node IN nodes(path) WHERE node:Port | node] AS ports,
         relationships(path) AS rels
    
    // Get events affecting nodes in path
    OPTIONAL MATCH (e:Event)-[:AFFECTS]->(pathNode)
    WHERE pathNode IN nodes(path)
    
    WITH path, ports, rels, collect(DISTINCT e.severity) AS severities
    
    RETURN 
      [node IN nodes(path) | node.id] AS nodeIds,
      [node IN nodes(path) | node.name] AS nodeNames,
      length(path) AS hops,
      CASE WHEN size(severities) > 0 
           THEN reduce(s = 0, x IN severities | s + x) / size(severities)
           ELSE 0 
      END AS avgRisk,
      size(ports) AS portCount
    ORDER BY avgRisk ASC, hops ASC
    LIMIT 5
  `;

  return runQuery(cypher, { fromNodeId, toNodeId, excludeCountries });
}

/**
 * Get port centrality - how important a port is in the network
 */
export async function getPortCentrality(): Promise<any[]> {
  const cypher = `
    MATCH (p:Port)
    OPTIONAL MATCH (p)<-[:TRANSITS]-(r:Route)
    WITH p, count(DISTINCT r) AS incomingRoutes
    OPTIONAL MATCH (p)-[:TRANSITS]->(r2:Route)
    WITH p, incomingRoutes, count(DISTINCT r2) AS outgoingRoutes
    OPTIONAL MATCH (e:Event)-[:AFFECTS]->(p)
    WITH p, incomingRoutes, outgoingRoutes, count(DISTINCT e) AS eventCount
    RETURN 
      p.id AS portId,
      p.name AS portName,
      p.country AS country,
      incomingRoutes + outgoingRoutes AS totalConnections,
      (incomingRoutes + outgoingRoutes) * 10 - eventCount * 5 AS centralityScore,
      eventCount AS recentEvents
    ORDER BY centralityScore DESC
  `;

  return runQuery(cypher);
}

/**
 * Get supply chain dependency tree for a company
 */
export async function getSupplyChainTree(companyId: string, depth: number = 3): Promise<any[]> {
  const cypher = `
    MATCH path = (c:Company {id: $companyId})-[:SUPPLIER_TO|USES*1..${depth}]-(related)
    WHERE related:Company OR related:Port
    RETURN DISTINCT
      related.id AS nodeId,
      related.name AS nodeName,
      labels(related)[0] AS nodeType,
      related.country AS country,
      length(path) AS distance
    ORDER BY distance, nodeName
  `;

  return runQuery(cypher, { companyId });
}

/**
 * Get graph statistics
 */
export async function getGraphStats(): Promise<{
  companies: number;
  ports: number;
  routes: number;
  events: number;
  countries: number;
  relationships: number;
}> {
  const cypher = `
    MATCH (c:Company) WITH count(c) AS companies
    MATCH (p:Port) WITH companies, count(p) AS ports
    MATCH (r:Route) WITH companies, ports, count(r) AS routes
    MATCH (e:Event) WITH companies, ports, routes, count(e) AS events
    MATCH (co:Country) WITH companies, ports, routes, events, count(co) AS countries
    MATCH ()-[rel]->() WITH companies, ports, routes, events, countries, count(rel) AS relationships
    RETURN companies, ports, routes, events, countries, relationships
  `;

  const results = await runQuery(cypher);
  return results[0] || { companies: 0, ports: 0, routes: 0, events: 0, countries: 0, relationships: 0 };
}

/**
 * Get events affecting a specific route
 */
export async function getRouteEvents(routeId: string): Promise<any[]> {
  const cypher = `
    MATCH (r:Route {id: $routeId})
    
    // Get nodes connected to this route
    OPTIONAL MATCH (from)-[:USES]->(r)
    OPTIONAL MATCH (r)-[:TRANSITS]->(to)
    
    WITH r, collect(DISTINCT from) + collect(DISTINCT to) AS connectedNodes
    
    // Find events affecting connected nodes
    UNWIND connectedNodes AS node
    OPTIONAL MATCH (e:Event)-[:AFFECTS]->(node)
    
    RETURN DISTINCT
      e.id AS eventId,
      e.type AS eventType,
      e.title AS eventTitle,
      e.severity AS severity,
      e.startDate AS startDate,
      node.name AS affectedNode
    ORDER BY e.severity DESC
  `;

  return runQuery(cypher, { routeId });
}
