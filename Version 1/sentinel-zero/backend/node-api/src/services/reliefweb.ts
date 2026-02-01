/**
 * ReliefWeb API Service
 * Fetches humanitarian crises, conflicts, and war zones
 * FREE API - no key required
 */

import axios from 'axios';

interface ReliefWebReport {
  id: number;
  fields: {
    title: string;
    body?: string;
    primary_country: {
      name: string;
      iso3: string;
      location: {
        lat: number;
        lon: number;
      };
    };
    disaster?: Array<{
      name: string;
      type: Array<{ name: string }>;
    }>;
    theme?: Array<{ name: string }>;
    date: {
      created: string;
    };
  };
}

interface ReliefWebResponse {
  count: number;
  data: ReliefWebReport[];
}

export interface ConflictRiskZone {
  id: string;
  name: string;
  type: 'war' | 'political';
  coordinates: [number, number];
  intensity: number;
  radius: number;
  description: string;
  country: string;
  countryCode: string;
  timestamp: Date;
}

export class ReliefWebService {
  private baseUrl = 'https://api.reliefweb.int/v1/reports';

  /**
   * Fetch recent conflict and crisis reports
   */
  async fetchConflictReports(): Promise<ConflictRiskZone[]> {
    try {
      const response = await axios.get<ReliefWebResponse>(this.baseUrl, {
        params: {
          appname: 'sentinel-zero',
          'filter[field]': 'theme.name',
          'filter[value]': 'Protection and Human Rights',
          limit: 50,
          'fields[include][]': [
            'title',
            'body',
            'primary_country.name',
            'primary_country.iso3',
            'primary_country.location',
            'disaster.name',
            'disaster.type.name',
            'theme.name',
            'date.created',
          ].join(','),
        },
      });

      // Also fetch armed conflict reports
      const conflictResponse = await axios.get<ReliefWebResponse>(this.baseUrl, {
        params: {
          appname: 'sentinel-zero',
          'filter[field]': 'disaster.type.name',
          'filter[value]': 'Conflict',
          limit: 50,
          'fields[include][]': [
            'title',
            'body',
            'primary_country.name',
            'primary_country.iso3',
            'primary_country.location',
            'disaster.name',
            'disaster.type.name',
            'theme.name',
            'date.created',
          ].join(','),
        },
      });

      const allReports = [...response.data.data, ...conflictResponse.data.data];

      // Deduplicate by ID
      const uniqueReports = Array.from(
        new Map(allReports.map((r) => [r.id, r])).values()
      );

      return uniqueReports
        .map((report) => this.transformToRiskZone(report))
        .filter((zone): zone is ConflictRiskZone => zone !== null);
    } catch (error) {
      console.error('Error fetching ReliefWeb data:', error);
      throw error;
    }
  }

  /**
   * Transform ReliefWeb report to RiskZone format
   */
  private transformToRiskZone(report: ReliefWebReport): ConflictRiskZone | null {
    const { fields } = report;

    // Skip if no location data
    if (!fields.primary_country?.location) {
      return null;
    }

    const { lat, lon } = fields.primary_country.location;

    // Determine if this is war or political instability
    let type: 'war' | 'political' = 'political';
    let intensity = 0.6;

    const title = fields.title.toLowerCase();
    const disasterTypes = fields.disaster?.flatMap((d) => d.type.map((t) => t.name.toLowerCase())) || [];

    if (
      title.includes('conflict') ||
      title.includes('war') ||
      title.includes('armed') ||
      title.includes('military') ||
      disasterTypes.includes('conflict')
    ) {
      type = 'war';
      intensity = 0.9;
    } else if (
      title.includes('protest') ||
      title.includes('unrest') ||
      title.includes('tension') ||
      title.includes('crisis')
    ) {
      type = 'political';
      intensity = 0.7;
    }

    // Calculate radius based on type
    const radius = type === 'war' ? 400 : 250;

    return {
      id: `reliefweb-${report.id}`,
      name: fields.title.slice(0, 100),
      type,
      coordinates: [lon, lat],
      intensity,
      radius,
      description: fields.body ? fields.body.slice(0, 300) : fields.title,
      country: fields.primary_country.name,
      countryCode: fields.primary_country.iso3,
      timestamp: new Date(fields.date.created),
    };
  }

  /**
   * Get active conflict zones (aggregated by country)
   */
  async getActiveConflictZones(): Promise<ConflictRiskZone[]> {
    const reports = await this.fetchConflictReports();

    // Aggregate by country - keep highest intensity per country
    const countryMap = new Map<string, ConflictRiskZone>();

    for (const zone of reports) {
      const existing = countryMap.get(zone.countryCode);
      if (!existing || zone.intensity > existing.intensity) {
        countryMap.set(zone.countryCode, zone);
      }
    }

    return Array.from(countryMap.values());
  }
}
