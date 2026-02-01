import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import pointToLineDistance from '@turf/point-to-line-distance';
import polygonToLine from '@turf/polygon-to-line';

type LandFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>;

let cachedLand: LandFeatureCollection | null = null;
const LAND_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson';

async function loadLandMask() {
  if (cachedLand) return cachedLand;
  const response = await fetch(LAND_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch land mask: ${response.status}`);
  }
  cachedLand = (await response.json()) as LandFeatureCollection;
  return cachedLand;
}

export async function isNearLand(lat: number, lng: number, maxDistanceKm = 25) {
  const land = await loadLandMask();
  const pt = point([lng, lat]);

  for (const feature of land.features) {
    if (booleanPointInPolygon(pt, feature)) {
      return true;
    }
    const line = polygonToLine(feature) as
      | GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString>
      | GeoJSON.FeatureCollection<GeoJSON.LineString | GeoJSON.MultiLineString>;
    if (Array.isArray((line as any).features)) {
      let minDistance = Infinity;
      for (const segment of (line as any).features) {
        try {
          const distance = pointToLineDistance(pt, segment, { units: 'kilometers' });
          if (distance < minDistance) {
            minDistance = distance;
          }
        } catch {
          // ignore invalid segment
        }
      }
      if (minDistance <= maxDistanceKm) {
        return true;
      }
      continue;
    }

    try {
      const distance = pointToLineDistance(pt, line as any, { units: 'kilometers' });
      if (distance <= maxDistanceKm) {
        return true;
      }
    } catch {
      // ignore invalid geometry
    }
  }
  return false;
}

export async function filterNodesNearLand<T extends { lat: number; lng: number }>(
  nodes: T[],
  maxDistanceKm = 25,
) {
  const results: T[] = [];
  for (const node of nodes) {
    if (await isNearLand(node.lat, node.lng, maxDistanceKm)) {
      results.push(node);
    }
  }
  return results;
}
