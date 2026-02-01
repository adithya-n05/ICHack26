export function buildOverpassQuery(
  tags: Array<[string, string]>,
  bbox: [number, number, number, number],
) {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const filters = tags
    .map(([key, value]) => (value === '*' ? `["${key}"]` : `["${key}"="${value}"]`))
    .join('');

  return `[out:json][timeout:25][bbox:${minLng},${minLat},${maxLng},${maxLat}];
(
  nwr${filters};
);
out center;`;
}
