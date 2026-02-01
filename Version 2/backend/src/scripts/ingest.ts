import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

import { buildOverpassQuery } from '../ingestion/overpass';
import { normalizeNodes } from '../ingestion/normalizeNodes';
import { parsePortsGeojson } from '../ingestion/ports';
import { proposePath } from '../services/pathLLM';
import { scorePath } from '../services/pathScoring';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

type NodeRecord = {
  id: string;
  name: string;
  type?: string;
  node_type?: string;
  source?: string;
  country?: string;
  city?: string;
  lat: number;
  lng: number;
  products?: string[];
  description?: string;
  tags?: string[];
  region_code?: string;
};

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const REGION_BBOXES: Array<{ name: string; bbox: [number, number, number, number] }> = [
  { name: 'Taiwan', bbox: [21.8, 119.3, 25.4, 122.1] },
  { name: 'South Korea', bbox: [33.0, 124.6, 38.7, 130.9] },
  { name: 'Japan', bbox: [31.0, 129.3, 45.6, 145.8] },
  { name: 'China', bbox: [18.1, 73.5, 53.6, 135.1] },
  { name: 'US West', bbox: [32.0, -125.0, 49.0, -114.0] },
  { name: 'US Southwest', bbox: [25.7, -117.5, 37.0, -103.0] },
  { name: 'Netherlands', bbox: [50.7, 3.2, 53.7, 7.3] },
  { name: 'Germany', bbox: [47.2, 5.8, 55.1, 15.2] },
  { name: 'France', bbox: [41.2, -5.2, 51.3, 9.7] },
  { name: 'Singapore', bbox: [1.1, 103.6, 1.5, 104.1] },
  { name: 'Malaysia', bbox: [0.9, 99.6, 7.4, 120.4] },
  { name: 'Vietnam', bbox: [8.4, 102.1, 23.4, 109.5] },
];

const FACILITY_TAGS: Array<[string, string]> = [
  ['industrial', '*'],
  ['factory', '*'],
  ['warehouse', '*'],
  ['logistics', '*'],
  ['manufacturing', '*'],
];

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function getNearestNodes(nodes: NodeRecord[], source: NodeRecord, limit: number) {
  return [...nodes]
    .map((node) => ({ node, distance: haversineKm(source, node) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((entry) => entry.node);
}

async function fetchFacilities() {
  const facilities: NodeRecord[] = [];

  for (const region of REGION_BBOXES) {
    const query = buildOverpassQuery(FACILITY_TAGS, region.bbox);
    try {
      const response = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: query,
      });

      if (!response.ok) {
        console.warn(`Overpass fetch failed for ${region.name}: ${response.status}`);
        continue;
      }

      const payload = (await response.json()) as {
        elements?: Array<{
          id: number;
          lat?: number;
          lon?: number;
          center?: { lat: number; lon: number };
          tags?: Record<string, string>;
        }>;
      };

      for (const element of payload.elements || []) {
        const lat = element.lat ?? element.center?.lat;
        const lng = element.lon ?? element.center?.lon;
        if (lat === undefined || lng === undefined) {
          continue;
        }
        const name = element.tags?.name || element.tags?.operator || 'OSM Facility';
        const nodeType = element.tags?.factory ? 'factory' : 'industrial_site';
        facilities.push({
          id: `osm-${element.id}`,
          name,
          node_type: nodeType,
          type: nodeType,
          source: 'osm',
          lat,
          lng,
          tags: Object.keys(element.tags || {}),
        });
      }
    } catch (error) {
      console.warn(`Overpass fetch failed for ${region.name}:`, error);
    }
  }

  return facilities;
}

async function loadPorts(): Promise<NodeRecord[]> {
  const portsPath = path.join(__dirname, '../../../../data/seed/ports.json');
  const raw = JSON.parse(fs.readFileSync(portsPath, 'utf-8'));

  if (Array.isArray(raw)) {
    return raw.map((port) => ({
      ...port,
      node_type: 'port',
      source: port.source || 'ports_index',
      tags: ['port'],
    }));
  }

  return parsePortsGeojson(raw).map((port: any) => ({
    ...port,
    node_type: 'port',
    source: port.source || 'ports_index',
    tags: ['port'],
  }));
}

async function loadCompanies(): Promise<NodeRecord[]> {
  const companiesPath = path.join(__dirname, '../../../../data/seed/companies.json');
  const raw = JSON.parse(fs.readFileSync(companiesPath, 'utf-8'));
  return raw.map((company: any) => ({
    ...company,
    node_type: company.node_type || 'company',
    source: company.source || 'curated',
    tags: company.products || [],
  }));
}

function parsePathNodeIds(raw: string, allowedIds: Set<string>) {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((id) => typeof id === 'string' && allowedIds.has(id));
    }
  } catch {
    // ignore parsing errors
  }
  return [];
}

