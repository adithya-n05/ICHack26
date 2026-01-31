// backend/src/services/newsapi.ts
export interface NewsItem {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  category: 'geopolitical' | 'disaster' | 'trade' | 'industry' | 'infrastructure';
}

function categorizeNews(title: string, description: string): NewsItem['category'] {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes('earthquake') || text.includes('flood') || text.includes('hurricane') || text.includes('disaster')) {
    return 'disaster';
  }
  if (text.includes('tariff') || text.includes('trade war') || text.includes('sanction') || text.includes('export')) {
    return 'trade';
  }
  if (text.includes('port') || text.includes('factory') || text.includes('shutdown') || text.includes('strike')) {
    return 'infrastructure';
  }
  if (text.includes('war') || text.includes('conflict') || text.includes('tension') || text.includes('military')) {
    return 'geopolitical';
  }
  return 'industry';
}

export async function fetchNews(): Promise<NewsItem[]> {
  const apiKey = process.env.NEWSAPI_KEY;

  if (!apiKey) {
    console.warn('NewsAPI key not configured');
    return [];
  }

  try {
    const query = encodeURIComponent('semiconductor OR chip supply chain OR TSMC OR Samsung foundry');
    const url = `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&pageSize=50&apiKey=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error('NewsAPI error:', response.status);
      return [];
    }

    const data = await response.json() as { articles?: any[] };
    const articles = data.articles || [];

    return articles.map((article: any) => ({
      id: `news-${Buffer.from(article.url || '').toString('base64').slice(0, 20)}`,
      title: article.title || 'Untitled',
      description: article.description || '',
      source: article.source?.name || 'Unknown',
      url: article.url || '',
      publishedAt: article.publishedAt || new Date().toISOString(),
      category: categorizeNews(article.title || '', article.description || ''),
    }));
  } catch (error) {
    console.error('NewsAPI fetch error:', error);
    return [];
  }
}
