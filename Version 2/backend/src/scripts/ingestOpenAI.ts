import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { PART_CATEGORIES } from '../generate/constants';
import { fetchMajorCities } from '../sources/wikidata';
import { normalizeNodes } from '../ingestion/normalizeNodes';
import { buildMultiSegmentPath } from '../generate/paths';
import {
  buildDeterministicId,
  buildEntityKey,
  collectUniqueLimited,
  formatAvoidList,
  sanitizeEntities,
  sanitizeSuppliers,
} from './ingestOpenAI.utils';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !openaiKey) {
  console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });

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

type EntityInput = {
  name: string;
  city: string;
  country: string;
  category?: string;
};

type SupplierInput = {
  name: string;
  city: string;
  country: string;
  parts: string[];
};

type GeneratedData = {
  companies: EntityInput[];
  suppliers: SupplierInput[];
  ports: EntityInput[];
  warehouses: EntityInput[];
  markets: EntityInput[];
  factories: EntityInput[];
};

function uniqByName<T extends { name: string }>(items: T[]) {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = item.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function cleanOutput(text: string) {
  return text.replace(/```[a-z]*\s*|\s*```/g, '').trim();
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string, headers: string[]) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const rows = [];
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    if (cells.length < headers.length) continue;
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (cells[index] ?? '').replace(/^"|"$/g, '').trim();
    });
    rows.push(record);
  }
  return rows;
}

async function requestCsv(prompt: string, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await openai.responses.create({
        model: 'gpt-4.1-mini',
        input: prompt,
        max_output_tokens: 3000,
      });
      return cleanOutput(response.output_text || '');
    } catch (error) {
      if (attempt === retries) throw error;
    }
  }
  return '';
}

async function requestData(
  counts: {
  companies: number;
  suppliers: number;
  ports: number;
  warehouses: number;
  markets: number;
  factories: number;
  },
  avoid?: Partial<Record<'companies' | 'suppliers' | 'ports' | 'warehouses' | 'markets' | 'factories', string>>,
): Promise<GeneratedData> {
  const companiesCsv =
    counts.companies > 0
      ? await requestCsv(`
Return ONLY CSV with header: name,city,country
All names must be real electronics companies.
All city/country must be real and filled.
Avoid placeholders (Unknown, N/A, TBD, commas).
${avoid?.companies ? `Do NOT include any of these names: ${avoid.companies}` : ''}
Count: ${counts.companies}
No extra text or markdown.
`)
      : '';
  const suppliersCsv =
    counts.suppliers > 0
      ? await requestCsv(`
Return ONLY CSV with header: name,city,country,parts
All names must be real electronics/semiconductor suppliers.
parts must be semicolon-separated list (e.g. "DRAM;NAND;PMIC").
All city/country must be real and filled.
Avoid placeholders (Unknown, N/A, TBD, commas).
${avoid?.suppliers ? `Do NOT include any of these names: ${avoid.suppliers}` : ''}
Count: ${counts.suppliers}
No extra text or markdown.
`)
      : '';
  const portsCsv =
    counts.ports > 0
      ? await requestCsv(`
Return ONLY CSV with header: name,city,country
All names must be real ports.
All city/country must be real and filled.
Avoid placeholders (Unknown, N/A, TBD, commas).
${avoid?.ports ? `Do NOT include any of these names: ${avoid.ports}` : ''}
Count: ${counts.ports}
No extra text or markdown.
`)
      : '';
  const warehousesCsv =
    counts.warehouses > 0
      ? await requestCsv(`
Return ONLY CSV with header: name,city,country
All names must be real logistics hubs or warehouses.
All city/country must be real and filled.
Avoid placeholders (Unknown, N/A, TBD, commas).
${avoid?.warehouses ? `Do NOT include any of these names: ${avoid.warehouses}` : ''}
Count: ${counts.warehouses}
No extra text or markdown.
`)
      : '';
  const marketsCsv =
    counts.markets > 0
      ? await requestCsv(`
Return ONLY CSV with header: name,city,country
All names must be real markets/major cities.
All city/country must be real and filled.
Avoid placeholders (Unknown, N/A, TBD, commas).
${avoid?.markets ? `Do NOT include any of these names: ${avoid.markets}` : ''}
Count: ${counts.markets}
No extra text or markdown.
`)
      : '';
  const factoriesCsv =
    counts.factories > 0
      ? await requestCsv(`
Return ONLY CSV with header: name,city,country
All names must be real electronics manufacturing plants or fabs.
All city/country must be real and filled.
Avoid placeholders (Unknown, N/A, TBD, commas).
${avoid?.factories ? `Do NOT include any of these names: ${avoid.factories}` : ''}
Count: ${counts.factories}
No extra text or markdown.
`)
      : '';

  const companies = parseCsv(companiesCsv, ['name', 'city', 'country']) as EntityInput[];
  const suppliers = parseCsv(suppliersCsv, ['name', 'city', 'country', 'parts']).map((row) => ({
    name: row.name,
    city: row.city,
    country: row.country,
    parts: row.parts
      ? row.parts.split(';').map((part) => part.trim()).filter(Boolean)
      : [],
  })) as SupplierInput[];
  const ports = parseCsv(portsCsv, ['name', 'city', 'country']) as EntityInput[];
  const warehouses = parseCsv(warehousesCsv, ['name', 'city', 'country']) as EntityInput[];
  const markets = parseCsv(marketsCsv, ['name', 'city', 'country']) as EntityInput[];
  const factories = parseCsv(factoriesCsv, ['name', 'city', 'country']) as EntityInput[];

  return { companies, suppliers, ports, warehouses, markets, factories };
}