async function buildPathForCompany(
  company: NodeRecord,
  nodes: NodeRecord[],
  productCategory: string,
) {
  const ports = nodes.filter((node) => node.node_type === 'port');
  const facilities = nodes.filter((node) => node.node_type !== 'port');

  const candidateNodes = [
    company,
    ...getNearestNodes(ports, company, 6),
    ...getNearestNodes(facilities, company, 6),
  ];

  const candidateNodeIds = candidateNodes.map((node) => node.id);
  const allowedIds = new Set(candidateNodeIds);

  let pathNodeIds: string[] = [];

  if (process.env.OPENAI_API_KEY) {
    const raw = await proposePath({
      companyName: company.name,
      productCategory,
      candidateNodeIds,
    });
    pathNodeIds = parsePathNodeIds(raw, allowedIds);
  }

  if (pathNodeIds.length < 2) {
    const nearestPort = getNearestNodes(ports, company, 1)[0];
    pathNodeIds = [company.id, nearestPort?.id].filter(Boolean) as string[];
  }

  if (!pathNodeIds.includes(company.id)) {
    pathNodeIds.unshift(company.id);
  }

  const uniqueNodeIds = pathNodeIds.filter(
    (id, index) => id && pathNodeIds.indexOf(id) === index,
  );
  const pathNodes = uniqueNodeIds
    .map((id) => nodes.find((node) => node.id === id))
    .filter(Boolean) as NodeRecord[];

  const edges = [];
  let totalCost = 0;
  let totalLeadTime = 0;

  for (let i = 0; i < pathNodes.length - 1; i += 1) {
    const from = pathNodes[i];
    const to = pathNodes[i + 1];
    const distance = haversineKm(from, to);
    const leadTimeDays = Math.max(1, Math.round(distance / 500));

    totalCost += distance;
    totalLeadTime += leadTimeDays;

    edges.push({
      fromNodeId: from.id,
      toNodeId: to.id,
      costScore: distance,
      riskScore: 0,
      tariffCost: 0,
      leadTimeDays,
      transportMode: from.node_type === 'port' || to.node_type === 'port' ? 'sea' : 'land',
    });
  }

  const totalScore = scorePath({
    cost: totalCost,
    leadTime: totalLeadTime,
    tariff: 0,
    risk: 0,
  });

  return { edges, totalScore };
}

async function ingest() {
  console.log('Starting ingestion...');

  const [ports, companies, facilities] = await Promise.all([
    loadPorts(),
    loadCompanies(),
    fetchFacilities(),
  ]);

  console.log(`Loaded ${ports.length} ports`);
  console.log(`Loaded ${companies.length} companies`);
  console.log(`Loaded ${facilities.length} OSM facilities`);

  const normalizedNodes = normalizeNodes([...companies, ...ports, ...facilities]);
  console.log(`Normalized to ${normalizedNodes.length} unique nodes`);

  for (const node of normalizedNodes) {
    const { error } = await supabase.from('companies').upsert(node, { onConflict: 'id' });
    if (error) {
      console.error(`Error upserting node ${node.id}:`, error.message);
    }
  }

  for (const company of companies) {
    const pathId = randomUUID();
    const productCategory = 'semiconductors.logic';
    const { edges } = await buildPathForCompany(company, normalizedNodes, productCategory);

    const { error: pathError } = await supabase.from('supply_paths').upsert(
      {
        id: pathId,
        company_id: company.id,
        product_category: productCategory,
        status: 'active',
      },
      { onConflict: 'id' },
    );

    if (pathError) {
      console.error(`Error upserting path for ${company.id}:`, pathError.message);
      continue;
    }

    const connections = edges.map((edge, index) => ({
      id: `${pathId}-${index}`,
      from_node_id: edge.fromNodeId,
      to_node_id: edge.toNodeId,
      status: 'active',
      is_user_connection: false,
      transport_mode: edge.transportMode,
      lead_time_days: edge.leadTimeDays,
      path_id: pathId,
      sequence: index,
      cost_score: edge.costScore,
      risk_score: edge.riskScore,
      tariff_cost: edge.tariffCost,
      product_category: productCategory,
      is_path_edge: true,
    }));

    for (const connection of connections) {
      const { error } = await supabase.from('connections').upsert(connection, { onConflict: 'id' });
      if (error) {
        console.error(`Error upserting connection ${connection.id}:`, error.message);
      }
    }
  }

  console.log('Ingestion complete');
}

ingest()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Ingestion failed:', error);
    process.exit(1);
  });
