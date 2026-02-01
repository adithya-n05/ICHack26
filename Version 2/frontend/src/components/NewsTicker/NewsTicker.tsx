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
  if (items.length === 0) {
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

  // Duplicate items for seamless infinite loop
  const duplicatedItems = [...items, ...items];

  return (
    <div
      data-testid="news-ticker"
      className="h-12 bg-bg-secondary border-t border-border-color overflow-hidden flex items-center"
    >
      <div data-testid="ticker-content" className="animate-ticker whitespace-nowrap">
        {duplicatedItems.map((item, idx) => (
          <span key={`${item.id}-${idx}`} className="px-8 font-mono text-sm text-text-primary">
            <span className="text-accent-cyan mr-2">⚡</span>
            {item.title}
            <span className="text-text-secondary ml-2">| {item.source}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
