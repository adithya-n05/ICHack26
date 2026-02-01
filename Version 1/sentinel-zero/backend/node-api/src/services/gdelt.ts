import axios from 'axios';

interface GDELTArticle {
  url: string;
  title: string;
  seendate: string;
  socialimage: string;
  domain: string;
  language: string;
  sourcecountry: string;
}

interface GDELTResponse {
  articles: GDELTArticle[];
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  timestamp: Date;
  severity: 'critical' | 'warning' | 'info' | 'positive';
  region: string;
  impactScore: number;
  url?: string;
}

// Keywords that indicate severity levels
const CRITICAL_KEYWORDS = [
  'war', 'conflict', 'attack', 'military', 'invasion', 'strike',
  'earthquake', 'tsunami', 'hurricane', 'disaster', 'emergency',
  'collapse', 'crisis', 'blockade', 'sanction', 'tariff hike'
];

const WARNING_KEYWORDS = [
  'tension', 'dispute', 'protest', 'delay', 'disruption', 'shortage',
  'storm', 'flood', 'congestion', 'tariff', 'trade war', 'export ban'
];

const POSITIVE_KEYWORDS = [
  'agreement', 'deal', 'expansion', 'investment', 'growth', 'recovery',
  'cooperation', 'partnership', 'lift sanctions', 'trade deal'
];

export class GDELTService {
  private baseUrl = 'https://api.gdeltproject.org/api/v2/doc/doc';

  /**
   * Fetch recent news articles related to supply chain
   */
  async fetchSupplyChainNews(query = 'supply chain OR semiconductor OR shipping'): Promise<NewsItem[]> {
    const params = new URLSearchParams({
      query,
      mode: 'artlist',
      maxrecords: '50',
      format: 'json',
      sort: 'datedesc',
    });

    try {
      const response = await axios.get<GDELTResponse>(`${this.baseUrl}?${params}`);
      const articles = response.data.articles || [];

      return articles.map((article, index) => this.transformToNewsItem(article, index));
    } catch (error) {
      console.error('Error fetching GDELT data:', error);
      // Return empty array on error, don't throw
      return [];
    }
  }

  /**
   * Fetch news for specific region
   */
  async fetchRegionNews(region: string): Promise<NewsItem[]> {
    const query = `(supply chain OR shipping OR trade) AND ${region}`;
    return this.fetchSupplyChainNews(query);
  }

  /**
   * Fetch news about specific topic (e.g., tariffs, earthquakes)
   */
  async fetchTopicNews(topic: string): Promise<NewsItem[]> {
    return this.fetchSupplyChainNews(topic);
  }

  /**
   * Transform GDELT article to NewsItem format
   */
  private transformToNewsItem(article: GDELTArticle, index: number): NewsItem {
    const title = article.title || 'Untitled';
    const severity = this.determineSeverity(title);
    const impactScore = this.calculateImpactScore(title, severity);

    return {
      id: `gdelt-${Date.now()}-${index}`,
      title,
      source: article.domain || 'GDELT',
      timestamp: new Date(article.seendate || Date.now()),
      severity,
      region: article.sourcecountry || 'Global',
      impactScore,
      url: article.url,
    };
  }

  /**
   * Determine severity based on keywords in title
   */
  private determineSeverity(title: string): NewsItem['severity'] {
    const lowerTitle = title.toLowerCase();

    if (CRITICAL_KEYWORDS.some(keyword => lowerTitle.includes(keyword))) {
      return 'critical';
    }
    if (WARNING_KEYWORDS.some(keyword => lowerTitle.includes(keyword))) {
      return 'warning';
    }
    if (POSITIVE_KEYWORDS.some(keyword => lowerTitle.includes(keyword))) {
      return 'positive';
    }
    return 'info';
  }

  /**
   * Calculate impact score (0-100) based on content
   */
  private calculateImpactScore(title: string, severity: NewsItem['severity']): number {
    const baseScore = {
      critical: 80,
      warning: 50,
      info: 30,
      positive: 40,
    }[severity];

    // Add bonus for specific high-impact keywords
    const lowerTitle = title.toLowerCase();
    let bonus = 0;

    if (lowerTitle.includes('taiwan') || lowerTitle.includes('china')) bonus += 10;
    if (lowerTitle.includes('semiconductor') || lowerTitle.includes('chip')) bonus += 10;
    if (lowerTitle.includes('port') || lowerTitle.includes('shipping')) bonus += 5;

    return Math.min(100, baseScore + bonus);
  }
}
