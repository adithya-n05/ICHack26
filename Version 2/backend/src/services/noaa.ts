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
      // Get centroid of affected area
      let lat = 0, lng = 0;
      if (feature.geometry?.coordinates) {
        // Simplified: use first coordinate
        const coords = feature.geometry.coordinates.flat(3);
        lng = coords[0] || 0;
        lat = coords[1] || 0;
      }

      const severityMap: Record<string, number> = {
        'Extreme': 10,
        'Severe': 8,
        'Moderate': 5,
        'Minor': 3,
        'Unknown': 1,
      };

      return {
        id: `noaa-${props.id}`,
        type: 'weather' as const,
        title: props.headline || props.event || 'Weather Alert',
        description: props.description?.slice(0, 500) || '',
        location: { lat, lng },
        severity: severityMap[props.severity] || 5,
        startDate: props.onset || props.effective || new Date().toISOString(),
        endDate: props.expires,
        source: 'NOAA',
      };
    });
  } catch (error) {
    console.error('NOAA fetch error:', error);
    return [];
  }
}
