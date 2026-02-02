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
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);

  const loopItems = useMemo(() => {
    if (items.length <= 1) {
      return items;
    }

    return [...items, items[0]];
  }, [items]);

  useEffect(() => {
    setActiveIndex(0);
    setIsResetting(false);
    setSelectedItem(null);
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
        className="h-12 bg-bg-secondary flex items-center px-4 shadow-[0_-1px_12px_rgba(0,0,0,0.35)] ring-1 ring-white/5"
      >
        <span className="text-text-secondary text-sm font-mono">
          Loading news feed...
        </span>
      </div>
    );
  }

  if (selectedItem) {
    const publishedAt = selectedItem.publishedAt ? new Date(selectedItem.publishedAt) : null;
    const publishedLabel =
      publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt.toLocaleString() : null;

    return (
      <div
        data-testid="news-ticker"
        className="bg-bg-secondary px-4 py-3 shadow-[0_-1px_12px_rgba(0,0,0,0.35)] ring-1 ring-white/5"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="font-mono text-xs uppercase tracking-wider text-text-secondary">
            News detail
          </div>
          <button
            type="button"
            onClick={() => setSelectedItem(null)}
            className="font-mono text-xs text-accent-cyan hover:text-accent-cyan/80"
          >
            ← Back to feed
          </button>
        </div>
        <div className="mt-2 font-mono text-sm text-text-primary">{selectedItem.title}</div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
          <span>{selectedItem.source}</span>
          {publishedLabel && <span>{publishedLabel}</span>}
          {selectedItem.category && <span>{selectedItem.category}</span>}
          {selectedItem.url && (
            <a
              href={selectedItem.url}
              target="_blank"
              rel="noreferrer"
              className="text-accent-cyan hover:text-accent-cyan/80"
            >
              Open link ↗
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="news-ticker"
      className="h-12 bg-bg-secondary overflow-hidden shadow-[0_-1px_12px_rgba(0,0,0,0.35)] ring-1 ring-white/5"
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
            className="h-12 flex items-center px-4 font-mono text-sm text-text-primary min-w-0 cursor-pointer hover:bg-white/5"
            onClick={() => setSelectedItem(item)}
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
