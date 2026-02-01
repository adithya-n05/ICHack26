import express from 'express';
import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';
import pathsRouter from './paths';

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: supabaseMock,
}));

const createQuery = (result: { data: unknown; error: string | null }) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  then: (resolve: (value: typeof result) => void, reject: (err: Error) => void) =>
    Promise.resolve(result).then(resolve, reject),
});

describe('GET /api/paths', () => {
  test('returns latest path and edges for company', async () => {
    const path = {
      id: 'path-1',
      company_id: 'tsmc-hsinchu',
      product_category: 'semiconductors',
      status: 'active',
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
    };
    const edges = [
      {
        id: 'edge-1',
        from_node_id: 'node-a',
        to_node_id: 'node-b',
        transport_mode: 'sea',
        status: 'healthy',
        is_user_connection: false,
        sequence: 1,
        path_id: 'path-1',
      },
    ];

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'supply_paths') {
        return createQuery({ data: [path], error: null });
      }
      if (table === 'connections') {
        return createQuery({ data: edges, error: null });
      }
      return createQuery({ data: [], error: null });
    });

    const app = express();
    app.use('/api/paths', pathsRouter);

    const response = await request(app)
      .get('/api/paths')
      .query({ company_id: 'tsmc-hsinchu' });

    expect(response.status).toBe(200);
    expect(response.body.path.id).toBe('path-1');
    expect(response.body.edges).toHaveLength(1);
    expect(response.body.edges[0].fromNodeId).toBe('node-a');
  });
});
