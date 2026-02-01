// backend/src/graph/schema.ts
// Knowledge Graph Schema for Aegis Flow
// Defines node types, edge types, and constraints

import { runWrite } from '../lib/neo4j';

/**
 * Node Types:
 * - Company: Manufacturing companies, foundries, IDMs
 * - Port: Shipping ports with logistics data
 * - Route: Supply chain routes between nodes
 * - Country: Geographic/political entities
 * - Event: Disruption events (geopolitical, weather, etc.)
 */

/**
 * Edge Types:
 * - (Company)-[:SUPPLIER_TO]->(Company) - Supply relationships
 * - (Company)-[:USES]->(Route) - Company uses a shipping route
 * - (Route)-[:TRANSITS]->(Port) - Route passes through port
 * - (Event)-[:AFFECTS]->(Port|Company|Route) - Event impacts entity
 * - (Event)-[:OCCURRED_IN]->(Country) - Event happened in country
 * - (Port)-[:LOCATED_IN]->(Country) - Geographic location
 * - (Company)-[:LOCATED_IN]->(Country) - Company HQ location
 */

export async function initializeSchema(): Promise<void> {
  console.log('Initializing Neo4j schema...');

  // Create constraints for unique IDs
  const constraints = [
    'CREATE CONSTRAINT company_id IF NOT EXISTS FOR (c:Company) REQUIRE c.id IS UNIQUE',
    'CREATE CONSTRAINT port_id IF NOT EXISTS FOR (p:Port) REQUIRE p.id IS UNIQUE',
    'CREATE CONSTRAINT route_id IF NOT EXISTS FOR (r:Route) REQUIRE r.id IS UNIQUE',
    'CREATE CONSTRAINT country_code IF NOT EXISTS FOR (c:Country) REQUIRE c.code IS UNIQUE',
    'CREATE CONSTRAINT event_id IF NOT EXISTS FOR (e:Event) REQUIRE e.id IS UNIQUE',
  ];

  for (const constraint of constraints) {
    try {
      await runWrite(constraint);
    } catch (err: any) {
      // Constraint may already exist
      if (!err.message?.includes('already exists')) {
        console.error('Schema constraint error:', err.message);
      }
    }
  }

  // Create indexes for common queries
  const indexes = [
    'CREATE INDEX company_country IF NOT EXISTS FOR (c:Company) ON (c.country)',
    'CREATE INDEX company_type IF NOT EXISTS FOR (c:Company) ON (c.type)',
    'CREATE INDEX port_country IF NOT EXISTS FOR (p:Port) ON (p.country)',
    'CREATE INDEX event_type IF NOT EXISTS FOR (e:Event) ON (e.type)',
    'CREATE INDEX event_date IF NOT EXISTS FOR (e:Event) ON (e.startDate)',
    'CREATE INDEX event_severity IF NOT EXISTS FOR (e:Event) ON (e.severity)',
  ];

  for (const index of indexes) {
    try {
      await runWrite(index);
    } catch (err: any) {
      if (!err.message?.includes('already exists')) {
        console.error('Schema index error:', err.message);
      }
    }
  }

  console.log('Neo4j schema initialized');
}

// Node property interfaces
export interface CompanyNode {
  id: string;
  name: string;
  type: string; // foundry, idm, equipment, port, etc.
  lat: number;
  lng: number;
  city: string;
  country: string;
  countryCode?: string;
  products?: string[];
  annualRevenue?: number;
  employees?: number;
}

export interface PortNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  countryCode?: string;
  annualTeu?: number;
  specialties?: string[];
}

export interface RouteNode {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  transportMode: string; // sea, air, land
  status: string;
  materials?: string[];
  leadTimeDays?: number;
}

export interface CountryNode {
  code: string; // ISO-3166
  name: string;
  lat: number;
  lng: number;
}

export interface EventNode {
  id: string;
  type: string;
  title: string;
  description?: string;
  lat: number;
  lng: number;
  severity: number;
  startDate: string;
  endDate?: string;
  source: string;
  goldsteinScore?: number;
  tone?: number;
}