async function mergeData(target: GeneratedData, incoming: GeneratedData) {
  target.companies.push(...incoming.companies);
  target.suppliers.push(...incoming.suppliers);
  target.ports.push(...incoming.ports);
  target.warehouses.push(...incoming.warehouses);
  target.markets.push(...incoming.markets);
  target.factories.push(...incoming.factories);
  return target;
}

function assignCoordinates(
  items: EntityInput[],
  cities: NodeRecord[],
  fallback: NodeRecord[],
): NodeRecord[] {
  const lookup = cities.length > 0 ? cities : fallback;
  return items.map((item) => {
    const cityMatch =
      lookup.find(
        (city) =>
          city.city?.toLowerCase() === item.city.toLowerCase() &&
          city.country?.toLowerCase() === item.country.toLowerCase(),
      ) ?? lookup.find((city) => city.country?.toLowerCase() === item.country.toLowerCase()) ??
      lookup[0];
    return {
      id: buildDeterministicId('node', item.name),
      name: item.name,
      lat: cityMatch?.lat ?? 0,
      lng: cityMatch?.lng ?? 0,
      city: item.city,
      country: item.country,
    };
  });
}

function buildSupplierCatalog(parts: string[]) {
  const catalog: Record<string, { part: string; unit: string; min: number; max: number }[]> = {};
  for (const part of parts) {
    const category = PART_CATEGORIES.find((entry) =>
      entry.parts.some((partName) => part.toLowerCase().includes(partName.toLowerCase().split(' ')[0])),
    );
    const range = category?.priceRange ?? [2, 30];
    catalog[category?.category ?? 'components.passives'] = [
      {
        part,
        unit: 'USD',
        min: Number((range[0] * 0.8).toFixed(2)),
        max: Number((range[1] * 1.2).toFixed(2)),
      },
    ];
  }
  return catalog;
}

