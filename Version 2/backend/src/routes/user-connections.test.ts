import express from 'express';
import request from 'supertest';
import { describe, expect, test, vi } from 'vitest';

const listRow = {
  id: 'user-conn-1',
  from_node_id: 'node-a',
  to_node_id: 'node-b',
  transport_mode: 'land',
  status: 'healthy',
  is_user_connection: true,
  materials: ['chips'],
  description: 'User path',
  lead_time_days: 3,
};

const insertRow = {
  ...listRow,
  id: 'user-conn-2',
};

const insertMock = vi.fn(() => ({
  select: vi.fn(() => ({
    single: vi.fn(async () => ({ data: insertRow, error: null })),
  })),
}));

const deleteMock = vi.fn(() => ({
  eq: vi.fn(async () => ({ error: null })),
}));

const selectMock = vi.fn(() => ({
  order: vi.fn(async () => ({ data: [listRow], error: null })),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'user_connections') {
        return {
          select: selectMock,
          insert: insertMock,
          delete: deleteMock,
        };
      }
      return { select: vi.fn(), insert: vi.fn() };
    }),
  },
}));

describe('user-connections route', () => {
  test('returns user connections', async () => {
    const app = express();
    const router = (await import('./user-connections')).default;
    app.use('/api/user-connections', router);

    const res = await request(app).get('/api/user-connections');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].fromNodeId).toBe('node-a');
    expect(res.body[0].isUserConnection).toBe(true);
  });

  test('rejects missing from/to node ids', async () => {
    const app = express();
    const router = (await import('./user-connections')).default;
    app.use(express.json());
    app.use('/api/user-connections', router);

    const res = await request(app).post('/api/user-connections').send({ from_node_id: 'node-a' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('from_node_id and to_node_id are required');
  });

  test('inserts user connection and forces user flag', async () => {
    const app = express();
    const router = (await import('./user-connections')).default;
    app.use(express.json());
    app.use('/api/user-connections', router);

    const res = await request(app).post('/api/user-connections').send({
      from_node_id: 'node-a',
      to_node_id: 'node-b',
      is_user_connection: false,
    });

    expect(res.status).toBe(201);
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from_node_id: 'node-a',
        to_node_id: 'node-b',
        is_user_connection: true,
      }),
    );
    expect(res.body.isUserConnection).toBe(true);
  });

  test('deletes user connection by id', async () => {
    const app = express();
    const router = (await import('./user-connections')).default;
    app.use('/api/user-connections', router);

    const res = await request(app).delete('/api/user-connections/user-conn-1');

    expect(res.status).toBe(200);
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });
});
