import { useEffect, useMemo, useState } from 'react';

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url?: string;
  publishedAt?: string;
  category?: string;
}

interface NewsTickerProps {
  items: NewsItem[];
}

export function NewsTicker({ items }: NewsTickerProps) {
  const transitionMs = 600;
  const dwellMs = 3200;
  const cycleMs = transitionMs + dwellMs;
  const itemHeightPx = 48;
  const hasItems = items.length > 0;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isResetting, setIsResetting] = useState(false);

  const loopItems = useMemo(() => {
    if (items.length <= 1) {
      return items;
    }

    return [...items, items[0]];
  }, [items]);

  useEffect(() => {
    setActiveIndex(0);
    setIsResetting(false);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex(prev => prev + 1);
    }, cycleMs);

    return () => clearInterval(interval);
  }, [items.length, cycleMs]);

  useEffect(() => {
    if (items.length <= 1) return;
    if (activeIndex !== items.length) return;

    const timeout = setTimeout(() => {
      setIsResetting(true);
      setActiveIndex(0);
      setTimeout(() => setIsResetting(false), 50);
    }, transitionMs);

    return () => clearTimeout(timeout);
  }, [activeIndex, items.length, transitionMs]);

  if (!hasItems) {
    return (
      <div
        data-testid="news-ticker"
        className="h-12 bg-bg-secondary border-t border-border-color flex items-center px-4"
      >
        <span className="text-text-secondary text-sm font-mono">
          Loading news feed...
        </span>
      </div>
    );
  }

  return (
    <div
      data-testid="news-ticker"
      className="h-12 bg-bg-secondary border-t border-border-color overflow-hidden"
    >
      <div
        data-testid="ticker-content"
        className="flex flex-col"
        style={{
          transform: `translateY(-${activeIndex * itemHeightPx}px)`,
          transition: isResetting ? 'none' : `transform ${transitionMs}ms ease-in-out`,
        }}
      >
        {loopItems.map((item, idx) => (
          <div
            key={`${item.id}-${idx}`}
            className="h-12 flex items-center px-4 font-mono text-sm text-text-primary min-w-0"
          >
            <span className="text-accent-cyan mr-2">⚡</span>
            <span className="truncate flex-1">{item.title}</span>
            <span className="text-text-secondary ml-2 shrink-0">| {item.source}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
