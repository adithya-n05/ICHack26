export interface NewsItem {
  id: string;
  title: string;
  source: string;
  category: 'geopolitical' | 'disaster' | 'trade' | 'industry' | 'infrastructure';
}

interface NewsTickerProps {
  items: NewsItem[];
}

export function NewsTicker({ items }: NewsTickerProps) {
  // Duplicate items for seamless infinite loop
  const duplicatedItems = [...items, ...items];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-12 bg-bg-secondary border-t border-border flex items-center overflow-hidden">
      <div className="animate-ticker whitespace-nowrap">
        {duplicatedItems.map((item, index) => (
          <span
            key={`${item.id}-${index}`}
            className="px-8 font-mono text-sm text-text-primary"
          >
            <span className="text-accent-cyan mr-2">*</span>
            {item.title}
            <span className="text-text-secondary ml-2">| {item.source}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