async function fillUntil(
  target: GeneratedData,
  baseCounts: GeneratedData,
  seen: {
    companies: Set<string>;
    suppliers: Set<string>;
    ports: Set<string>;
    warehouses: Set<string>;
    markets: Set<string>;
    factories: Set<string>;
  },
  existingNames: {
    companies: string[];
    suppliers: string[];
    ports: string[];
    warehouses: string[];
    markets: string[];
    factories: string[];
  },
  maxRuns = 10,
) {
  for (let run = 0; run < maxRuns; run += 1) {
    const remaining = {
      companies: Math.max(0, baseCounts.companies.length - target.companies.length),
      suppliers: Math.max(0, baseCounts.suppliers.length - target.suppliers.length),
      ports: Math.max(0, baseCounts.ports.length - target.ports.length),
      warehouses: Math.max(0, baseCounts.warehouses.length - target.warehouses.length),
      markets: Math.max(0, baseCounts.markets.length - target.markets.length),
      factories: Math.max(0, baseCounts.factories.length - target.factories.length),
    };
    if (
      remaining.companies === 0 &&
      remaining.suppliers === 0 &&
      remaining.ports === 0 &&
      remaining.warehouses === 0 &&
      remaining.markets === 0 &&
      remaining.factories === 0
    ) {
      break;
    }
    const avoid =
      remaining.companies <= 10 ||
      remaining.suppliers <= 10 ||
      remaining.ports <= 10 ||
      remaining.warehouses <= 10 ||
      remaining.markets <= 10 ||
      remaining.factories <= 10
        ? {
            companies: remaining.companies > 0 ? formatAvoidList(existingNames.companies, 50) : undefined,
            suppliers: remaining.suppliers > 0 ? formatAvoidList(existingNames.suppliers, 80) : undefined,
            ports: remaining.ports > 0 ? formatAvoidList(existingNames.ports, 60) : undefined,
            warehouses: remaining.warehouses > 0 ? formatAvoidList(existingNames.warehouses, 60) : undefined,
            markets: remaining.markets > 0 ? formatAvoidList(existingNames.markets, 60) : undefined,
            factories: remaining.factories > 0 ? formatAvoidList(existingNames.factories, 60) : undefined,
          }
        : undefined;

    const chunk = await requestData(
      {
      companies: remaining.companies > 0 ? Math.max(remaining.companies, 15) : 0,
      suppliers: remaining.suppliers > 0 ? Math.max(remaining.suppliers, 80) : 0,
      ports: remaining.ports > 0 ? Math.max(remaining.ports, 30) : 0,
      warehouses: remaining.warehouses > 0 ? Math.max(remaining.warehouses, 40) : 0,
      markets: remaining.markets > 0 ? Math.max(remaining.markets, 30) : 0,
      factories: remaining.factories > 0 ? Math.max(remaining.factories, 40) : 0,
      },
      avoid,
    );
    const newCompanies = collectUniqueLimited(
      sanitizeEntities(chunk.companies),
      seen.companies,
      remaining.companies,
    );
    const newSuppliers = collectUniqueLimited(
      sanitizeSuppliers(chunk.suppliers),
      seen.suppliers,
      remaining.suppliers,
    );
    const newPorts = collectUniqueLimited(sanitizeEntities(chunk.ports), seen.ports, remaining.ports);
    const newWarehouses = collectUniqueLimited(
      sanitizeEntities(chunk.warehouses),
      seen.warehouses,
      remaining.warehouses,
    );
    const newMarkets = collectUniqueLimited(sanitizeEntities(chunk.markets), seen.markets, remaining.markets);
    const newFactories = collectUniqueLimited(
      sanitizeEntities(chunk.factories),
      seen.factories,
      remaining.factories,
    );
    await mergeData(target, {
      companies: newCompanies,
      suppliers: newSuppliers,
      ports: newPorts,
      warehouses: newWarehouses,
      markets: newMarkets,
      factories: newFactories,
    });
  }
}

async function fetchAll<T>(
  table: string,
  select: string,
  buildQuery?: (query: any) => any,
) {
  const pageSize = 1000;
  let offset = 0;
  const results: T[] = [];
  while (true) {
    let query: any = supabase.from(table).select(select).range(offset, offset + pageSize - 1);
    if (buildQuery) {
      query = buildQuery(query);
    }
    const { data, error } = await query;
    if (error) {
      throw error;
    }
    const rows = (data ?? []) as T[];
    results.push(...rows);
    if (rows.length < pageSize) {
      break;
    }
    offset += pageSize;
  }
  return results;
}

