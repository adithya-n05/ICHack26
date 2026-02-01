import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('usePaths', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  test('skips fetching when companyId is missing', async () => {
    const { usePaths } = await import('./usePaths');
    const { result } = renderHook(() => usePaths(null));

    expect(result.current.loading).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  test('fetches path data when companyId is provided', async () => {
    const mockFetch = fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        path: { id: 'path-1', status: 'active' },
        edges: [
          {
            id: 'edge-1',
            from_node_id: 'node-a',
            to_node_id: 'node-b',
            status: 'healthy',
          },
        ],
      }),
    });

    const { usePaths } = await import('./usePaths');
    const { result } = renderHook(() => usePaths('tsmc-hsinchu'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.path?.id).toBe('path-1');
    expect(result.current.edges[0]?.fromNodeId).toBe('node-a');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/paths?company_id=tsmc-hsinchu',
    );
  });
});
