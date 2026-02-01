// backend/src/services/noaa.ts
export interface WeatherAlert {
  id: string;
  type: 'weather';
  title: string;
  description: string;
  location: { lat: number; lng: number };
  severity: number;
  startDate: string;
  endDate?: string;
  source: string;
}

function normalizeDate(value?: string | null): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toISOString();
}

export async function fetchWeatherAlerts(): Promise<WeatherAlert[]> {
  try {
    // NOAA Active Alerts API (US only)
    const url = 'https://api.weather.gov/alerts/active?status=actual&message_type=alert';

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Sentinel-Zero (contact@example.com)',
      },
    });

    if (!response.ok) {
      console.error('NOAA API error:', response.status);
      return [];
    }

    const data = await response.json() as { features?: any[] };
    const features = data.features || [];

    return features.slice(0, 50).map((feature: any) => {
      const props = feature.properties;
      // Calculate centroid of affected area
      let lat = 0, lng = 0;
      if (feature.geometry?.coordinates) {
        // Flatten coordinates and calculate centroid
        const coords = feature.geometry.coordinates.flat(Infinity) as number[];
        // Coordinates come as [lng1, lat1, lng2, lat2, ...]
        let sumLat = 0, sumLng = 0, count = 0;
        for (let i = 0; i < coords.length - 1; i += 2) {
          const lngVal = coords[i];
          const latVal = coords[i + 1];
          if (typeof lngVal === 'number' && typeof latVal === 'number' &&
            !isNaN(lngVal) && !isNaN(latVal)) {
            sumLng += lngVal;
            sumLat += latVal;
            count++;
          }
        }
        if (count > 0) {
          lng = sumLng / count;
          lat = sumLat / count;
        }
      }

      const severityMap: Record<string, number> = {
        'Extreme': 10,
        'Severe': 8,
        'Moderate': 5,
        'Minor': 3,
        'Unknown': 1,
      };

      const startDate =
        normalizeDate(props.onset) ||
        normalizeDate(props.effective) ||
        normalizeDate(props.sent) ||
        normalizeDate(props.ends) ||
        normalizeDate(props.expires) ||
        new Date().toISOString();
      const endDate = normalizeDate(props.expires) || normalizeDate(props.ends) || undefined;

      return {
        id: `noaa-${props.id}`,
        type: 'weather' as const,
        title: props.headline || props.event || 'Weather Alert',
        description: props.description?.slice(0, 500) || '',
        location: { lat, lng },
        severity: severityMap[props.severity] || 5,
        startDate,
        endDate,
        source: 'NOAA',
      };
    });
  } catch (error) {
    console.error('NOAA fetch error:', error);
    return [];
  }
}
