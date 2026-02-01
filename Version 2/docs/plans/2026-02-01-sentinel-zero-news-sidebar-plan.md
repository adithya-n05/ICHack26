# News Sidebar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a collapsible left news sidebar that stages updates every ~60s and remove harsh borders across panels.
**Architecture:** Replace the bottom ticker with a new `NewsSidebar` overlay component that receives `news` from `App`, stages items locally, and toggles collapsed state without affecting the map layout. Replace panel borders with softer separators or shadows.
**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest, Testing Library.
---

### Task 1: NewsSidebar component + staged update tests

**Files:**
- Create: `Version 2/frontend/src/components/NewsSidebar/NewsSidebar.tsx`
- Test: `Version 2/frontend/src/components/NewsSidebar/NewsSidebar.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { NewsSidebar } from './NewsSidebar';

const items = [
  { id: 'n1', title: 'First item', source: 'Source A' },
  { id: 'n2', title: 'Second item', source: 'Source B' },
  { id: 'n3', title: 'Third item', source: 'Source C' },
];

describe('NewsSidebar', () => {
  test('reveals one new item every minute', () => {
    vi.useFakeTimers();
    render(<NewsSidebar items={items} initialVisible={1} updateIntervalMs={60000} />);

    expect(screen.getByText('First item')).toBeInTheDocument();
    expect(screen.queryByText('Second item')).toBeNull();

    vi.advanceTimersByTime(60000);
    expect(screen.getByText('Second item')).toBeInTheDocument();

    vi.advanceTimersByTime(60000);
    expect(screen.getByText('Third item')).toBeInTheDocument();

    vi.useRealTimers();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- NewsSidebar.test.tsx`
Expected: FAIL with "NewsSidebar not found" or missing props behavior.

**Step 3: Write minimal implementation**

```tsx
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

export function NewsSidebar({ items, initialVisible = 6, updateIntervalMs = 60000 }: NewsSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [visibleItems, setVisibleItems] = useState<NewsItem[]>([]);
  const [queueItems, setQueueItems] = useState<NewsItem[]>([]);

  const normalizedItems = useMemo(() => items.filter((item) => item?.id && item.title), [items]);

  useEffect(() => {
    const seededVisible = normalizedItems.slice(0, initialVisible);
    const seededQueue = normalizedItems.slice(initialVisible);
    setVisibleItems(seededVisible);
    setQueueItems(seededQueue);
  }, [normalizedItems, initialVisible]);

  useEffect(() => {
    if (normalizedItems.length === 0) return;
    const interval = setInterval(() => {
      setQueueItems((prevQueue) => {
        const next = prevQueue[0] ?? null;
        if (!next) {
          setVisibleItems((prev) => {
            const recycle = normalizedItems.slice(0, initialVisible + 1);
            return recycle;
          });
          return normalizedItems.slice(initialVisible + 1);
        }
        setVisibleItems((prev) => [next, ...prev].slice(0, initialVisible + 5));
        return prevQueue.slice(1);
      });
    }, updateIntervalMs);
    return () => clearInterval(interval);
  }, [normalizedItems, initialVisible, updateIntervalMs]);

  if (!normalizedItems.length) {
    return (
      <aside className="absolute left-4 top-4 w-72 bg-bg-secondary/95 rounded-xl px-3 py-3 text-text-secondary text-sm">
        Loading news feed...
      </aside>
    );
  }

  return (
    <aside className={`absolute left-4 top-4 ${isCollapsed ? 'w-10' : 'w-80'} transition-all`}>
      <button onClick={() => setIsCollapsed((prev) => !prev)}>Toggle</button>
      {!isCollapsed && (
        <div className="max-h-[65vh] overflow-y-auto space-y-2">
          {visibleItems.map((item) => (
            <div key={item.id}>
              <div>{item.title}</div>
              <div>{item.source}</div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- NewsSidebar.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add "Version 2/frontend/src/components/NewsSidebar/NewsSidebar.tsx" \
  "Version 2/frontend/src/components/NewsSidebar/NewsSidebar.test.tsx"
git commit -m "feat: add staged news sidebar component"
```

### Task 2: Wire sidebar into App layout

**Files:**
- Modify: `Version 2/frontend/src/App.tsx`
- Remove usage: `Version 2/frontend/src/components/NewsTicker/NewsTicker.tsx` (keep file for now if used elsewhere)

**Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import App from '../App';

test('renders the news sidebar', () => {
  render(<App />);
  expect(screen.getByText(/news/i)).toBeInTheDocument();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- App.test.tsx`
Expected: FAIL (sidebar not present).

**Step 3: Write minimal implementation**

```tsx
import { NewsSidebar } from './components/NewsSidebar/NewsSidebar';

// inside App return:
<div className="flex-1 relative">
  <Map ... />
  <NewsSidebar items={news} />
  <DetailPanel ... />
</div>
```

Remove `<NewsTicker items={news} />` from the bottom layout.

**Step 4: Run test to verify it passes**

Run: `npm test -- App.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add "Version 2/frontend/src/App.tsx"
git commit -m "feat: place news sidebar overlay"
```

### Task 3: Soften panel borders across UI

**Files:**
- Modify: `Version 2/frontend/src/App.tsx` (header/connect overlay)
- Modify: `Version 2/frontend/src/components/DetailPanel/DetailPanel.tsx`
- Modify: `Version 2/frontend/src/components/Map/Map.tsx`
- Modify: `Version 2/frontend/src/components/NewsSidebar/NewsSidebar.tsx`

**Step 1: Write the failing test**

```tsx
// Simple snapshot or DOM class assertion to ensure panels no longer use border-border-color.
```

**Step 2: Run test to verify it fails**

Run: `npm test -- NewsSidebar.test.tsx`
Expected: FAIL (old class names still present).

**Step 3: Write minimal implementation**

Replace `border border-border-color` and `border-l border-border-color` with subtle
`shadow` / `ring` classes (e.g., `shadow-[0_0_20px_rgba(0,0,0,0.35)]` and `ring-1 ring-white/5`).

**Step 4: Run test to verify it passes**

Run: `npm test -- NewsSidebar.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add "Version 2/frontend/src/components/DetailPanel/DetailPanel.tsx" \
  "Version 2/frontend/src/components/Map/Map.tsx" \
  "Version 2/frontend/src/App.tsx" \
  "Version 2/frontend/src/components/NewsSidebar/NewsSidebar.tsx"
git commit -m "style: soften panel borders"
```
