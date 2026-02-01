export function buildOverpassQuery(
  tags: Array<[string, string]>,
  bbox: [number, number, number, number],
) {
  const [minLat, minLng, maxLat, maxLng] = bbox;
  if (
    minLat < -90 ||
    minLat > 90 ||
    maxLat < -90 ||
    maxLat > 90 ||
    minLng < -180 ||
    minLng > 180 ||
    maxLng < -180 ||
    maxLng > 180
  ) {
    throw new Error('Invalid bbox');
  }
  const filters = tags
    .map(([key, value]) => (value === '*' ? `["${key}"]` : `["${key}"="${value}"]`))
    .join('');

  return `[out:json][timeout:25][bbox:${minLat},${minLng},${maxLat},${maxLng}];
(
  nwr${filters};
);
out center;`;
}
