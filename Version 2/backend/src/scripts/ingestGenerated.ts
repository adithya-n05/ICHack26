import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

import { normalizeNodes } from '../ingestion/normalizeNodes';
import {
  fetchTopElectronicsCompanies,
  fetchElectronicsSuppliers,
  fetchMajorCities,
} from '../sources/wikidata';
import { fetchFacilities, fetchPorts } from '../sources/overpass';
import { loadPortsFromFile, loadPortsFromUrl } from '../sources/portsFile';
import { filterNodesNearLand } from '../sources/landmask';
import { buildMultiSegmentPath } from '../generate/paths';
import { PART_CATEGORIES } from '../generate/constants';
import { sanitizeEntities } from './ingestOpenAI.utils';
import { buildTypedKey, collectUniqueTyped, filterNamedNodes } from './ingestGenerated.utils';

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

type WikidataCompany = Awaited<ReturnType<typeof fetchTopElectronicsCompanies>>[number];
type WikidataSupplier = Awaited<ReturnType<typeof fetchElectronicsSuppliers>>[number];

type SupplierRecord = {
  id: string;
  companyId: string;
  name: string;
  tier: number;
  country: string;
  city: string;
  lat: number;
  lng: number;
  materials: string[];
  products: string[];
  priceCatalog: Record<string, { part: string; unit: string; min: number; max: number }[]>;
};

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

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

function assignNearestCity<T extends { lat: number; lng: number; country?: string; city?: string }>(
  nodes: T[],
  cities: NodeRecord[],
  fallbackCities: NodeRecord[],
) {
  const lookup = cities.length > 0 ? cities : fallbackCities;
  if (lookup.length === 0) return nodes;
  return nodes.map((node) => {
    if (node.city && node.country) return node;
    let nearest = lookup[0];
    let bestDistance = haversineKm(node, lookup[0]);
    for (const city of lookup.slice(1)) {
      const distance = haversineKm(node, city);
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = city;
      }
    }
    return {
      ...node,
      city: node.city ?? nearest.city ?? nearest.name,
      country: node.country ?? nearest.country ?? 'Unknown',
    };
  });
}

async function loadSeedCompanies() {
  const companiesPath = path.join(__dirname, '../../../../data/seed/companies.json');
  if (!fs.existsSync(companiesPath)) return [];
  const raw = JSON.parse(fs.readFileSync(companiesPath, 'utf-8'));
  return raw.map((company: any) => ({
    ...company,
    node_type: company.node_type || 'company',
    source: company.source || 'seed',
    tags: company.products || [],
  })) as NodeRecord[];
}

function toCompanyNode(company: {
  id: string;
  name: string;
  lat: number;
  lng: number;
  country?: string;
  city?: string;
  website?: string;
  industry?: string;
}): NodeRecord {
  return {
    id: company.id,
    name: company.name,
    node_type: 'company',
    type: 'company',
    country: company.country,
    city: company.city,
    lat: company.lat,
    lng: company.lng,
    products: PART_CATEGORIES.map((category) => category.category),
    description: company.industry,
    source: 'wikidata',
    tags: ['electronics', 'company'],
  };
}

function toSupplierNode(supplier: {
  companyId: string;
  name: string;
  lat: number;
  lng: number;
  country: string;
  city: string;
  products: string[];
  materials: string[];
}) {
  return {
    id: supplier.companyId,
    name: supplier.name,
    node_type: 'supplier',
    type: 'supplier',
    country: supplier.country,
    city: supplier.city,
    lat: supplier.lat,
    lng: supplier.lng,
    products: supplier.products,
    source: 'synthetic',
    tags: supplier.materials,
  };
}

function assignFacilityType(node: NodeRecord, index: number): NodeRecord {
  const isWarehouse = node.tags?.includes('warehouse') || index % 3 === 0;
  const nodeType = isWarehouse ? 'warehouse' : 'factory';
  return {
    ...node,
    node_type: nodeType,
    type: nodeType,
  };
}

