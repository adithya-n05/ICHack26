// frontend/src/hooks/useNews.ts
import { useState, useEffect } from 'react';
import { socket } from '../lib/socket';

interface NewsItem {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  category: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useNews(limit: number = 20) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch initial news
    fetch(`${API_URL}/api/news?limit=${limit}`)
      .then((res) => res.json())
      .then((data) => {
        setNews(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    // Listen for real-time updates
    socket.on('new-news', (newsItem: NewsItem) => {
      setNews((prev) => [newsItem, ...prev.slice(0, limit - 1)]);
    });

    return () => {
      socket.off('new-news');
    };
  }, [limit]);

  return { news, loading, error };
}
