// backend/src/services/gdelt.ts
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

export async function fetchGdeltEvents(): Promise<GdeltEvent[]> {
  try {
    const query = encodeURIComponent('semiconductor OR chip OR supply chain OR TSMC OR Samsung');
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=50&format=json`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error('GDELT API error:', response.status);
      return [];
    }

    const data = await response.json() as { articles?: any[] };
    const articles = data.articles || [];

    return articles.map((article: any) => ({
      id: `gdelt-${article.url ? Buffer.from(article.url).toString('base64').slice(0, 20) : Date.now()}`,
      type: categorizeEvent(article.title || ''),
      title: article.title || 'Untitled',
      description: article.seendate || '',
      location: {
        lat: article.sourcecountry ? 0 : 0,
        lng: 0,
      },
      severity: calculateSeverity(article.tone || 0),
      startDate: article.seendate || new Date().toISOString(),
      source: 'GDELT',
      url: article.url,
    }));
  } catch (error) {
    console.error('GDELT fetch error:', error);
    return [];
  }
}
