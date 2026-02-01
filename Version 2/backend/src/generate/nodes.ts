import { REGION_CENTERS } from './constants';

export type GeneratedNode = {
  id: string;
  name: string;
  node_type: string;
  type: string;
  lat: number;
  lng: number;
  country: string;
  city: string;
  source: string;
  tags: string[];
};

function jitter(value: number, delta: number) {
  return value + (Math.random() - 0.5) * delta;
}

export function generateWarehouseNodes(countPerRegion = 4) {
  const nodes: GeneratedNode[] = [];
  REGION_CENTERS.forEach((region) => {
    for (let i = 0; i < countPerRegion; i += 1) {
      nodes.push({
        id: `warehouse-${region.code}-${i + 1}`,
        name: `${region.city} Logistics Hub ${i + 1}`,
        node_type: 'warehouse',
        type: 'warehouse',
        lat: jitter(region.lat, 1.8),
        lng: jitter(region.lng, 1.8),
        country: region.country,
        city: region.city,
        source: 'synthetic',
        tags: ['warehouse', 'logistics'],
      });
    }
  });
  return nodes;
}

export function generateMarketNodes(countPerRegion = 3) {
  const nodes: GeneratedNode[] = [];
  REGION_CENTERS.forEach((region) => {
    for (let i = 0; i < countPerRegion; i += 1) {
      nodes.push({
        id: `market-${region.code}-${i + 1}`,
        name: `${region.city} Market ${i + 1}`,
        node_type: 'market',
        type: 'market',
        lat: jitter(region.lat, 2.5),
        lng: jitter(region.lng, 2.5),
        country: region.country,
        city: region.city,
        source: 'synthetic',
        tags: ['market'],
      });
    }
  });
  return nodes;
}

export function generateFactoryNodes(countPerRegion = 3) {
  const nodes: GeneratedNode[] = [];
  REGION_CENTERS.forEach((region) => {
    for (let i = 0; i < countPerRegion; i += 1) {
      nodes.push({
        id: `factory-${region.code}-${i + 1}`,
        name: `${region.city} Manufacturing Site ${i + 1}`,
        node_type: 'factory',
        type: 'factory',
        lat: jitter(region.lat, 2.0),
        lng: jitter(region.lng, 2.0),
        country: region.country,
        city: region.city,
        source: 'synthetic',
        tags: ['factory', 'manufacturing'],
      });
    }
  });
  return nodes;
}
