import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

describe('useAlternatives', () => {
  test('skips fetching when material is missing', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const { useAlternatives } = await import('./useAlternatives');
    const { result } = renderHook(() => useAlternatives(null));

    expect(result.current.loading).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  test('fetches alternatives when material is provided', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 'alt-1', name: 'Alt Supplier', lat: 1, lng: 2 }],
    });
    vi.stubGlobal('fetch', mockFetch);

    const { useAlternatives } = await import('./useAlternatives');
    const { result } = renderHook(() => useAlternatives('chips'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.alternatives).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/alternatives?material=chips',
    );
  });
});
