export function parsePortsGeojson(geojson: any) {
  return (geojson.features || []).map((feature: any, index: number) => ({
    id: `port-${index}`,
    name: feature.properties?.name || 'Unknown Port',
    type: 'port',
    lat: feature.geometry?.coordinates?.[1],
    lng: feature.geometry?.coordinates?.[0],
    source: 'world_ports_index',
  }));
}
