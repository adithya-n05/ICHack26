import { expect, test } from 'vitest';
import { parsePortsGeojson } from './ports';

test('parses ports geojson into nodes', () => {
  const node = parsePortsGeojson({
    features: [{ properties: { name: 'Port A' }, geometry: { coordinates: [1, 2] } }],
  })[0];

  expect(node.name).toBe('Port A');
  expect(node.lat).toBe(2);
});
