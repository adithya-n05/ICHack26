import { useEffect, useMemo, useState } from 'react';

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url?: string;
  publishedAt?: string;
  category?: string;
}

interface NewsSidebarProps {
  items: NewsItem[];
  initialVisible?: number;
  updateIntervalMs?: number;
}

export function NewsSidebar({
  items,
  initialVisible = 6,
  updateIntervalMs = 60000,
}: NewsSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [visibleItems, setVisibleItems] = useState<NewsItem[]>([]);
  const [queueItems, setQueueItems] = useState<NewsItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);

  const normalizedItems = useMemo(
    () => items.filter((item) => item?.id && item.title),
    [items],
  );
  const maxVisible = Math.max(initialVisible + 4, 6);

  useEffect(() => {
    const seededVisible = normalizedItems.slice(0, initialVisible);
    const seededQueue = normalizedItems.slice(initialVisible);
    setVisibleItems(seededVisible);
    setQueueItems(seededQueue);
    setSelectedItem(null);
  }, [normalizedItems, initialVisible]);

  useEffect(() => {
    if (normalizedItems.length === 0) return;
    const interval = setInterval(() => {
      setQueueItems((prevQueue) => {
        const next = prevQueue[0];
        if (!next) {
          const recycleVisible = normalizedItems.slice(0, Math.min(maxVisible, normalizedItems.length));
          const recycleQueue = normalizedItems.slice(recycleVisible.length);
          setVisibleItems(recycleVisible);
          return recycleQueue;
        }
        setVisibleItems((prev) => [next, ...prev].slice(0, maxVisible));
        return prevQueue.slice(1);
      });
    }, updateIntervalMs);
    return () => clearInterval(interval);
  }, [normalizedItems, maxVisible, updateIntervalMs]);

  if (normalizedItems.length === 0) {
    return (
      <aside className="absolute left-4 top-4 w-72 rounded-xl bg-bg-secondary/95 px-3 py-3 text-sm text-text-secondary shadow-[0_0_20px_rgba(0,0,0,0.35)] ring-1 ring-white/5">
        Loading news feed...
      </aside>
    );
  }

  return (
    <aside
      className={`absolute left-4 top-4 z-20 ${isCollapsed ? 'w-12' : 'w-80'} transition-all duration-300`}
    >
      <div className="rounded-xl bg-bg-secondary/95 shadow-[0_0_20px_rgba(0,0,0,0.35)] ring-1 ring-white/5">
        <div className="flex items-center justify-between px-3 py-3">
          {!isCollapsed && (
            <div className="text-xs font-mono uppercase tracking-wider text-text-secondary">
              Live News Feed
            </div>
          )}
          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="h-8 w-8 rounded-lg bg-bg-tertiary text-text-primary transition hover:opacity-90"
            aria-label={isCollapsed ? 'Expand news panel' : 'Collapse news panel'}
          >
            {isCollapsed ? '›' : '‹'}
          </button>
        </div>
        {!isCollapsed && (
          <div className="max-h-[65vh] overflow-y-auto px-3 pb-3">
            {selectedItem ? (
              <div className="rounded-lg bg-bg-tertiary/70 px-3 py-3 text-sm text-text-primary">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">
                    News detail
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="font-mono text-[10px] text-accent-cyan hover:text-accent-cyan/80"
                  >
                    ← Back to feed
                  </button>
                </div>
                <div className="mt-2 font-mono text-sm">{selectedItem.title}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                  <span>{selectedItem.source}</span>
                  {selectedItem.publishedAt && (
                    <span>{new Date(selectedItem.publishedAt).toLocaleString()}</span>
                  )}
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
            ) : (
              <div className="space-y-2">
                {visibleItems.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="w-full rounded-lg bg-bg-tertiary/70 px-3 py-2 text-left text-sm text-text-primary transition hover:bg-bg-tertiary/90"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-1 text-accent-cyan">●</span>
                      <div className="min-w-0">
                        <div className="truncate font-mono">{item.title}</div>
                        <div className="text-xs text-text-secondary">{item.source}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
