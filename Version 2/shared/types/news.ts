export type NewsCategory =
  | 'geopolitical'
  | 'disaster'
  | 'trade'
  | 'industry'
  | 'infrastructure';

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: NewsCategory;
}
