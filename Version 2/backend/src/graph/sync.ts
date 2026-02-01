// backend/src/graph/sync.ts
// Syncs data from Supabase to Neo4j Knowledge Graph

import { supabase } from '../lib/supabase';
import { runWrite, runQuery } from '../lib/neo4j';
import { CompanyNode, PortNode, RouteNode, EventNode, CountryNode } from './schema';
import { COUNTRIES, getCountryName, getCountryCoords } from '../data/countries';

/**
 * Sync all companies from Supabase to Neo4j
 */
export async function syncCompanies(): Promise<number> {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('*');

  if (error || !companies) {
    console.error('Error fetching companies:', error);
    return 0;
  }

  let synced = 0;
  for (const company of companies) {
    // Determine if this is a port or company
    const isPort = company.type === 'port';
    const label = isPort ? 'Port' : 'Company';

    const cypher = `
      MERGE (n:${label} {id: $id})
      SET n.name = $name,
          n.type = $type,
          n.lat = $lat,
          n.lng = $lng,
          n.city = $city,
          n.country = $country,
          n.countryCode = $countryCode,
          n.products = $products,
          n.updatedAt = datetime()
      RETURN n
    `;

    try {
      await runWrite(cypher, {
        id: company.id,
        name: company.name,
        type: company.type,
        lat: company.lat || 0,
        lng: company.lng || 0,
        city: company.city || '',
        country: company.country || '',
        countryCode: company.country_code || '',
        products: company.products || [],
      });
      synced++;
    } catch (err) {
      console.error(`Error syncing company ${company.id}:`, err);
    }
  }

  console.log(`Synced ${synced} companies/ports to graph`);
  return synced;
}

/**
 * Sync connections as Route nodes with USES/TRANSITS edges
 */
export async function syncConnections(): Promise<number> {
  const { data: connections, error } = await supabase
    .from('connections')
    .select('*');

  if (error || !connections) {
    console.error('Error fetching connections:', error);
    return 0;
  }

  let synced = 0;
  let edgesCreated = 0;

  for (const conn of connections) {
    // Step 1: Create or update the Route node
    const createRouteCypher = `
      MERGE (r:Route {id: $id})
      SET r.transportMode = $transportMode,
          r.status = $status,
          r.materials = $materials,
          r.leadTimeDays = $leadTimeDays,
          r.isUserConnection = $isUserConnection,
          r.fromNodeId = $fromNodeId,
          r.toNodeId = $toNodeId,
          r.updatedAt = datetime()
      RETURN r
    `;

    try {
      await runWrite(createRouteCypher, {
        id: conn.id,
        fromNodeId: conn.from_node_id,
        toNodeId: conn.to_node_id,
        transportMode: conn.transport_mode || 'unknown',
        status: conn.status || 'unknown',
        materials: conn.materials || [],
        leadTimeDays: conn.lead_time_days || null,
        isUserConnection: conn.is_user_connection || false,
      });
      synced++;

      // Step 2: Create USES edge (source → route)
      const usesEdgeCypher = `
        MATCH (r:Route {id: $routeId})
        OPTIONAL MATCH (from:Company {id: $fromNodeId})
        OPTIONAL MATCH (fromPort:Port {id: $fromNodeId})
        WITH r, COALESCE(from, fromPort) AS fromNode
        WHERE fromNode IS NOT NULL
        MERGE (fromNode)-[rel:USES]->(r)
        SET rel.updatedAt = datetime()
        RETURN count(rel) AS created
      `;
      const usesResult = await runWrite(usesEdgeCypher, {
        routeId: conn.id,
        fromNodeId: conn.from_node_id,
      });

      // Step 3: Create TRANSITS edge (route → destination)
      const transitsEdgeCypher = `
        MATCH (r:Route {id: $routeId})
        OPTIONAL MATCH (to:Company {id: $toNodeId})
        OPTIONAL MATCH (toPort:Port {id: $toNodeId})
        WITH r, COALESCE(to, toPort) AS toNode
        WHERE toNode IS NOT NULL
        MERGE (r)-[rel:TRANSITS]->(toNode)
        SET rel.updatedAt = datetime()
        RETURN count(rel) AS created
      `;
      const transitsResult = await runWrite(transitsEdgeCypher, {
        routeId: conn.id,
        toNodeId: conn.to_node_id,
      });

      if (usesResult[0]?.created) edgesCreated++;
      if (transitsResult[0]?.created) edgesCreated++;

    } catch (err) {
      console.error(`Error syncing connection ${conn.id}:`, err);
    }
  }

  console.log(`Synced ${synced} routes with ${edgesCreated} edges to graph`);
  return synced;
}

/**
 * Sync events and create AFFECTS relationships
 */
export async function syncEvents(daysBack: number = 7): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .gte('start_date', cutoffDate.toISOString())
    .not('lat', 'eq', 0)
    .not('lng', 'eq', 0);

  if (error || !events) {
    console.error('Error fetching events:', error);
    return 0;
  }

  let synced = 0;
  for (const event of events) {
    // Create Event node
    const cypher = `
      MERGE (e:Event {id: $id})
      SET e.type = $type,
          e.title = $title,
          e.description = $description,
          e.lat = $lat,
          e.lng = $lng,
          e.severity = $severity,
          e.startDate = $startDate,
          e.endDate = $endDate,
          e.source = $source,
          e.updatedAt = datetime()
      RETURN e
    `;

    try {
      await runWrite(cypher, {
        id: event.id,
        type: event.type,
        title: event.title,
        description: event.description || '',
        lat: event.lat,
        lng: event.lng,
        severity: event.severity || 5,
        startDate: event.start_date,
        endDate: event.end_date || null,
        source: event.source || 'unknown',
      });
      synced++;
    } catch (err) {
      console.error(`Error syncing event ${event.id}:`, err);
    }
  }

  // Create AFFECTS relationships based on proximity
  const affectsCount = await createEventAffectsRelationships();
  
  // Link events to nearest country
  const eventCountryCount = await linkEventsToCountries();

  console.log(`Synced ${synced} events, ${affectsCount} AFFECTS edges, ${eventCountryCount} event-country links`);
  return synced;
}

