import { describe, expect, test } from 'vitest';
import { buildMultiSegmentPath } from './paths';

describe('buildMultiSegmentPath', () => {
  test('returns a full multi-segment path', () => {
    const company = { id: 'c1', name: 'Company', lat: 10, lng: 10, node_type: 'company' };
    const suppliers = [
      {
        id: 's1',
        companyId: 's1',
        name: 'Supplier',
        tier: 1,
        country: 'US',
        city: 'Austin',
        lat: 11,
        lng: 11,
        materials: ['semiconductors.logic'],
        products: ['Logic IC'],
        priceCatalog: {},
      },
    ];
    const factories = [{ id: 'f1', name: 'Factory', lat: 12, lng: 12, node_type: 'factory' }];
    const warehouses = [{ id: 'w1', name: 'Warehouse', lat: 13, lng: 13, node_type: 'warehouse' }];
    const ports = [
      { id: 'p1', name: 'Port', lat: 14, lng: 14, node_type: 'port' },
      { id: 'p2', name: 'Port2', lat: 20, lng: 20, node_type: 'port' },
    ];
    const markets = [{ id: 'm1', name: 'Market', lat: 15, lng: 15, node_type: 'market' }];

    const result = buildMultiSegmentPath({
      company,
      suppliers,
      factories,
      warehouses,
      ports,
      markets,
    });

    expect(result.edges.length).toBe(6);
  });

  test('returns empty edges when required nodes are missing', () => {
    const company = { id: 'c2', name: 'Company', lat: 10, lng: 10, node_type: 'company' };
    const factories = [{ id: 'f1', name: 'Factory', lat: 12, lng: 12, node_type: 'factory' }];
    const warehouses = [{ id: 'w1', name: 'Warehouse', lat: 13, lng: 13, node_type: 'warehouse' }];
    const ports = [
      { id: 'p1', name: 'Port', lat: 14, lng: 14, node_type: 'port' },
      { id: 'p2', name: 'Port2', lat: 20, lng: 20, node_type: 'port' },
    ];
    const markets = [{ id: 'm1', name: 'Market', lat: 15, lng: 15, node_type: 'market' }];

    const result = buildMultiSegmentPath({
      company,
      suppliers: [],
      factories,
      warehouses,
      ports,
      markets,
    });

    expect(result.edges).toHaveLength(0);
  });
});
