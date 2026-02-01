import { describe, expect, it } from 'vitest';
import {
  normalizeNewsItems,
  normalizeNodes,
  normalizeRiskZones,
  normalizeRoutes,
} from './transformers';

describe('normalizeRiskZones', () => {
  it('maps API risk zones to app risk zones', () => {
    const zones = normalizeRiskZones([
      {
        id: 'zone-1',
        name: 'Test Zone',
        type: 'storm',
        coordinates: [10, 20],
        intensity: 0.5,
        radius: 120,
        description: 'Storm test',
      },
    ]);

    expect(zones).toHaveLength(1);
    expect(zones[0]).toEqual({
      id: 'zone-1',
      name: 'Test Zone',
      type: 'storm',
      coordinates: [10, 20],
      intensity: 0.5,
      radius: 120,
      description: 'Storm test',
    });
  });
});

describe('normalizeNewsItems', () => {
  it('converts timestamps to Date objects', () => {
    const items = normalizeNewsItems([
      {
        id: 'news-1',
        title: 'Supply chain update',
        source: 'GDELT',
        severity: 'critical',
        region: 'Global',
        impactScore: 82,
        timestamp: '2025-01-01T00:00:00.000Z',
      },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0].timestamp).toBeInstanceOf(Date);
    expect(items[0].timestamp.toISOString()).toBe('2025-01-01T00:00:00.000Z');
  });

  it('defaults unknown severity to info', () => {
    const items = normalizeNewsItems([
      {
        id: 'news-2',
        title: 'Unknown severity',
        source: 'GDELT',
        severity: 'unknown',
        region: 'Global',
        impactScore: 10,
        timestamp: '2025-01-02T00:00:00.000Z',
      },
    ]);

    expect(items[0].severity).toBe('info');
  });
});

describe('normalizeNodes', () => {
  it('normalizes Point coordinates and country code', () => {
    const nodes = normalizeNodes([
      {
        id: 'node-1',
        name: 'Port Alpha',
        type: 'port',
        coordinates: { type: 'Point', coordinates: [100, 2] },
        country: 'Wonderland',
        country_code: 'WL',
        risk_score: 12,
        metadata: {},
      },
    ]);

    expect(nodes).toHaveLength(1);
    expect(nodes[0].coordinates).toEqual([100, 2]);
    expect(nodes[0].countryCode).toBe('WL');
    expect(nodes[0].riskScore).toBe(12);
  });
});

describe('normalizeRoutes', () => {
  it('skips routes without coordinates', () => {
    const routes = normalizeRoutes([
      {
        id: 'route-1',
        name: 'Missing coords',
        source_id: 'a',
        destination_id: 'b',
        transport_mode: 'sea',
        status: 'healthy',
        risk_score: 20,
      },
    ]);

    expect(routes).toHaveLength(0);
  });

  it('keeps routes with coordinate arrays', () => {
    const routes = normalizeRoutes([
      {
        id: 'route-2',
        name: 'Has coords',
        source_id: 'a',
        destination_id: 'b',
        transport_mode: 'sea',
        status: 'healthy',
        risk_score: 20,
        coordinates: [
          [1, 2],
          [3, 4],
        ],
      },
    ]);

    expect(routes).toHaveLength(1);
    expect(routes[0].coordinates).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });
});