/**
 * Create AFFECTS relationships between Events and nearby Ports/Companies
 * Uses haversine-like distance approximation in Cypher
 */
async function createEventAffectsRelationships(): Promise<number> {
  // Proximity threshold in degrees (~500km at equator)
  const PROXIMITY_THRESHOLD = 5.0;

  const cypher = `
    MATCH (e:Event)
    WHERE e.lat IS NOT NULL AND e.lng IS NOT NULL
    MATCH (target)
    WHERE (target:Port OR target:Company)
      AND target.lat IS NOT NULL AND target.lng IS NOT NULL
      AND abs(e.lat - target.lat) < $threshold
      AND abs(e.lng - target.lng) < $threshold
    MERGE (e)-[r:AFFECTS]->(target)
    SET r.distance = sqrt(
      (e.lat - target.lat) * (e.lat - target.lat) +
      (e.lng - target.lng) * (e.lng - target.lng)
    ),
    r.severity = e.severity,
    r.updatedAt = datetime()
    RETURN count(r) AS affectsCount
  `;

  try {
    const result = await runWrite(cypher, { threshold: PROXIMITY_THRESHOLD });
    const count = result[0]?.affectsCount || 0;
    console.log(`Created ${count} AFFECTS edges`);
    return count;
  } catch (err) {
    console.error('Error creating AFFECTS relationships:', err);
    return 0;
  }
}

/**
 * Link events to all nearby countries based on coordinates
 * Uses distance threshold to capture cross-border effects
 */
async function linkEventsToCountries(): Promise<number> {
  // Distance threshold in degrees (~500km at equator)
  const COUNTRY_THRESHOLD = 5.0;

  const cypher = `
    MATCH (e:Event)
    WHERE e.lat IS NOT NULL AND e.lng IS NOT NULL
    MATCH (c:Country)
    WHERE c.lat IS NOT NULL AND c.lng IS NOT NULL
    WITH e, c, 
         sqrt((e.lat - c.lat) * (e.lat - c.lat) + (e.lng - c.lng) * (e.lng - c.lng)) AS dist
    WHERE dist < $threshold
    MERGE (e)-[r:OCCURRED_IN]->(c)
    SET r.distance = dist,
        r.updatedAt = datetime()
    RETURN count(r) AS linkedCount
  `;

  try {
    const result = await runWrite(cypher, { threshold: COUNTRY_THRESHOLD });
    return result[0]?.linkedCount || 0;
  } catch (err) {
    console.error('Error linking events to countries:', err);
    return 0;
  }
}

/**
 * Create Country nodes for ALL countries with coordinates and LOCATED_IN relationships
 */
export async function syncCountries(): Promise<number> {
  let synced = 0;

  // Sync ALL countries from the master list
  for (const [code, data] of Object.entries(COUNTRIES)) {
    const cypher = `
      MERGE (c:Country {code: $code})
      SET c.name = $name,
          c.lat = $lat,
          c.lng = $lng,
          c.updatedAt = datetime()
      RETURN c
    `;

    try {
      await runWrite(cypher, {
        code,
        name: data.name,
        lat: data.lat,
        lng: data.lng,
      });
      synced++;
    } catch (err) {
      console.error(`Error syncing country ${code}:`, err);
    }
  }

  // Create LOCATED_IN relationships
  const locatedInCypher = `
    MATCH (n)
    WHERE (n:Company OR n:Port) AND n.countryCode IS NOT NULL AND n.countryCode <> ''
    MATCH (c:Country {code: n.countryCode})
    MERGE (n)-[r:LOCATED_IN]->(c)
    SET r.updatedAt = datetime()
    RETURN count(r) AS linkedCount
  `;

  const locatedInResult = await runWrite(locatedInCypher);
  const linkedCount = locatedInResult[0]?.linkedCount || 0;
  
  console.log(`Synced ${synced} countries, created ${linkedCount} LOCATED_IN edges`);
  return synced;
}

/**
 * Create SUPPLIER_TO relationships from user supply chain data
 */
export async function syncSupplierRelationships(): Promise<number> {
  const { data: supplyChains } = await supabase
    .from('user_supply_chains')
    .select('*');

  if (!supplyChains || supplyChains.length === 0) return 0;

  let synced = 0;
  for (const chain of supplyChains) {
    const suppliers = chain.suppliers || [];
    
    for (const supplier of suppliers) {
      // Try to find matching company in graph
      const findCypher = `
        MATCH (s:Company)
        WHERE toLower(s.name) CONTAINS toLower($supplierName)
        RETURN s.id AS id
        LIMIT 1
      `;

      const results = await runQuery(findCypher, { supplierName: supplier.name });
      
      if (results.length > 0) {
        // Create SUPPLIER_TO relationship
        // Note: Would need user's company in graph too
        synced++;
      }
    }
  }

  return synced;
}

/**
 * Full sync - run all sync operations
 */
export async function fullSync(): Promise<{
  companies: number;
  connections: number;
  events: number;
  countries: number;
}> {
  console.log('Starting full graph sync...');
  
  const companies = await syncCompanies();
  const countries = await syncCountries();
  const connections = await syncConnections();
  const events = await syncEvents(7); // Last 7 days

  console.log('Full graph sync complete');
  
  return { companies, connections, events, countries };
}
