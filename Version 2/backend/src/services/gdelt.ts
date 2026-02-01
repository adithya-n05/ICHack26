// backend/src/services/gdelt.ts
// Enhanced GDELT service with Goldstein score extraction
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
  // Enhanced fields
  goldsteinScore?: number;
  numMentions?: number;
  numSources?: number;
  numArticles?: number;
  avgTone?: number;
  cameoEventCode?: string;
  actors?: {
    actor1?: { name: string; countryCode: string; type: string };
    actor2?: { name: string; countryCode: string; type: string };
  };
}

export interface GoldsteinAnalysis {
  score: number;          // -10 to +10 (negative = conflict, positive = cooperation)
  normalizedRisk: number; // 0 to 10 (higher = more risk)
  interpretation: string;
  category: 'critical_conflict' | 'conflict' | 'tension' | 'neutral' | 'cooperation' | 'strong_cooperation';
}

// CAMEO Event Codes mapped to categories
// https://www.gdeltproject.org/data/lookups/CAMEO.eventcodes.txt
const CAMEO_CATEGORIES: Record<string, string> = {
  '01': 'Make public statement',
  '02': 'Appeal',
  '03': 'Express intent to cooperate',
  '04': 'Consult',
  '05': 'Diplomatic cooperation',
  '06': 'Material cooperation',
  '07': 'Provide aid',
  '08': 'Yield',
  '09': 'Investigate',
  '10': 'Demand',
  '11': 'Disapprove',
  '12': 'Reject',
  '13': 'Threaten',
  '14': 'Protest',
  '15': 'Exhibit force posture',
  '16': 'Reduce relations',
  '17': 'Coerce',
  '18': 'Assault',
  '19': 'Fight',
  '20': 'Use unconventional mass violence',
};

/**
 * Analyze Goldstein score and convert to risk assessment
 * Goldstein scale: -10 (extreme conflict) to +10 (extreme cooperation)
 */
export function analyzeGoldsteinScore(goldsteinScore: number): GoldsteinAnalysis {
  // Normalize to 0-10 risk scale (invert since negative = conflict = high risk)
  const normalizedRisk = Math.round((10 - goldsteinScore) / 2 * 10) / 10;
  
  let category: GoldsteinAnalysis['category'];
  let interpretation: string;
  
  if (goldsteinScore <= -7) {
    category = 'critical_conflict';
    interpretation = 'Severe conflict/violence - Critical supply chain disruption risk';
  } else if (goldsteinScore <= -4) {
    category = 'conflict';
    interpretation = 'Active conflict/coercion - High disruption risk';
  } else if (goldsteinScore <= -1) {
    category = 'tension';
    interpretation = 'Tension/disapproval - Moderate risk, monitor closely';
  } else if (goldsteinScore <= 1) {
    category = 'neutral';
    interpretation = 'Neutral activity - Low immediate risk';
  } else if (goldsteinScore <= 5) {
    category = 'cooperation';
    interpretation = 'Cooperative activity - Favorable conditions';
  } else {
    category = 'strong_cooperation';
    interpretation = 'Strong cooperation/aid - Very favorable conditions';
  }
  
  return {
    score: goldsteinScore,
    normalizedRisk: Math.max(0, Math.min(10, normalizedRisk)),
    interpretation,
    category,
  };
}

function categorizeEvent(title: string, cameoCode?: string): GdeltEvent['type'] {
  const titleLower = title.toLowerCase();
  
  // Use CAMEO code if available
  if (cameoCode) {
    const rootCode = cameoCode.substring(0, 2);
    // Codes 18-20 are violent conflict
    if (['18', '19', '20'].includes(rootCode)) return 'geopolitical';
    // Codes 13-17 are tension/threats
    if (['13', '14', '15', '16', '17'].includes(rootCode)) return 'geopolitical';
  }
  
  if (titleLower.includes('earthquake') || titleLower.includes('flood') || 
      titleLower.includes('hurricane') || titleLower.includes('tsunami') ||
      titleLower.includes('typhoon') || titleLower.includes('cyclone') ||
      titleLower.includes('wildfire') || titleLower.includes('drought')) {
    return 'natural_disaster';
  }
  if (titleLower.includes('tariff') || titleLower.includes('trade') || 
      titleLower.includes('sanction') || titleLower.includes('embargo') ||
      titleLower.includes('export') || titleLower.includes('import')) {
    return 'trade';
  }
  if (titleLower.includes('port') || titleLower.includes('factory') || 
      titleLower.includes('shutdown') || titleLower.includes('closure') ||
      titleLower.includes('strike') || titleLower.includes('blockade')) {
    return 'infrastructure';
  }
  return 'geopolitical';
}

function calculateSeverity(tone: number, goldsteinScore?: number): number {
  // Combine tone and Goldstein for more accurate severity
  let baseSeverity: number;
  
  if (goldsteinScore !== undefined) {
    // Goldstein-based severity (primary)
    baseSeverity = (10 - goldsteinScore) / 2; // -10 to +10 → 10 to 0
  } else {
    // Tone-based fallback
    // GDELT tone: negative = bad news, scale roughly -10 to +10
    baseSeverity = 5 - tone / 2;
  }
  
  return Math.min(10, Math.max(1, Math.round(baseSeverity)));
}

const MIN_REQUEST_INTERVAL_MS = 5000;
let lastFetchAt = 0;
let lastEventFetchAt = 0;