async function loadExistingData() {
  const [nodes, suppliers, paths] = await Promise.all([
    fetchAll<NodeRecord>('companies', 'id,name,city,country,lat,lng,node_type,type,source,tags'),
    fetchAll<{ name: string; city: string; country: string; id: string; company_id: string; tier: number; lat: number; lng: number; materials: string[]; products: string[]; price_catalog: Record<string, unknown> }>(
      'suppliers',
      'id,company_id,name,tier,city,country,lat,lng,materials,products,price_catalog',
    ),
    fetchAll<{ company_id: string }>('supply_paths', 'company_id'),
  ]);

  const seen = {
    companies: new Set<string>(),
    suppliers: new Set<string>(),
    ports: new Set<string>(),
    warehouses: new Set<string>(),
    markets: new Set<string>(),
    factories: new Set<string>(),
  };

  const existingNodes = {
    companies: [] as NodeRecord[],
    ports: [] as NodeRecord[],
    warehouses: [] as NodeRecord[],
    markets: [] as NodeRecord[],
    factories: [] as NodeRecord[],
  };
  const existingNames = {
    companies: [] as string[],
    suppliers: [] as string[],
    ports: [] as string[],
    warehouses: [] as string[],
    markets: [] as string[],
    factories: [] as string[],
  };

  for (const node of nodes) {
    const rawType = (node.node_type ?? node.type ?? '').toLowerCase();
    const entity = { name: node.name, city: node.city ?? '', country: node.country ?? '' };
    const cleaned = sanitizeEntities([entity]);
    if (cleaned.length === 0) continue;
    const key = buildEntityKey(cleaned[0]);
    if (rawType === 'company') {
      seen.companies.add(key);
      existingNodes.companies.push(node);
      existingNames.companies.push(node.name);
    } else if (rawType === 'port') {
      seen.ports.add(key);
      existingNodes.ports.push(node);
      existingNames.ports.push(node.name);
    } else if (rawType === 'warehouse' || rawType === 'hub') {
      seen.warehouses.add(key);
      existingNodes.warehouses.push({ ...node, node_type: 'warehouse' });
      existingNames.warehouses.push(node.name);
    } else if (rawType === 'market') {
      seen.markets.add(key);
      existingNodes.markets.push(node);
      existingNames.markets.push(node.name);
    } else if (rawType === 'factory') {
      seen.factories.add(key);
      existingNodes.factories.push(node);
      existingNames.factories.push(node.name);
    }
  }

  for (const supplier of suppliers) {
    const cleaned = sanitizeEntities([
      { name: supplier.name, city: supplier.city ?? '', country: supplier.country ?? '' },
    ]);
    if (cleaned.length === 0) continue;
    seen.suppliers.add(buildEntityKey(cleaned[0]));
    existingNames.suppliers.push(supplier.name);
  }

  return {
    seen,
    existingNodes,
    existingSuppliers: suppliers,
    existingNames,
    existingPathCompanies: new Set(paths.map((path) => path.company_id)),
  };
}

