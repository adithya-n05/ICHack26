/**
 * NOAA/NWS Weather Alerts Service
 * Fetches severe weather alerts from the National Weather Service
 * FREE API - no key required
 */

import axios from 'axios';

interface NWSAlert {
  id: string;
  properties: {
    event: string;
    headline: string;
    description: string;
    severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
    certainty: string;
    urgency: string;
    effective: string;
    expires: string;
    areaDesc: string;
  };
  geometry: {
    type: string;
    coordinates: number[][][] | null;
  } | null;
}

interface NWSResponse {
  type: string;
  features: NWSAlert[];
}

export interface StormRiskZone {
  id: string;
  name: string;
  type: 'storm';
  coordinates: [number, number];
  intensity: number;
  radius: number;
  description: string;
  severity: string;
  event: string;
  expires: Date | null;
}

export class NOAAService {
  private baseUrl = 'https://api.weather.gov/alerts/active';

  /**
   * Fetch active weather alerts
   * Filters for severe weather that impacts shipping/supply chain
   */
  async fetchActiveAlerts(): Promise<StormRiskZone[]> {
    try {
      const response = await axios.get<NWSResponse>(this.baseUrl, {
        headers: {
          'User-Agent': 'Sentinel-Zero Supply Chain Monitor (contact@example.com)',
          Accept: 'application/geo+json',
        },
        params: {
          status: 'actual',
          message_type: 'alert',
          severity: 'Severe,Extreme',
        },
      });

      const { features } = response.data;

      // Filter for supply chain relevant events
      const relevantEvents = [
        'Hurricane',
        'Tropical Storm',
        'Tsunami',
        'Storm Surge',
        'High Wind',
        'Extreme Wind',
        'Flood',
        'Flash Flood',
        'Tornado',
        'Severe Thunderstorm',
      ];

      return features
        .filter((alert) =>
          relevantEvents.some((event) =>
            alert.properties.event.toLowerCase().includes(event.toLowerCase())
          )
        )
        .map((alert) => this.transformToRiskZone(alert))
        .filter((zone): zone is StormRiskZone => zone !== null);
    } catch (error) {
      console.error('Error fetching NOAA alerts:', error);
      throw error;
    }
  }

  /**
   * Transform NWS alert to RiskZone format
   */
  private transformToRiskZone(alert: NWSAlert): StormRiskZone | null {
    const { properties, geometry } = alert;

    // Calculate centroid from geometry if available
    let coordinates: [number, number] | null = null;

    if (geometry?.coordinates && geometry.coordinates.length > 0) {
      // Get centroid of polygon
      const polygon = geometry.coordinates[0];
      if (Array.isArray(polygon) && polygon.length > 0) {
        let sumLng = 0;
        let sumLat = 0;
        for (const coord of polygon) {
          if (Array.isArray(coord) && coord.length >= 2) {
            sumLng += coord[0];
            sumLat += coord[1];
          }
        }
        coordinates = [sumLng / polygon.length, sumLat / polygon.length];
      }
    }

    // Skip if no coordinates
    if (!coordinates) {
      // Try to get approximate coordinates from area description
      const areaCoords = this.getApproximateCoordinates(properties.areaDesc);
      if (!areaCoords) return null;
      coordinates = areaCoords;
    }

    // Calculate intensity based on severity
    const intensityMap: Record<string, number> = {
      Extreme: 1.0,
      Severe: 0.8,
      Moderate: 0.5,
      Minor: 0.3,
      Unknown: 0.4,
    };

    const intensity = intensityMap[properties.severity] || 0.5;

    // Calculate radius based on event type
    const radiusMap: Record<string, number> = {
      Hurricane: 400,
      'Tropical Storm': 300,
      Tsunami: 500,
      Tornado: 50,
      default: 150,
    };

    let radius = radiusMap.default;
    for (const [event, r] of Object.entries(radiusMap)) {
      if (properties.event.toLowerCase().includes(event.toLowerCase())) {
        radius = r;
        break;
      }
    }

    return {
      id: `noaa-${alert.id}`,
      name: properties.event,
      type: 'storm',
      coordinates,
      intensity,
      radius,
      description: properties.headline || properties.description.slice(0, 200),
      severity: properties.severity,
      event: properties.event,
      expires: properties.expires ? new Date(properties.expires) : null,
    };
  }

  /**
   * Get approximate coordinates for US regions
   */
  private getApproximateCoordinates(areaDesc: string): [number, number] | null {
    const regionCoords: Record<string, [number, number]> = {
      florida: [-81.5, 27.6],
      texas: [-99.9, 31.9],
      louisiana: [-91.8, 30.9],
      'north carolina': [-79.0, 35.5],
      'south carolina': [-81.0, 33.8],
      georgia: [-83.5, 32.2],
      alabama: [-86.9, 32.3],
      mississippi: [-89.4, 32.3],
      california: [-119.4, 36.7],
      hawaii: [-155.5, 19.5],
      'puerto rico': [-66.5, 18.2],
      gulf: [-90.0, 25.0],
      atlantic: [-75.0, 30.0],
    };

    const lowerArea = areaDesc.toLowerCase();
    for (const [region, coords] of Object.entries(regionCoords)) {
      if (lowerArea.includes(region)) {
        return coords;
      }
    }

    return null;
  }
}
