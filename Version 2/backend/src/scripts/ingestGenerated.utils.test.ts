import { describe, expect, test } from 'vitest';

import { buildTypedKey, collectUniqueTyped, filterNamedNodes } from './ingestGenerated.utils';

describe('ingestGenerated utils', () => {
  test('buildTypedKey prefixes type and normalizes values', () => {
    const key = buildTypedKey({ name: ' Acme ', city: ' Seoul ', country: 'KR ', node_type: 'port' });
    expect(key).toBe('port|acme|seoul|kr');
  });

  test('collectUniqueTyped respects limit and type', () => {
    const seen = new Set<string>();
    const items = [
      { name: 'Node', city: 'A', country: 'X', node_type: 'port' },
      { name: 'Node', city: 'A', country: 'X', node_type: 'warehouse' },
      { name: 'Other', city: 'B', country: 'Y', node_type: 'port' },
    ];

    const unique = collectUniqueTyped(items, seen, 2);

    expect(unique).toHaveLength(2);
    expect(seen.size).toBe(2);
    expect(seen.has('port|node|a|x')).toBe(true);
  });

  test('filterNamedNodes drops placeholder names', () => {
    const filtered = filterNamedNodes([
      { name: 'Unknown Port' },
      { name: '   ' },
      { name: 'Real Facility' },
    ]);

    expect(filtered).toEqual([{ name: 'Real Facility' }]);
  });
});