async function fetchAll<T>(table: string, select: string) {
  const pageSize = 1000;
  let offset = 0;
  const results: T[] = [];
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(offset, offset + pageSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    results.push(...rows);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return results;
}

async function loadExistingData() {
  const [nodes, suppliers, paths] = await Promise.all([
    fetchAll<NodeRecord>('companies', 'id,name,city,country,lat,lng,node_type,type,source,tags'),
    fetchAll<{
      id: string;
      company_id: string;
      name: string;
      tier: number;
      country: string;
      city: string;
      lat: number;
      lng: number;
      materials: string[];
      products: string[];
      price_catalog: SupplierRecord['priceCatalog'];
    }>('suppliers', 'id,company_id,name,tier,country,city,lat,lng,materials,products,price_catalog'),
    fetchAll<{ company_id: string }>('supply_paths', 'company_id'),
  ]);

  const seenByType = {
    company: new Set<string>(),
    port: new Set<string>(),
    warehouse: new Set<string>(),
    factory: new Set<string>(),
    market: new Set<string>(),
  };

  const existingNodes = {
    companies: [] as NodeRecord[],
    ports: [] as NodeRecord[],
    warehouses: [] as NodeRecord[],
    factories: [] as NodeRecord[],
    markets: [] as NodeRecord[],
  };

  for (const node of nodes) {
    const type = (node.node_type ?? node.type ?? '').toLowerCase();
    const cleaned = sanitizeEntities([
      { name: node.name, city: node.city ?? '', country: node.country ?? '' },
    ]);
    if (cleaned.length === 0) continue;
    const key = buildTypedKey({ ...cleaned[0], node_type: type });
    if (type === 'company') {
      seenByType.company.add(key);
      existingNodes.companies.push(node);
    } else if (type === 'port') {
      seenByType.port.add(key);
      existingNodes.ports.push(node);
    } else if (type === 'warehouse' || type === 'hub') {
      seenByType.warehouse.add(key);
      existingNodes.warehouses.push({ ...node, node_type: 'warehouse', type: 'warehouse' });
    } else if (type === 'factory') {
      seenByType.factory.add(key);
      existingNodes.factories.push(node);
    } else if (type === 'market') {
      seenByType.market.add(key);
      existingNodes.markets.push(node);
    }
  }

  const supplierSeen = new Set<string>();
  const existingSuppliers = suppliers.map((supplier) => ({
    id: supplier.id,
    companyId: supplier.company_id,
    name: supplier.name,
    tier: supplier.tier,
    country: supplier.country ?? 'Unknown',
    city: supplier.city ?? 'Unknown',
    lat: supplier.lat,
    lng: supplier.lng,
    materials: supplier.materials ?? [],
    products: supplier.products ?? [],
    priceCatalog: supplier.price_catalog ?? {},
  }));

  for (const supplier of existingSuppliers) {
    const cleaned = sanitizeEntities([
      { name: supplier.name, city: supplier.city ?? '', country: supplier.country ?? '' },
    ]);
    if (cleaned.length === 0) continue;
    supplierSeen.add(buildTypedKey({ ...cleaned[0], node_type: 'supplier' }));
  }

  return {
    seenByType,
    supplierSeen,
    existingNodes,
    existingSuppliers,
    existingPathCompanies: new Set(paths.map((path) => path.company_id)),
  };
}

async function ingestGenerated() {
  console.log('Starting generated ingestion...');
  const { seenByType, supplierSeen, existingNodes, existingSuppliers, existingPathCompanies } =
    await loadExistingData();

  const TARGET_COUNTS = {
    companies: 40,
    suppliers: 120,
    ports: 80,
    warehouses: 80,
    factories: 80,
    markets: 60,
    paths: 40,
  };

  const [wikidataCompanies, wikidataSuppliers, portsFromFile, portsFromUrl, majorCities] =
    await Promise.all([
      fetchTopElectronicsCompanies(60),
      fetchElectronicsSuppliers(240),
      loadPortsFromFile(),
      loadPortsFromUrl(),
      fetchMajorCities(80),
    ]);

  const seedCompanies = await loadSeedCompanies();
  const companiesFromWikidata = (wikidataCompanies as WikidataCompany[]).map(toCompanyNode);

  const existingCompanies = existingNodes.companies;
  const remainingCompanies = Math.max(0, TARGET_COUNTS.companies - existingCompanies.length);
  const companyCandidates = assignNearestCity(
    filterNamedNodes(companiesFromWikidata),
    majorCities as NodeRecord[],
    seedCompanies,
  ).map((company) => ({
    ...company,
    node_type: 'company',
    type: 'company',
  }));
  const companyPool = [
    ...existingCompanies,
    ...collectUniqueTyped(companyCandidates, seenByType.company, remainingCompanies),
  ].slice(0, TARGET_COUNTS.companies);
  if (companyPool.length < TARGET_COUNTS.companies) {
    console.warn(`Only ${companyPool.length} companies available.`);
  }

  const wikidataSupplierNodes = filterNamedNodes(wikidataSuppliers as WikidataSupplier[])
    .filter((company: WikidataSupplier) => company.lat && company.lng)
    .map((company: WikidataSupplier, index: number) => ({
      id: `wd-supplier-${index + 1}`,
      companyId: `wd-supplier-${index + 1}`,
      name: company.name,
      tier: 2,
      country: company.country ?? 'Unknown',
      city: company.city ?? 'Unknown',
      lat: company.lat,
      lng: company.lng,
      materials: [pickRandom(PART_CATEGORIES).category],
      products: [pickRandom(PART_CATEGORIES).parts[0]],
      priceCatalog: {
        [pickRandom(PART_CATEGORIES).category]: [
          { part: pickRandom(PART_CATEGORIES).parts[0], unit: 'USD', min: 5, max: 50 },
        ],
      },
    }));

  const existingSupplierCount = existingSuppliers.length;
  const remainingSuppliers = Math.max(0, TARGET_COUNTS.suppliers - existingSupplierCount);
  const supplierCandidates = wikidataSupplierNodes.map((supplier) => ({
    ...supplier,
    node_type: 'supplier',
  }));
  const sanitizedSupplierKeys = new Set(
    sanitizeEntities(
      supplierCandidates.map((supplier) => ({
        name: supplier.name,
        city: supplier.city ?? '',
        country: supplier.country ?? '',
      })),
    ).map((supplier) => buildTypedKey({ ...supplier, node_type: 'supplier' })),
  );
  const filteredSupplierCandidates = supplierCandidates.filter((supplier) =>
    sanitizedSupplierKeys.has(
      buildTypedKey({
        name: supplier.name,
        city: supplier.city ?? '',
        country: supplier.country ?? '',
        node_type: 'supplier',
      }),
    ),
  );
  const suppliers = [
    ...existingSuppliers,
    ...collectUniqueTyped(filteredSupplierCandidates, supplierSeen, remainingSuppliers),
  ].slice(0, TARGET_COUNTS.suppliers);

  const [overpassPorts, overpassFacilities] = await Promise.all([
    fetchPorts(),
    fetchFacilities(),
  ]);

  const combinedPorts = filterNamedNodes([...portsFromFile, ...portsFromUrl, ...overpassPorts])
    .slice(0, 800)
    .map((port) => ({
      ...port,
      type: 'port',
      node_type: 'port',
      tags: port.tags ?? ['port'],
    })) as NodeRecord[];
  const portsNearLand = await filterNodesNearLand(combinedPorts, 35);

  const facilities = filterNamedNodes(overpassFacilities)
    .slice(0, 700)
    .map((facility, index) =>
      assignFacilityType(
        {
          id: facility.id,
          name: facility.name,
          lat: facility.lat,
          lng: facility.lng,
          country: undefined,
          city: undefined,
          node_type: facility.node_type,
          type: facility.node_type,
          source: facility.source,
          tags: facility.tags,
        },
        index,
      ),
    );
  const filteredFacilities = await filterNodesNearLand(facilities, 10);

  const majorMarkets = (majorCities as WikidataCompany[])
    .filter((city) => city.country && (city.city || city.name))
    .map((city, index) => ({
      id: `wd-market-${index + 1}`,
      name: city.name,
      node_type: 'market',
      type: 'market',
      lat: city.lat,
      lng: city.lng,
      country: city.country,
      city: city.city ?? city.name,
      source: 'wikidata',
      tags: ['market'],
    })) as NodeRecord[];

  const fallbackMarkets = seedCompanies
    .filter((company) => company.city && company.country)
    .map((company, index) => ({
      id: `seed-market-${index + 1}`,
      name: company.city ?? company.name,
      node_type: 'market',
      type: 'market',
      lat: company.lat,
      lng: company.lng,
      country: company.country,
      city: company.city ?? company.name,
      source: 'seed',
      tags: ['market'],
    })) as NodeRecord[];

  const markets = majorMarkets.length > 0 ? majorMarkets : fallbackMarkets;

  const portsWithLocation = assignNearestCity(portsNearLand, markets, fallbackMarkets) as NodeRecord[];
  const facilitiesWithLocation = assignNearestCity(filteredFacilities, markets, fallbackMarkets) as NodeRecord[];
  const companiesWithLocation = assignNearestCity(companyPool, markets, fallbackMarkets) as NodeRecord[];

  const remainingPorts = Math.max(0, TARGET_COUNTS.ports - existingNodes.ports.length);
  const remainingWarehouses = Math.max(0, TARGET_COUNTS.warehouses - existingNodes.warehouses.length);
  const remainingFactories = Math.max(0, TARGET_COUNTS.factories - existingNodes.factories.length);
  const remainingMarkets = Math.max(0, TARGET_COUNTS.markets - existingNodes.markets.length);

  const ports = [
    ...existingNodes.ports,
    ...collectUniqueTyped(portsWithLocation, seenByType.port, remainingPorts),
  ];

  const facilitiesByType = facilitiesWithLocation.reduce(
    (acc, node) => {
      if (node.node_type === 'warehouse') acc.warehouses.push(node);
      if (node.node_type === 'factory') acc.factories.push(node);
      return acc;
    },
    { warehouses: [] as NodeRecord[], factories: [] as NodeRecord[] },
  );

  const warehouses = [
    ...existingNodes.warehouses,
    ...collectUniqueTyped(facilitiesByType.warehouses, seenByType.warehouse, remainingWarehouses),
  ];
  const factories = [
    ...existingNodes.factories,
    ...collectUniqueTyped(facilitiesByType.factories, seenByType.factory, remainingFactories),
  ];
  const marketsDeduped = [
    ...existingNodes.markets,
    ...collectUniqueTyped(markets, seenByType.market, remainingMarkets),
  ] as NodeRecord[];

  const supplierNodes = suppliers.map(toSupplierNode);

  const baseNodes = normalizeNodes([
    ...companiesWithLocation,
    ...ports,
    ...warehouses,
    ...factories,
    ...marketsDeduped,
  ]);
  const uniqueNodes = Array.from(
    new Map([...baseNodes, ...supplierNodes].map((node) => [node.id, node])).values(),
  );

  console.log(`Upserting ${uniqueNodes.length} nodes...`);
  for (const batch of chunk(uniqueNodes, 500)) {
    const { error } = await supabase.from('companies').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error('Node upsert error:', error.message);
    }
  }

  console.log(`Upserting ${suppliers.length} suppliers...`);
  for (const batch of chunk(suppliers, 500)) {
    const payload = batch.map((supplier) => ({
      id: supplier.id,
      company_id: supplier.companyId,
      name: supplier.name,
      tier: supplier.tier,
      country: supplier.country,
      city: supplier.city,
      lat: supplier.lat,
      lng: supplier.lng,
      products: supplier.products,
      materials: supplier.materials,
      price_catalog: supplier.priceCatalog,
    }));
    const { error } = await supabase.from('suppliers').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('Supplier upsert error:', error.message);
    }
  }

  console.log('Generating supply paths...');
  const companiesForPaths = companiesWithLocation.slice(0, TARGET_COUNTS.paths);
  const supplierPool = suppliers;
  for (const company of companiesForPaths) {
    if (existingPathCompanies.has(company.id)) continue;
    const pathId = randomUUID();
    const { edges, materials } = buildMultiSegmentPath({
      company,
      suppliers: supplierPool,
      factories,
      warehouses,
      ports,
      markets: marketsDeduped,
    });
    if (edges.length === 0) {
      console.warn(`Skipping ${company.name}: insufficient nodes for multi-segment path.`);
      continue;
    }

    const status = edges.some((edge) => edge.status !== 'healthy') ? 'monitoring' : 'active';

    const { error: pathError } = await supabase.from('supply_paths').upsert(
      {
        id: pathId,
        company_id: company.id,
        product_category: materials[0],
        status,
      },
      { onConflict: 'id' },
    );

    if (pathError) {
      console.error(`Path upsert error for ${company.id}:`, pathError.message);
      continue;
    }

    const connections = edges.map((edge, index) => ({
      id: `${pathId}-${index}`,
      from_node_id: edge.fromNodeId,
      to_node_id: edge.toNodeId,
      status: edge.status,
      is_user_connection: false,
      transport_mode: edge.transportMode,
      lead_time_days: edge.leadTimeDays,
      path_id: pathId,
      sequence: edge.sequence,
      cost_score: edge.unitCost,
      risk_score: 0,
      tariff_cost: 0,
      product_category: materials[0],
      is_path_edge: true,
      materials,
      unit_cost: edge.unitCost,
      currency: edge.currency,
      description: `Segment ${index + 1} for ${company.name}`,
    }));

    const { error: connectionError } = await supabase
      .from('connections')
      .upsert(connections, { onConflict: 'id' });
    if (connectionError) {
      console.error(`Connection upsert error for ${company.id}:`, connectionError.message);
    }
  }

  console.log('Generated ingestion complete.');
}

ingestGenerated()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Generated ingestion failed:', error);
    process.exit(1);
  });
