import { describe, expect, test } from 'vitest';

import { buildDevarajaAlternatives, DEVARAJA_MARKET_ID } from './devarajaAlternatives';

const node = (
  id: string,
  type: string,
  lng: number,
  lat: number,
  name: string = id,
) => ({
  id,
  name,
  type,
  location: { lng, lat },
});

describe('buildDevarajaAlternatives', () => {
  test('returns empty when no user connections end at Devaraja', () => {
    const nodes = [
      node(DEVARAJA_MARKET_ID, 'market', 0, 0, 'Devaraja Market'),
      node('market-a', 'market', 0, 1, 'Market A'),
    ];
    const connections = [
      { id: 'conn-1', from_node_id: 'node-x', to_node_id: 'node-y', is_user_connection: true },
    ];

    const result = buildDevarajaAlternatives(nodes, connections, 2);

    expect(result.alternatives).toHaveLength(0);
    expect(result.paths).toHaveLength(0);
  });

  test('picks nearest markets and builds path metadata', () => {
    const nodes = [
      node(DEVARAJA_MARKET_ID, 'market', 0, 0, 'Devaraja Market'),
      node('market-a', 'market', 0, 1, 'Market A'),
      node('market-b', 'market', 0, 2, 'Market B'),
      node('market-c', 'market', 0, 5, 'Market C'),
      node('supplier-x', 'supplier', 2, 2, 'Supplier X'),
      node('origin-1', 'company', -5, -5, 'Origin Co'),
    ];
    const connections = [
      {
        id: 'conn-devaraja',
        from_node_id: 'origin-1',
        to_node_id: DEVARAJA_MARKET_ID,
        is_user_connection: true,
      },
    ];

    const result = buildDevarajaAlternatives(nodes, connections, 2);

    expect(result.alternatives.map((alt) => alt.id)).toEqual(['market-a', 'market-b']);
    expect(result.alternatives[0]?.originConnectionId).toBe('conn-devaraja');
    expect(result.alternatives[0]?.originFromNodeId).toBe('origin-1');
    expect(result.paths).toHaveLength(2);
    expect(result.paths[0]).toMatchObject({
      fromNodeId: 'origin-1',
      toNodeId: 'market-a',
      originConnectionId: 'conn-devaraja',
    });
  });
});
