import { expect, test } from 'vitest';
import { buildOverpassQuery } from './overpass';

test('builds query with tags and bbox', () => {
  const query = buildOverpassQuery([['industrial', '*']], [1, 2, 3, 4]);
  expect(query).toContain('[bbox:1,2,3,4]');
  expect(query).toContain('nwr["industrial"]');
});
