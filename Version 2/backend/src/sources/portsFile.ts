import * as fs from 'fs';
import * as path from 'path';

type PortNode = {
  id: string;
  name: string;
  node_type: 'port';
  lat: number;
  lng: number;
  country?: string;
  city?: string;
  source: string;
  tags: string[];
};

function normalizePort(entry: any, index: number): PortNode | null {
  const lat = Number(entry.lat ?? entry.latitude);
  const lng = Number(entry.lng ?? entry.longitude ?? entry.lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return {
    id: entry.id ?? `port-${index}`,
    name: entry.name ?? entry.port_name ?? 'Unknown Port',
    node_type: 'port',
    lat,
    lng,
    country: entry.country ?? entry.country_name,
    city: entry.city ?? entry.locality,
    source: entry.source ?? 'ports_dataset',
    tags: ['port'],
  };
}

export async function loadPortsFromFile() {
  const dataPath = process.env.PORTS_DATA_PATH;
  if (!dataPath) return [];

  const absolutePath = path.isAbsolute(dataPath)
    ? dataPath
    : path.join(process.cwd(), dataPath);
  if (!fs.existsSync(absolutePath)) return [];

  const raw = JSON.parse(fs.readFileSync(absolutePath, 'utf-8')) as any;
  const rows = Array.isArray(raw) ? raw : raw?.features ?? [];
  return rows
    .map((entry: any, index: number) => {
      const properties = entry.properties ?? entry;
      const coords = entry.geometry?.coordinates ?? [];
      const merged = {
        ...properties,
        lat: properties.lat ?? properties.latitude ?? coords[1],
        lng: properties.lng ?? properties.longitude ?? coords[0],
      };
      return normalizePort(merged, index);
    })
    .filter((port: PortNode | null): port is PortNode => Boolean(port));
}

export async function loadPortsFromUrl() {
  const url = process.env.PORTS_DATA_URL;
  if (!url) return [];

  const response = await fetch(url);
  if (!response.ok) return [];

  const raw = (await response.json()) as any;
  const rows = Array.isArray(raw) ? raw : raw?.features ?? [];
  return rows
    .map((entry: any, index: number) => {
      const properties = entry.properties ?? entry;
      const coords = entry.geometry?.coordinates ?? [];
      const merged = {
        ...properties,
        lat: properties.lat ?? properties.latitude ?? coords[1],
        lng: properties.lng ?? properties.longitude ?? coords[0],
      };
      return normalizePort(merged, index);
    })
    .filter((port: PortNode | null): port is PortNode => Boolean(port));
}
