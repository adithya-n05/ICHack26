export interface WarZonePoint {
  id: string;
  title: string;
  location: { lat: number; lng: number };
  severity: number;
  startDate?: string;
  lastEventDate?: string;
  description?: string;
  source?: string;
}

export interface HeatmapEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  location?: { lat: number; lng: number };
  severity: number;
  startDate?: string;
  endDate?: string;
  source?: string;
}

export const pickNearestWarZone = (
  click: { lat: number; lng: number },
  zones: WarZonePoint[]
): WarZonePoint | null => {
  if (zones.length === 0) return null;
  let nearest: WarZonePoint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  zones.forEach((zone) => {
    const dx = zone.location.lng - click.lng;
    const dy = zone.location.lat - click.lat;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = zone;
    }
  });

  return nearest;
};

export const buildWarZoneEvent = (zone: WarZonePoint): HeatmapEvent => ({
  id: zone.id,
  type: 'war',
  title: zone.title,
  description: zone.description,
  location: zone.location,
  severity: zone.severity,
  startDate: zone.startDate,
  endDate: zone.lastEventDate,
  source: zone.source ?? 'Manual',
});
