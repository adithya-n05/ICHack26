import axios from 'axios';

interface USGSFeature {
  type: string;
  properties: {
    mag: number;
    place: string;
    time: number;
    updated: number;
    type: string;
    title: string;
  };
  geometry: {
    type: string;
    coordinates: [number, number, number]; // [lng, lat, depth]
  };
  id: string;
}

interface USGSResponse {
  type: string;
  metadata: {
    generated: number;
    url: string;
    title: string;
    count: number;
  };
  features: USGSFeature[];
}

export interface RiskZone {
  id: string;
  name: string;
  type: 'earthquake';
  coordinates: [number, number];
  intensity: number;
  radius: number;
  description: string;
  magnitude?: number;
  depth?: number;
  timestamp?: Date;
}

export class USGSService {
  private baseUrl = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

  /**
   * Fetch recent earthquakes from USGS API
   * @param minMagnitude Minimum magnitude to fetch (default 4.0)
   * @param days Number of days to look back (default 7)
   */
  async fetchRecentEarthquakes(minMagnitude = 4.0, days = 7): Promise<RiskZone[]> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - days * 24 * 60 * 60 * 1000);

    const params = new URLSearchParams({
      format: 'geojson',
      starttime: startTime.toISOString(),
      endtime: endTime.toISOString(),
      minmagnitude: minMagnitude.toString(),
      orderby: 'time',
      limit: '100',
    });

    try {
      const response = await axios.get<USGSResponse>(`${this.baseUrl}?${params}`);
      const { features } = response.data;

      return features.map((feature) => this.transformToRiskZone(feature));
    } catch (error) {
      console.error('Error fetching USGS data:', error);
      throw error;
    }
  }

  /**
   * Fetch earthquakes near a specific location
   */
  async fetchNearLocation(
    lat: number,
    lng: number,
    radiusKm = 500,
    minMagnitude = 3.0
  ): Promise<RiskZone[]> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000);

    const params = new URLSearchParams({
      format: 'geojson',
      starttime: startTime.toISOString(),
      endtime: endTime.toISOString(),
      latitude: lat.toString(),
      longitude: lng.toString(),
      maxradiuskm: radiusKm.toString(),
      minmagnitude: minMagnitude.toString(),
      orderby: 'time',
      limit: '50',
    });

    try {
      const response = await axios.get<USGSResponse>(`${this.baseUrl}?${params}`);
      return response.data.features.map((f) => this.transformToRiskZone(f));
    } catch (error) {
      console.error('Error fetching USGS location data:', error);
      throw error;
    }
  }

  /**
   * Transform USGS feature to RiskZone format
   */
  private transformToRiskZone(feature: USGSFeature): RiskZone {
    const { properties, geometry, id } = feature;
    const [lng, lat, depth] = geometry.coordinates;

    // Calculate intensity based on magnitude (0-1 scale)
    // Magnitude 4.0 = 0.4, 7.0 = 1.0
    const intensity = Math.min(1, Math.max(0, (properties.mag - 3) / 4));

    // Calculate radius based on magnitude (larger quakes = larger affected area)
    // Magnitude 4 = ~100km, magnitude 7 = ~500km
    const radius = Math.round(50 * Math.pow(2, properties.mag - 4));

    return {
      id: `usgs-${id}`,
      name: properties.place || 'Unknown Location',
      type: 'earthquake',
      coordinates: [lng, lat],
      intensity,
      radius,
      description: `M${properties.mag.toFixed(1)} earthquake at ${properties.place}`,
      magnitude: properties.mag,
      depth,
      timestamp: new Date(properties.time),
    };
  }
}
