import { describe, expect, test } from 'vitest';

import {
  buildDeterministicId,
  buildEntityKey,
  collectUnique,
  collectUniqueLimited,
  formatAvoidList,
  sanitizeEntities,
  sanitizeSuppliers,
} from './ingestOpenAI.utils';

describe('ingestOpenAI utils', () => {
  test('sanitizeEntities trims and drops invalid locations', () => {
    const result = sanitizeEntities([
      { name: 'Acme', city: '  Austin ', country: '  USA ' },
      { name: 'BadCo', city: '', country: 'USA' },
      { name: 'CommaCity', city: ',', country: 'UK' },
      { name: 'UnknownTown', city: 'Unknown', country: 'USA' },
    ]);

    expect(result).toEqual([{ name: 'Acme', city: 'Austin', country: 'USA' }]);
  });

  test('buildEntityKey normalizes case and whitespace', () => {
    const key = buildEntityKey({ name: '  Foo Inc ', city: ' Seoul ', country: 'KR ' });
    expect(key).toBe('foo inc|seoul|kr');
  });

  test('collectUnique filters by key and updates seen set', () => {
    const seen = new Set<string>(['alpha|singapore|sg']);
    const items = [
      { name: 'Alpha', city: 'Singapore', country: 'SG' },
      { name: 'Beta', city: 'Tokyo', country: 'Japan' },
      { name: 'BETA', city: 'Tokyo', country: 'Japan' },
    ];

    const unique = collectUnique(items, seen);

    expect(unique).toEqual([{ name: 'Beta', city: 'Tokyo', country: 'Japan' }]);
    expect(seen.has('beta|tokyo|japan')).toBe(true);
    expect(seen.size).toBe(2);
  });

  test('buildDeterministicId avoids slug collisions', () => {
    const idA = buildDeterministicId('company', 'A&B');
    const idB = buildDeterministicId('company', 'A B');
    expect(idA).not.toBe(idB);
  });

  test('collectUniqueLimited respects limit', () => {
    const seen = new Set<string>();
    const items = [
      { name: 'A', city: 'Seoul', country: 'KR' },
      { name: 'B', city: 'Tokyo', country: 'Japan' },
      { name: 'C', city: 'Austin', country: 'USA' },
    ];

    const limited = collectUniqueLimited(items, seen, 1);

    expect(limited).toHaveLength(1);
    expect(seen.size).toBe(1);
  });

  test('formatAvoidList trims, dedupes, and limits', () => {
    const result = formatAvoidList([' A ', 'B', 'a', 'C'], 2);
    expect(result).toBe('A, B');
  });

  test('sanitizeSuppliers preserves parts and filters invalid rows', () => {
    const result = sanitizeSuppliers([
      { name: 'Valid', city: 'Osaka', country: 'Japan', parts: ['NAND'] },
      { name: 'Bad', city: 'Unknown', country: 'Japan', parts: ['DRAM'] },
    ]);

    expect(result).toEqual([{ name: 'Valid', city: 'Osaka', country: 'Japan', parts: ['NAND'] }]);
  });
});