async function ingestOpenAI() {
  console.log('Starting OpenAI ingestion...');
  const { seen, existingNodes, existingSuppliers, existingNames, existingPathCompanies } =
    await loadExistingData();

  const majorCities = await fetchMajorCities(120);
  const fallbackMarkets = majorCities.map((city, index) => ({
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

  const data: GeneratedData = {
    companies: [],
    suppliers: [],
    ports: [],
    warehouses: [],
    markets: [],
    factories: [],
  };
  await fillUntil(
    data,
    {
      companies: Array(Math.max(0, 30 - seen.companies.size)).fill({ name: '', city: '', country: '' }),
      suppliers: Array(Math.max(0, 150 - seen.suppliers.size)).fill({ name: '', city: '', country: '', parts: [] }),
      ports: Array(Math.max(0, 60 - seen.ports.size)).fill({ name: '', city: '', country: '' }),
      warehouses: Array(Math.max(0, 80 - seen.warehouses.size)).fill({ name: '', city: '', country: '' }),
      markets: Array(Math.max(0, 60 - seen.markets.size)).fill({ name: '', city: '', country: '' }),
      factories: Array(Math.max(0, 80 - seen.factories.size)).fill({ name: '', city: '', country: '' }),
    },
    seen,
    existingNames,
  );

  data.companies = uniqByName(sanitizeEntities(data.companies));
  data.suppliers = uniqByName(sanitizeSuppliers(data.suppliers));
  data.ports = uniqByName(sanitizeEntities(data.ports));
  data.warehouses = uniqByName(sanitizeEntities(data.warehouses));
  data.markets = uniqByName(sanitizeEntities(data.markets));
  data.factories = uniqByName(sanitizeEntities(data.factories));

  const outputDir = path.join(__dirname, '../../../../data/generated');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(path.join(outputDir, 'companies.csv'), 'name,city,country\n' + data.companies.map((c) => `"${c.name}","${c.city}","${c.country}"`).join('\n'));
  fs.writeFileSync(
    path.join(outputDir, 'suppliers.csv'),
    'name,city,country,parts\n' +
    data.suppliers.map((s) => `"${s.name}","${s.city}","${s.country}","${s.parts.join(';')}"`).join('\n'),
  );
  fs.writeFileSync(path.join(outputDir, 'ports.csv'), 'name,city,country\n' + data.ports.map((p) => `"${p.name}","${p.city}","${p.country}"`).join('\n'));
  fs.writeFileSync(
    path.join(outputDir, 'warehouses.csv'),
    'name,city,country\n' + data.warehouses.map((w) => `"${w.name}","${w.city}","${w.country}"`).join('\n'),
  );
  fs.writeFileSync(
    path.join(outputDir, 'markets.csv'),
    'name,city,country\n' + data.markets.map((m) => `"${m.name}","${m.city}","${m.country}"`).join('\n'),
  );
  fs.writeFileSync(
    path.join(outputDir, 'factories.csv'),
    'name,city,country\n' + data.factories.map((f) => `"${f.name}","${f.city}","${f.country}"`).join('\n'),
  );

  const companies = assignCoordinates(
    uniqByName(data.companies),
    fallbackMarkets,
    fallbackMarkets,
  ).map((company) => ({
    ...company,
      id: buildDeterministicId('company', company.name),
    node_type: 'company',
    type: 'company',
    source: 'openai',
    products: PART_CATEGORIES.map((category) => category.category),
    tags: ['electronics', 'company'],
  }));

  const ports = assignCoordinates(uniqByName(data.ports), fallbackMarkets, fallbackMarkets).map(
    (port) => ({
      ...port,
      id: buildDeterministicId('port', port.name),
      node_type: 'port',
      type: 'port',
      source: 'openai',
      tags: ['port'],
    }),
  );

  const warehouses = assignCoordinates(uniqByName(data.warehouses), fallbackMarkets, fallbackMarkets).map(
    (warehouse) => ({
      ...warehouse,
      id: buildDeterministicId('warehouse', warehouse.name),
      node_type: 'warehouse',
      type: 'warehouse',
      source: 'openai',
      tags: ['warehouse', 'logistics'],
    }),
  );

  const factories = assignCoordinates(uniqByName(data.factories), fallbackMarkets, fallbackMarkets).map(
    (factory) => ({
      ...factory,
      id: buildDeterministicId('factory', factory.name),
      node_type: 'factory',
      type: 'factory',
      source: 'openai',
      tags: ['factory', 'manufacturing'],
    }),
  );

  const markets = assignCoordinates(uniqByName(data.markets), fallbackMarkets, fallbackMarkets).map(
    (market) => ({
      ...market,
      id: buildDeterministicId('market', market.name),
      node_type: 'market',
      type: 'market',
      source: 'openai',
      tags: ['market'],
    }),
  );

  const suppliers = uniqByName(data.suppliers).map((supplier) => ({
    id: buildDeterministicId('supplier', supplier.name),
    companyId: buildDeterministicId('supplier', supplier.name),
    name: supplier.name,
    tier: 2,
    country: supplier.country,
    city: supplier.city,
    parts: supplier.parts,
    priceCatalog: buildSupplierCatalog(supplier.parts),
  }));

  const supplierNodes = assignCoordinates(
    suppliers.map((supplier) => ({
      name: supplier.name,
      city: supplier.city,
      country: supplier.country,
    })),
    fallbackMarkets,
    fallbackMarkets,
  ).map((node, index) => ({
    ...node,
    id: suppliers[index].companyId,
    node_type: 'supplier',
    type: 'supplier',
    source: 'openai',
    tags: suppliers[index].parts,
  }));

  const baseNodes = normalizeNodes([
    ...companies,
    ...ports,
    ...warehouses,
    ...factories,
    ...markets,
  ]);
  const allNodes = Array.from(
    new Map([...baseNodes, ...supplierNodes].map((node) => [node.id, node])).values(),
  );

  console.log(`Upserting ${allNodes.length} nodes...`);
  for (const chunk of [allNodes]) {
    const { error } = await supabase.from('companies').upsert(chunk, { onConflict: 'id' });
    if (error) console.error('Node upsert error:', error.message);
  }

  console.log(`Upserting ${suppliers.length} suppliers...`);
  const supplierPayload = suppliers.map((supplier, index) => ({
    id: supplier.id,
    company_id: supplier.companyId,
    name: supplier.name,
    tier: supplier.tier,
    country: supplier.country,
    city: supplier.city,
    lat: supplierNodes[index].lat,
    lng: supplierNodes[index].lng,
    products: supplier.parts,
    materials: supplier.parts,
    price_catalog: supplier.priceCatalog,
  }));
  const { error: supplierError } = await supabase.from('suppliers').upsert(supplierPayload, { onConflict: 'id' });
  if (supplierError) console.error('Supplier upsert error:', supplierError.message);

  console.log('Generating supply paths...');
  const nodeIdSet = new Set(allNodes.map((node) => node.id));

  const companiesForPaths = [...companies, ...existingNodes.companies]
    .filter((company) => company.lat !== undefined && company.lng !== undefined)
    .reduce((acc, company) => {
      if (!acc.seen.has(company.id)) {
        acc.seen.add(company.id);
        acc.items.push(company);
      }
      return acc;
    }, { seen: new Set<string>(), items: [] as NodeRecord[] }).items
    .slice(0, 30);

  const supplierPool = [
    ...supplierPayload.map((supplier, index) => ({
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
    })),
    ...existingSuppliers.map((supplier) => ({
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
      priceCatalog:
        (supplier.price_catalog ?? {}) as Record<string, { part: string; unit: string; min: number; max: number }[]>,
    })),
  ];

  const portsForPaths = [...ports, ...existingNodes.ports];
  const warehousesForPaths = [...warehouses, ...existingNodes.warehouses];
  const factoriesForPaths = [...factories, ...existingNodes.factories];
  const marketsForPaths = [...markets, ...existingNodes.markets];

  for (const company of companiesForPaths) {
    if (existingPathCompanies.has(company.id)) {
      continue;
    }
    const pathId = randomUUID();
    const { edges, materials } = buildMultiSegmentPath({
      company,
      suppliers: supplierPool,
      factories: factoriesForPaths,
      warehouses: warehousesForPaths,
      ports: portsForPaths,
      markets: marketsForPaths,
    });

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

    const connections = edges
      .filter((edge) => nodeIdSet.has(edge.fromNodeId) && nodeIdSet.has(edge.toNodeId))
      .map((edge, index) => ({
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

  console.log('OpenAI ingestion complete.');
}

ingestOpenAI()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('OpenAI ingestion failed:', error);
    process.exit(1);
  });
