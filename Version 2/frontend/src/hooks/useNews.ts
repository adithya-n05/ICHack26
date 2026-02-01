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
    let isMounted = true;

    // Fetch initial news
    fetch(`${API_URL}/api/news?limit=${limit}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setNews(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    // Listen for real-time updates with named handler
    const handleNewNews = (newsItem: NewsItem) => {
      if (isMounted && newsItem?.id && newsItem?.title) {
        setNews((prev) => [newsItem, ...prev.slice(0, limit - 1)]);
      }
    };

    socket.on('new-news', handleNewNews);

    return () => {
      isMounted = false;
      socket.off('new-news', handleNewNews);
    };
  }, [limit]);

  return { news, loading, error };
}