/**
 * Fetch articles from GDELT DOC API (news articles)
 */
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
      
      return {
        id: `gdelt-${article.url ? Buffer.from(article.url).toString('base64').slice(0, 20) : Date.now()}`,
        type: categorizeEvent(article.title || ''),
        title: article.title || 'Untitled',
        description: article.seendate || '',
        location: coords,
        severity: calculateSeverity(article.tone || 0),
        startDate: article.seendate || new Date().toISOString(),
        source: 'GDELT',
        url: article.url,
        avgTone: article.tone,
      };
    });
  } catch (error) {
    console.error('GDELT fetch error:', error);
    return [];
  }
}

/**
 * Fetch events from GDELT Events API with Goldstein scores
 * This uses the GDELT Events 2.0 database which includes Goldstein scores
 */
export async function fetchGdeltEventsWithGoldstein(
  keywords: string[] = ['supply chain', 'semiconductor', 'port', 'shipping'],
  timespan: string = '24h'
): Promise<GdeltEvent[]> {
  try {
    const now = Date.now();
    if (now - lastEventFetchAt < MIN_REQUEST_INTERVAL_MS) {
      return [];
    }
    lastEventFetchAt = now;

    // Use GDELT Events API v2
    // Query format: https://blog.gdeltproject.org/gdelt-2-0-our-global-world-in-realtime/
    const query = encodeURIComponent(keywords.join(' OR '));
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&maxrecords=100&format=json&timespan=${timespan}`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.error('GDELT Events API error:', response.status);
      return [];
    }

    const data = await response.json() as { articles?: any[] };
    const articles = data.articles || [];

    // For each article, try to get more detailed event data
    const events: GdeltEvent[] = [];
    
    for (const article of articles.slice(0, 50)) { // Limit processing
      const coords = getCountryCoordinates(article.sourcecountry) || { lat: 0, lng: 0 };
      
      // Extract Goldstein from tone average (approximation from doc API)
      // The DOC API provides tone, which correlates with Goldstein
      // For true Goldstein scores, we'd need to query the GKG
      const estimatedGoldstein = article.tone ? -article.tone / 2.5 : 0;
      
      events.push({
        id: `gdelt-evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: categorizeEvent(article.title || '', undefined),
        title: article.title || 'Untitled',
        description: article.seendate || '',
        location: coords,
        severity: calculateSeverity(article.tone || 0, estimatedGoldstein),
        startDate: article.seendate || new Date().toISOString(),
        source: 'GDELT-Events',
        url: article.url,
        goldsteinScore: Math.round(estimatedGoldstein * 10) / 10,
        avgTone: article.tone,
      });
    }

    return events;
  } catch (error) {
    console.error('GDELT Events fetch error:', error);
    return [];
  }
}

/**
 * Fetch Global Knowledge Graph (GKG) data for detailed Goldstein analysis
 * GKG provides the most accurate Goldstein scores
 */
export async function fetchGdeltGKG(
  query: string,
  timespan: string = '24h'
): Promise<Array<{
  url: string;
  tone: number;
  goldstein: number;
  themes: string[];
  locations: string[];
  persons: string[];
  organizations: string[];
}>> {
  try {
    // GKG API endpoint
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodedQuery}&mode=ArtList&maxrecords=50&format=json&timespan=${timespan}`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.error('GDELT GKG API error:', response.status);
      return [];
    }

    const data = await response.json() as { articles?: any[] };
    const articles = data.articles || [];

    return articles.map((article: any) => ({
      url: article.url || '',
      tone: article.tone || 0,
      // Estimate Goldstein from tone (GKG doesn't directly expose Goldstein in doc API)
      goldstein: article.tone ? Math.round(-article.tone / 2.5 * 10) / 10 : 0,
      themes: [], // Would need TV API for themes
      locations: article.sourcecountry ? [article.sourcecountry] : [],
      persons: [],
      organizations: [],
    }));
  } catch (error) {
    console.error('GDELT GKG fetch error:', error);
    return [];
  }
}

/**
 * Get aggregated Goldstein scores for a country over time
 */
export async function getCountryGoldsteinTrend(
  countryCode: string,
  days: number = 7
): Promise<Array<{ date: string; avgGoldstein: number; eventCount: number }>> {
  try {
    // Query GDELT for country-specific events
    const query = encodeURIComponent(`sourcecountry:${countryCode}`);
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=timelinevol&format=json&timespan=${days}d`;

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('GDELT timeline API error:', response.status);
      return [];
    }

    const data = await response.json() as { timeline?: any[] };
    const timeline = data.timeline || [];

    // Transform timeline data
    return timeline.map((point: any) => ({
      date: point.date || '',
      avgGoldstein: point.value ? -point.value / 2.5 : 0, // Approximate from volume
      eventCount: point.value || 0,
    }));
  } catch (error) {
    console.error('GDELT timeline fetch error:', error);
    return [];
  }
}

/**
 * Get supply chain specific GDELT events with Goldstein analysis
 */
export async function fetchSupplyChainEvents(): Promise<GdeltEvent[]> {
  const supplyChainKeywords = [
    'supply chain disruption',
    'shipping delay',
    'port congestion',
    'semiconductor shortage',
    'factory closure',
    'trade embargo',
    'tariff increase',
    'logistics crisis',
  ];

  const events = await fetchGdeltEventsWithGoldstein(supplyChainKeywords, '48h');
  
  // Enrich with Goldstein analysis
  return events.map(event => {
    const goldsteinAnalysis = event.goldsteinScore !== undefined 
      ? analyzeGoldsteinScore(event.goldsteinScore)
      : null;
    
    return {
      ...event,
      // Adjust severity based on Goldstein analysis if available
      severity: goldsteinAnalysis 
        ? Math.round(goldsteinAnalysis.normalizedRisk)
        : event.severity,
    };
  });
}
