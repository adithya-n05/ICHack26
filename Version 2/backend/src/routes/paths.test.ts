import express from 'express';
import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

const pathRow = {
  id: 'path-1',
  company_id: 'tsmc-hsinchu',
  product_category: 'semiconductors.logic',
  status: 'active',
};

const edgeRow = {
  id: 'edge-1',
  path_id: 'path-1',
  from_node_id: 'node-a',
  to_node_id: 'node-b',
  sequence: 0,
  cost_score: 1,
  risk_score: 0,
  tariff_cost: 0,
  product_category: 'semiconductors.logic',
  is_path_edge: true,
  transport_mode: 'sea',
  lead_time_days: 2,
  status: 'active',
  is_user_connection: false,
};

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'supply_paths') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(async () => ({ data: [pathRow], error: null })),
              })),
            })),
          })),
        };
      }
      if (table === 'connections') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(async () => ({ data: [edgeRow], error: null })),
            })),
          })),
        };
      }
      return { select: vi.fn() };
    }),
  },
}));

describe('paths route', () => {
  test('returns 400 when company_id is missing', async () => {
    const app = express();
    const router = (await import('./paths')).default;
    app.use('/api/paths', router);

    const res = await request(app).get('/api/paths');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('company_id is required');
  });

  test('returns path with edges', async () => {
    const app = express();
    const router = (await import('./paths')).default;
    app.use('/api/paths', router);

    const res = await request(app).get('/api/paths?company_id=tsmc-hsinchu');

    expect(res.status).toBe(200);
    expect(res.body.path.id).toBe('path-1');
    expect(res.body.edges).toHaveLength(1);
    expect(res.body.edges[0].fromNodeId).toBe('node-a');
  });
});
