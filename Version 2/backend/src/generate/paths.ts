import { PART_CATEGORIES } from './constants';
import { SupplierRecord } from './suppliers';

export type NodeLike = {
  id: string;
  name: string;
  node_type?: string;
  type?: string;
  lat: number;
  lng: number;
  country?: string;
  city?: string;
};

export type PathEdgeRecord = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  sequence: number;
  status: string;
  materials: string[];
  transportMode: string;
  leadTimeDays: number;
  unitCost: number;
  currency: string;
};

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

function pickNearest(nodes: NodeLike[], anchor: NodeLike, count = 1) {
  return [...nodes]
    .map((node) => ({ node, distance: haversineKm(anchor, node) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
    .map((entry) => entry.node);
}

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function makeEdge(
  fromNode: NodeLike,
  toNode: NodeLike,
  sequence: number,
  materials: string[],
) {
  const distance = haversineKm(fromNode, toNode);
  const transportMode = fromNode.node_type === 'port' || toNode.node_type === 'port' ? 'sea' : 'land';
  const leadTimeDays = Math.max(1, Math.round(distance / (transportMode === 'sea' ? 420 : 650)));
  const unitCost = Number((distance * (transportMode === 'sea' ? 0.08 : 0.15)).toFixed(2));

  return {
    fromNodeId: fromNode.id,
    toNodeId: toNode.id,
    sequence,
    status: Math.random() > 0.8 ? 'monitoring' : 'healthy',
    materials,
    transportMode,
    leadTimeDays,
    unitCost,
    currency: 'USD',
  };
}

export function buildMultiSegmentPath(input: {
  company: NodeLike;
  suppliers: SupplierRecord[];
  factories: NodeLike[];
  warehouses: NodeLike[];
  ports: NodeLike[];
  markets: NodeLike[];
}) {
  const { company, suppliers, factories, warehouses, ports, markets } = input;
  if (
    suppliers.length === 0 ||
    factories.length === 0 ||
    warehouses.length === 0 ||
    ports.length < 2 ||
    markets.length === 0
  ) {
    return { nodes: [], edges: [], materials: [] };
  }

  const supplier = pickNearest(
    suppliers.map((supplier) => ({
      id: supplier.companyId,
      name: supplier.name,
      lat: supplier.lat,
      lng: supplier.lng,
      node_type: 'supplier',
      type: 'supplier',
      city: supplier.city,
      country: supplier.country,
    })),
    company,
    1,
  )[0];

  const factory = pickNearest(factories, supplier ?? company, 1)[0] ?? pickRandom(factories);
  const warehouse = pickNearest(warehouses, factory ?? company, 1)[0] ?? pickRandom(warehouses);
  const originPort = pickNearest(ports, warehouse ?? company, 1)[0] ?? pickRandom(ports);
  const destinationPort = pickNearest(
    ports.filter((port) => port.id !== originPort?.id),
    originPort ?? company,
    1,
  )[0] ?? pickRandom(ports);
  const market = pickNearest(markets, destinationPort ?? company, 1)[0] ?? pickRandom(markets);

  const materialCategory = pickRandom(PART_CATEGORIES);
  const materials = [materialCategory.category, pickRandom(materialCategory.parts)];

  const nodes = [company, supplier, factory, warehouse, originPort, destinationPort, market].filter(
    Boolean,
  ) as NodeLike[];

  const edges: PathEdgeRecord[] = [];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const edge = makeEdge(nodes[i], nodes[i + 1], i, materials);
    edges.push({ ...edge, id: `${company.id}-edge-${i}` });
  }

  return { nodes, edges, materials };
}
