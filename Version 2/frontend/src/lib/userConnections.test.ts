import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('userConnections api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  test('fetchUserConnections requests the user connections endpoint', async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 'user-1' }],
    });

    const { fetchUserConnections } = await import('./userConnections');
    const result = await fetchUserConnections();

    expect(result).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/user-connections');
  });

  test('createUserConnection posts defaults for transport and status', async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'user-2', from_node_id: 'node-a', to_node_id: 'node-b' }),
    });

    const { createUserConnection } = await import('./userConnections');
    await createUserConnection({ from_node_id: 'node-a', to_node_id: 'node-b' });

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(options?.body as string);

    expect(options?.method).toBe('POST');
    expect(payload.transport_mode).toBe('land');
    expect(payload.status).toBe('healthy');
    expect(payload.is_user_connection).toBe(true);
  });
});
