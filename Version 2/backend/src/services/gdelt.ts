// backend/src/services/gdelt.ts
import { getCountryCoordinates } from './countryCoordinates';

export interface GdeltEvent {
  id: string;
  type: 'geopolitical' | 'natural_disaster' | 'trade' | 'infrastructure';
  title: string;
  description: string;
  location: { lat: number; lng: number };
  severity: number;
  startDate: string;
  source: string;
  url?: string;
}

function categorizeEvent(title: string): GdeltEvent['type'] {
  const titleLower = title.toLowerCase();
  if (titleLower.includes('earthquake') || titleLower.includes('flood') || titleLower.includes('hurricane')) {
    return 'natural_disaster';
  }
  if (titleLower.includes('tariff') || titleLower.includes('trade') || titleLower.includes('sanction')) {
    return 'trade';
  }
  if (titleLower.includes('port') || titleLower.includes('factory') || titleLower.includes('shutdown')) {
    return 'infrastructure';
  }
  return 'geopolitical';
}

function calculateSeverity(tone: number): number {
  // GDELT tone: negative = bad news, scale roughly -10 to +10
  // Convert to severity 1-10 where 10 is most severe
  const severity = Math.min(10, Math.max(1, Math.round(5 - tone / 2)));
  return severity;
}

function parseGdeltDate(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }

  // Handle GDELT formats like YYYYMMDDHHMMSS or YYYYMMDDTHHMMSSZ
  const digits = trimmed.replace(/[^\d]/g, '');
  if (digits.length >= 8) {
    const year = digits.slice(0, 4);
    const month = digits.slice(4, 6);
    const day = digits.slice(6, 8);
    const hour = digits.slice(8, 10) || '00';
    const minute = digits.slice(10, 12) || '00';
    const second = digits.slice(12, 14) || '00';
    const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
    const isoParsed = Date.parse(iso);
    if (!Number.isNaN(isoParsed)) {
      return new Date(isoParsed).toISOString();
    }
  }

  return null;
}

const MIN_REQUEST_INTERVAL_MS = 5000;
let lastFetchAt = 0;

export async function fetchGdeltEvents(): Promise<GdeltEvent[]> {
  try {
    const now = Date.now();
    if (now - lastFetchAt < MIN_REQUEST_INTERVAL_MS) {
      return [];
    }
    lastFetchAt = now;

    const query = encodeURIComponent('(semiconductor OR chip OR "supply chain" OR TSMC OR Samsung)');
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=50&format=json`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error('GDELT API error:', response.status, errorBody.slice(0, 200));
      return [];
    }

    const bodyText = await response.text();
    let data: { articles?: any[] };
    try {
      data = JSON.parse(bodyText) as { articles?: any[] };
    } catch (err) {
      console.error('GDELT response was not JSON:', bodyText.slice(0, 200));
      return [];
    }

    const articles = data.articles || [];

    return articles.map((article: any) => {
      // Get coordinates from country code, with fallback to (0,0)
      const coords = getCountryCoordinates(article.sourcecountry) || { lat: 0, lng: 0 };

      const normalizedDate = parseGdeltDate(article.seendate) || new Date().toISOString();

      return {
        id: `gdelt-${article.url ? Buffer.from(article.url).toString('base64').slice(0, 20) : Date.now()}`,
        type: categorizeEvent(article.title || ''),
        title: article.title || 'Untitled',
        description: article.seendate || '',
        location: coords,
        severity: calculateSeverity(article.tone || 0),
        startDate: normalizedDate,
        source: 'GDELT',
        url: article.url,
      };
    });
  } catch (error) {
    console.error('GDELT fetch error:', error);
    return [];
  }
}
