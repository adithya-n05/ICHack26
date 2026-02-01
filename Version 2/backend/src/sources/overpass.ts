import { buildOverpassQuery } from '../ingestion/overpass';

type OverpassNode = {
  id: string;
  name: string;
  node_type: string;
  lat: number;
  lng: number;
  source: string;
  tags: string[];
};

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const GLOBAL_BBOXES: Array<{ name: string; bbox: [number, number, number, number] }> = [
  { name: 'NorthAmerica', bbox: [10.0, -170.0, 72.0, -50.0] },
  { name: 'SouthAmerica', bbox: [-56.0, -90.0, 13.0, -30.0] },
  { name: 'Europe', bbox: [35.0, -25.0, 70.0, 45.0] },
  { name: 'Africa', bbox: [-35.0, -20.0, 38.0, 55.0] },
  { name: 'MiddleEast', bbox: [12.0, 30.0, 42.0, 65.0] },
  { name: 'SouthAsia', bbox: [5.0, 60.0, 35.0, 95.0] },
  { name: 'EastAsia', bbox: [15.0, 95.0, 55.0, 145.0] },
  { name: 'SoutheastAsia', bbox: [-11.0, 90.0, 20.0, 130.0] },
  { name: 'Oceania', bbox: [-50.0, 110.0, 0.0, 180.0] },
];

const PORT_TAGS: Array<[string, string]> = [
  ['harbour', '*'],
  ['port', '*'],
  ['industrial', 'port'],
];

const FACILITY_TAGS: Array<[string, string]> = [
  ['industrial', '*'],
  ['factory', '*'],
  ['manufacturing', '*'],
  ['warehouse', '*'],
  ['logistics', '*'],
  ['building', 'warehouse'],
];

async function fetchOverpass(tags: Array<[string, string]>, bbox: [number, number, number, number]) {
  const query = buildOverpassQuery(tags, bbox);
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: query,
  });

  if (!response.ok) {
    throw new Error(`Overpass ${response.status}`);
  }

  return (await response.json()) as {
    elements?: Array<{
      id: number;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }>;
  };
}

function toNode(element: {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}, nodeType: string): OverpassNode | null {
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  if (lat === undefined || lng === undefined) {
    return null;
  }
  const name = element.tags?.name || element.tags?.operator;
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  const genericNames = new Set([
    'port',
    'port site',
    'harbour',
    'warehouse',
    'factory',
    'industrial site',
    'logistics',
    'manufacturing',
  ]);
  if (genericNames.has(normalized)) {
    return null;
  }
  const tagKeys = Object.keys(element.tags || {});
  if (tagKeys.some((tag) => ['buoy', 'anchorage', 'offshore'].includes(tag))) {
    return null;
  }
  return {
    id: `osm-${element.id}`,
    name,
    node_type: nodeType,
    lat,
    lng,
    source: 'osm',
    tags: tagKeys,
  };
}

async function fetchByTags(tags: Array<[string, string]>, nodeType: string) {
  const nodes: OverpassNode[] = [];
  for (const region of GLOBAL_BBOXES) {
    try {
      const payload = await fetchOverpass(tags, region.bbox);
      for (const element of payload.elements || []) {
        const node = toNode(element, nodeType);
        if (node) nodes.push(node);
      }
    } catch (error) {
      console.warn(`Overpass ${nodeType} failed for ${region.name}:`, error);
    }
  }
  return nodes;
}

export async function fetchPorts() {
  return fetchByTags(PORT_TAGS, 'port');
}

export async function fetchFacilities() {
  return fetchByTags(FACILITY_TAGS, 'industrial_site');
}
