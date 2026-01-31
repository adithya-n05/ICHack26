// backend/src/services/usgs.ts
export interface EarthquakeEvent {
  id: string;
  type: 'natural_disaster';
  title: string;
  description: string;
  location: { lat: number; lng: number };
  severity: number;
  startDate: string;
  source: string;
  magnitude: number;
}

export async function fetchEarthquakes(): Promise<EarthquakeEvent[]> {
  try {
    // Fetch M4.5+ earthquakes from the past week
    const url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson';

    const response = await fetch(url);

    if (!response.ok) {
      console.error('USGS API error:', response.status);
      return [];
    }

    const data = await response.json() as { features?: any[] };
    const features = data.features || [];

    return features.map((feature: any) => ({
      id: `usgs-${feature.id}`,
      type: 'natural_disaster' as const,
      title: feature.properties.title || `M${feature.properties.mag} Earthquake`,
      description: feature.properties.place || 'Unknown location',
      location: {
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
      },
      severity: Math.min(10, Math.round(feature.properties.mag)),
      startDate: new Date(feature.properties.time).toISOString(),
      source: 'USGS',
      magnitude: feature.properties.mag,
    }));
  } catch (error) {
    console.error('USGS fetch error:', error);
    return [];
  }
}
