import { expect, test } from 'vitest';
import { normalizeNodes } from './normalizeNodes';

test('dedupes by name + proximity', () => {
  const nodes = normalizeNodes([
    { name: 'Fab A', lat: 1, lng: 1 },
    { name: 'Fab A', lat: 1.0001, lng: 1.0001 },
  ]);

  expect(nodes.length).toBe(1);
});
