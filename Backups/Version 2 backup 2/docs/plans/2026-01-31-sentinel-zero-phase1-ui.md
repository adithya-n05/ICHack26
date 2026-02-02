# Sentinel-Zero Phase 1: UI Components Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build all UI components for the military-style command center interface including header, panels, ticker, popups, and forms.

**Architecture:** React functional components with TypeScript, Tailwind CSS for styling, dark tactical theme.

**Tech Stack:** React 18, TypeScript, Tailwind CSS

**Prerequisites:** Phase 0 must be complete (frontend project initialized with Tailwind configured)

**Total Tasks:** 40 TDD slices (U1-U40)

---

## Task U1: Header component exists

**Files:**
- Create: `frontend/src/components/Header/Header.tsx`
- Create: `frontend/src/components/Header/index.ts`

**Step 1: Write failing test**
```tsx
// In frontend/src/App.tsx, try to import:
import { Header } from './components/Header';
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run build
# Expected: "Cannot find module './components/Header'"
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/Header/Header.tsx
export function Header() {
  return <header>Header</header>;
}
```

```typescript
// frontend/src/components/Header/index.ts
export { Header } from './Header';
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run build
# Expected: Build passes
```

**Step 5: Commit**
```bash
git add frontend/src/components/Header/
git commit -m "feat: add Header component"
```

---

## Task U2: Header has logo

**Files:**
- Modify: `frontend/src/components/Header/Header.tsx`

**Step 1: Write failing test**
```
# Visual check: Header should display "SENTINEL-ZERO"
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Open browser: Header shows generic "Header" text
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/Header/Header.tsx
export function Header() {
  return (
    <header>
      <h1 className="text-accent-cyan font-mono font-bold tracking-wider text-sm">
        SENTINEL-ZERO
      </h1>
    </header>
  );
}
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Header shows "SENTINEL-ZERO" in cyan
```

**Step 5: Commit**
```bash
git add frontend/src/components/Header/
git commit -m "feat: add app name to header"
```

---

## Task U3: Header styled dark

**Files:**
- Modify: `frontend/src/components/Header/Header.tsx`

**Step 1: Write failing test**
```
# Visual check: Header should have dark background (#1A1A1A)
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Header has no background styling
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/Header/Header.tsx
export function Header() {
  return (
    <header className="bg-bg-secondary border-b border-border-color flex items-center px-4">
      <h1 className="text-accent-cyan font-mono font-bold tracking-wider text-sm">
        SENTINEL-ZERO
      </h1>
    </header>
  );
}
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Header has dark charcoal background with border
```

**Step 5: Commit**
```bash
git add frontend/src/components/Header/
git commit -m "style: header dark theme"
```

---

## Task U4: Header height correct

**Files:**
- Modify: `frontend/src/components/Header/Header.tsx`

**Step 1: Write failing test**
```
# Visual check: Header should be exactly 40px (h-10)
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Header height varies based on content
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/Header/Header.tsx
export function Header() {
  return (
    <header className="h-10 bg-bg-secondary border-b border-border-color flex items-center px-4">
      <h1 className="text-accent-cyan font-mono font-bold tracking-wider text-sm">
        SENTINEL-ZERO
      </h1>
    </header>
  );
}
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Header is exactly 40px tall
```

**Step 5: Commit**
```bash
git add frontend/src/components/Header/
git commit -m "style: header height 40px"
```

---

## Task U5: Layer control panel exists

**Files:**
- Create: `frontend/src/components/LayerControlPanel/LayerControlPanel.tsx`
- Create: `frontend/src/components/LayerControlPanel/index.ts`

**Step 1: Write failing test**
```tsx
import { LayerControlPanel } from './components/LayerControlPanel';
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run build
# Expected: "Cannot find module"
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/LayerControlPanel/LayerControlPanel.tsx
export function LayerControlPanel() {
  return (
    <div className="bg-bg-secondary border-r border-border-color p-4">
      <h3 className="text-text-primary font-mono text-sm mb-4">LAYERS</h3>
    </div>
  );
}
```

```typescript
// frontend/src/components/LayerControlPanel/index.ts
export { LayerControlPanel } from './LayerControlPanel';
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run build
# Expected: Build passes
```

**Step 5: Commit**
```bash
git add frontend/src/components/LayerControlPanel/
git commit -m "feat: add LayerControlPanel component"
```

---

## Task U6: Layer panel positioned left

**Files:**
- Modify: `frontend/src/components/LayerControlPanel/LayerControlPanel.tsx`

**Step 1: Write failing test**
```
# Visual check: Panel should be on left side of screen
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Panel is in normal document flow
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/LayerControlPanel/LayerControlPanel.tsx
export function LayerControlPanel() {
  return (
    <div className="absolute left-0 top-10 w-48 h-[calc(100vh-40px)] bg-bg-secondary border-r border-border-color p-4">
      <h3 className="text-text-primary font-mono text-sm mb-4">LAYERS</h3>
    </div>
  );
}
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Panel is positioned on left side, below header
```

**Step 5: Commit**
```bash
git add frontend/src/components/LayerControlPanel/
git commit -m "style: position layer panel left"
```

---

## Task U7: Layer panel collapsible state

**Files:**
- Modify: `frontend/src/components/LayerControlPanel/LayerControlPanel.tsx`

**Step 1: Write failing test**
```typescript
// Check: Component should have isCollapsed state
const [isCollapsed, setIsCollapsed] = useState(false);
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# No collapse functionality exists
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/LayerControlPanel/LayerControlPanel.tsx
import { useState } from 'react';

export function LayerControlPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`absolute left-0 top-10 ${isCollapsed ? 'w-12' : 'w-48'} h-[calc(100vh-40px)] bg-bg-secondary border-r border-border-color p-4 transition-all duration-200`}>
      <h3 className="text-text-primary font-mono text-sm mb-4">LAYERS</h3>
    </div>
  );
}
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run build
# Build passes with state defined
```

**Step 5: Commit**
```bash
git add frontend/src/components/LayerControlPanel/
git commit -m "feat: add panel collapse state"
```

---

## Task U8: Layer panel collapse toggle

**Files:**
- Modify: `frontend/src/components/LayerControlPanel/LayerControlPanel.tsx`

**Step 1: Write failing test**
```
# Visual check: Should have button to collapse/expand panel
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# No collapse button visible
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/LayerControlPanel/LayerControlPanel.tsx
import { useState } from 'react';

export function LayerControlPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`absolute left-0 top-10 ${isCollapsed ? 'w-12' : 'w-48'} h-[calc(100vh-40px)] bg-bg-secondary border-r border-border-color p-2 transition-all duration-200`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="text-text-primary hover:text-accent-cyan mb-4 w-full text-left"
      >
        {isCollapsed ? '→' : '←'}
      </button>
      {!isCollapsed && (
        <h3 className="text-text-primary font-mono text-sm mb-4">LAYERS</h3>
      )}
    </div>
  );
}
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Clicking button toggles panel width
```

**Step 5: Commit**
```bash
git add frontend/src/components/LayerControlPanel/
git commit -m "feat: add collapse toggle"
```

---

## Task U9: Layer panel hides content when collapsed

**Files:**
- Modify: `frontend/src/components/LayerControlPanel/LayerControlPanel.tsx`

**Step 1: Write failing test**
```
# Visual check: When collapsed, only toggle button visible
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Content still visible when collapsed (text wraps)
```

**Step 3: Minimal implementation**
```typescript
// The implementation from U8 already handles this with:
{!isCollapsed && (
  <h3 className="text-text-primary font-mono text-sm mb-4">LAYERS</h3>
)}
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Content hidden when collapsed
```

**Step 5: Commit**
```bash
git add frontend/src/components/LayerControlPanel/
git commit -m "feat: hide panel content when collapsed"
```

---

## Task U10: Layer toggle checkbox exists

**Files:**
- Modify: `frontend/src/components/LayerControlPanel/LayerControlPanel.tsx`

**Step 1: Write failing test**
```
# Visual check: Should have checkbox for node layer
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# No checkboxes visible
```

**Step 3: Minimal implementation**
```typescript
// Add inside the !isCollapsed block:
<label className="flex items-center gap-2 mb-2 text-text-primary text-sm cursor-pointer">
  <input type="checkbox" defaultChecked className="accent-accent-cyan" />
  Nodes
</label>
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Checkbox visible for nodes
```

**Step 5: Commit**
```bash
git add frontend/src/components/LayerControlPanel/
git commit -m "feat: add node layer checkbox"
```

---

## Task U11: Layer toggle state

**Files:**
- Modify: `frontend/src/components/LayerControlPanel/LayerControlPanel.tsx`

**Step 1: Write failing test**
```typescript
// Check: Layer visibility should be tracked in state
const [layers, setLayers] = useState({ nodes: true, arcs: true, heatmaps: true, tariffs: true });
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Checkbox state not managed
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/LayerControlPanel/LayerControlPanel.tsx
import { useState } from 'react';

interface LayerControlPanelProps {
  onLayerChange?: (layers: Record<string, boolean>) => void;
}

export function LayerControlPanel({ onLayerChange }: LayerControlPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [layers, setLayers] = useState({
    nodes: true,
    arcs: true,
    heatmaps: true,
    tariffs: true,
  });

  const toggleLayer = (layer: string) => {
    const newLayers = { ...layers, [layer]: !layers[layer as keyof typeof layers] };
    setLayers(newLayers);
    onLayerChange?.(newLayers);
  };

  return (
    <div className={`absolute left-0 top-10 ${isCollapsed ? 'w-12' : 'w-48'} h-[calc(100vh-40px)] bg-bg-secondary border-r border-border-color p-2 transition-all duration-200`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="text-text-primary hover:text-accent-cyan mb-4 w-full text-left"
      >
        {isCollapsed ? '→' : '←'}
      </button>
      {!isCollapsed && (
        <>
          <h3 className="text-text-primary font-mono text-sm mb-4">LAYERS</h3>
          {Object.entries(layers).map(([key, value]) => (
            <label key={key} className="flex items-center gap-2 mb-2 text-text-primary text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={value}
                onChange={() => toggleLayer(key)}
                className="accent-accent-cyan"
              />
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
          ))}
        </>
      )}
    </div>
  );
}
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run build
# Build passes with state management
```

**Step 5: Commit**
```bash
git add frontend/src/components/LayerControlPanel/
git commit -m "feat: track layer visibility state"
```

---

## Task U12: Layer toggle wired to callback

**Files:**
- Modify: `frontend/src/components/LayerControlPanel/LayerControlPanel.tsx`

**Step 1: Write failing test**
```typescript
// Check: onLayerChange callback should be called when checkbox changes
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Add console.log to verify callback not firing
```

**Step 3: Minimal implementation**
```typescript
// Already implemented in U11 with:
onLayerChange?.(newLayers);
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Console logs layer changes
```

**Step 5: Commit**
```bash
git add frontend/src/components/LayerControlPanel/
git commit -m "feat: wire layer toggle to callback"
```

---

## Task U13: All layer toggles present

**Files:**
- Verify: `frontend/src/components/LayerControlPanel/LayerControlPanel.tsx`

**Step 1: Write failing test**
```
# Visual check: Should have checkboxes for nodes, arcs, heatmaps, tariffs
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Count checkboxes - should be 4
```

**Step 3: Minimal implementation**
```typescript
// Already implemented in U11 with the layers object containing all 4 keys
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# 4 checkboxes visible: Nodes, Arcs, Heatmaps, Tariffs
```

**Step 5: Commit**
```bash
git add frontend/src/components/LayerControlPanel/
git commit -m "feat: add all layer toggles"
```

---

## Task U14: Detail panel exists

**Files:**
- Create: `frontend/src/components/DetailPanel/DetailPanel.tsx`
- Create: `frontend/src/components/DetailPanel/index.ts`

**Step 1: Write failing test**
```tsx
import { DetailPanel } from './components/DetailPanel';
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run build
# Expected: "Cannot find module"
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/DetailPanel/DetailPanel.tsx
interface DetailPanelProps {
  selectedNode: any | null;
  onClose: () => void;
}

export function DetailPanel({ selectedNode, onClose }: DetailPanelProps) {
  if (!selectedNode) return null;

  return (
    <aside>
      <h2>{selectedNode.name}</h2>
      <button onClick={onClose}>Close</button>
    </aside>
  );
}
```

```typescript
// frontend/src/components/DetailPanel/index.ts
export { DetailPanel } from './DetailPanel';
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run build
# Expected: Build passes
```

**Step 5: Commit**
```bash
git add frontend/src/components/DetailPanel/
git commit -m "feat: add DetailPanel component"
```

---

## Task U15: Detail panel positioned right

**Files:**
- Modify: `frontend/src/components/DetailPanel/DetailPanel.tsx`

**Step 1: Write failing test**
```
# Visual check: Panel should be on right side of screen
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Panel is in normal document flow
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/DetailPanel/DetailPanel.tsx
interface DetailPanelProps {
  selectedNode: any | null;
  onClose: () => void;
}

export function DetailPanel({ selectedNode, onClose }: DetailPanelProps) {
  if (!selectedNode) return null;

  return (
    <aside className="absolute right-0 top-10 h-[calc(100vh-40px)] bg-bg-secondary border-l border-border-color p-4">
      <h2>{selectedNode.name}</h2>
      <button onClick={onClose}>Close</button>
    </aside>
  );
}
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Panel positioned on right side
```

**Step 5: Commit**
```bash
git add frontend/src/components/DetailPanel/
git commit -m "style: position detail panel right"
```

---

## Task U16: Detail panel width

**Files:**
- Modify: `frontend/src/components/DetailPanel/DetailPanel.tsx`

**Step 1: Write failing test**
```
# Visual check: Panel should be 350px wide
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Panel width based on content
```

**Step 3: Minimal implementation**
```typescript
<aside className="absolute right-0 top-10 w-[350px] h-[calc(100vh-40px)] bg-bg-secondary border-l border-border-color p-4">
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Panel is exactly 350px wide
```

**Step 5: Commit**
```bash
git add frontend/src/components/DetailPanel/
git commit -m "style: detail panel width 350px"
```

---

## Task U17: Detail panel styled dark

**Files:**
- Modify: `frontend/src/components/DetailPanel/DetailPanel.tsx`

**Step 1: Write failing test**
```
# Visual check: Panel should have dark charcoal background
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Background already set in previous tasks
```

**Step 3: Minimal implementation**
```typescript
// Already applied: bg-bg-secondary border-l border-border-color
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Panel has dark styling
```

**Step 5: Commit**
```bash
git add frontend/src/components/DetailPanel/
git commit -m "style: detail panel dark theme"
```

---

## Task U18: Detail panel receives node data

**Files:**
- Modify: `frontend/src/components/DetailPanel/DetailPanel.tsx`

**Step 1: Write failing test**
```
# Visual check: Panel should display selected node's name
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Panel shows generic placeholder
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/DetailPanel/DetailPanel.tsx
interface DetailPanelProps {
  selectedNode: {
    name: string;
    type?: string;
    city?: string;
    country?: string;
  } | null;
  onClose: () => void;
}

export function DetailPanel({ selectedNode, onClose }: DetailPanelProps) {
  if (!selectedNode) return null;

  return (
    <aside className="absolute right-0 top-10 w-[350px] h-[calc(100vh-40px)] bg-bg-secondary border-l border-border-color p-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-accent-cyan font-mono text-lg">{selectedNode.name}</h2>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
          ✕
        </button>
      </div>
    </aside>
  );
}
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Panel shows node name when selected
```

**Step 5: Commit**
```bash
git add frontend/src/components/DetailPanel/
git commit -m "feat: pass selected node to detail panel"
```

---

## Task U19: Detail panel sections

**Files:**
- Modify: `frontend/src/components/DetailPanel/DetailPanel.tsx`

**Step 1: Write failing test**
```
# Visual check: Panel should have labeled sections
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Panel is flat with just name
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/DetailPanel/DetailPanel.tsx
interface DetailPanelProps {
  selectedNode: {
    name: string;
    type?: string;
    city?: string;
    country?: string;
  } | null;
  onClose: () => void;
}

export function DetailPanel({ selectedNode, onClose }: DetailPanelProps) {
  if (!selectedNode) return null;

  return (
    <aside className="absolute right-0 top-10 w-[350px] h-[calc(100vh-40px)] bg-bg-secondary border-l border-border-color p-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-accent-cyan font-mono text-lg">{selectedNode.name}</h2>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
          ✕
        </button>
      </div>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase">Location</h3>
        <p className="text-text-primary text-sm">
          {selectedNode.city && selectedNode.country
            ? `${selectedNode.city}, ${selectedNode.country}`
            : 'Unknown'}
        </p>
      </section>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase">Type</h3>
        <p className="text-text-primary text-sm">{selectedNode.type || 'Unknown'}</p>
      </section>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase">Risk Status</h3>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-accent-green"></span>
          <span className="text-text-primary text-sm">Healthy</span>
        </div>
      </section>
    </aside>
  );
}
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Panel shows Location, Type, Risk Status sections
```

**Step 5: Commit**
```bash
git add frontend/src/components/DetailPanel/
git commit -m "feat: add detail panel sections"
```

---

## Task U20: Detail panel close button

**Files:**
- Modify: `frontend/src/components/DetailPanel/DetailPanel.tsx`

**Step 1: Write failing test**
```
# Visual check: X button should close panel
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Check if close button works
```

**Step 3: Minimal implementation**
```typescript
// Already implemented with:
<button onClick={onClose} className="text-text-secondary hover:text-text-primary">
  ✕
</button>
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Clicking X calls onClose callback
```

**Step 5: Commit**
```bash
git add frontend/src/components/DetailPanel/
git commit -m "feat: add detail panel close button"
```

---

## Task U21: News ticker exists

**Files:**
- Create: `frontend/src/components/NewsTicker/NewsTicker.tsx`
- Create: `frontend/src/components/NewsTicker/index.ts`

**Step 1: Write failing test**
```tsx
import { NewsTicker } from './components/NewsTicker';
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run build
# Expected: "Cannot find module"
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/NewsTicker/NewsTicker.tsx
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
  return (
    <div>
      {items.map((item) => (
        <span key={item.id}>{item.title}</span>
      ))}
    </div>
  );
}
```

```typescript
// frontend/src/components/NewsTicker/index.ts
export { NewsTicker } from './NewsTicker';
export type { NewsItem } from './NewsTicker';
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run build
# Expected: Build passes
```

**Step 5: Commit**
```bash
git add frontend/src/components/NewsTicker/
git commit -m "feat: add NewsTicker component"
```

---

## Task U22: News ticker positioned bottom

**Files:**
- Modify: `frontend/src/components/NewsTicker/NewsTicker.tsx`

**Step 1: Write failing test**
```
# Visual check: Ticker should be at bottom of screen
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Ticker is in normal document flow
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/NewsTicker/NewsTicker.tsx
export function NewsTicker({ items }: NewsTickerProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-border-color">
      {items.map((item) => (
        <span key={item.id}>{item.title}</span>
      ))}
    </div>
  );
}
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Ticker fixed at bottom
```

**Step 5: Commit**
```bash
git add frontend/src/components/NewsTicker/
git commit -m "style: position ticker bottom"
```

---

## Task U23: News ticker height

**Files:**
- Modify: `frontend/src/components/NewsTicker/NewsTicker.tsx`

**Step 1: Write failing test**
```
# Visual check: Ticker should be 48px (h-12) tall
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Ticker height varies
```

**Step 3: Minimal implementation**
```typescript
<div className="fixed bottom-0 left-0 right-0 h-12 bg-bg-secondary border-t border-border-color flex items-center overflow-hidden">
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Ticker is exactly 48px tall
```

**Step 5: Commit**
```bash
git add frontend/src/components/NewsTicker/
git commit -m "style: ticker height 48px"
```

---

## Task U24: News ticker styled dark

**Files:**
- Modify: `frontend/src/components/NewsTicker/NewsTicker.tsx`

**Step 1: Write failing test**
```
# Visual check: Ticker should have dark background
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Already styled dark from previous tasks
```

**Step 3: Minimal implementation**
```typescript
// Already applied: bg-bg-secondary border-t border-border-color
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Ticker has dark styling
```

**Step 5: Commit**
```bash
git add frontend/src/components/NewsTicker/
git commit -m "style: ticker dark theme"
```

---

## Task U25: News ticker content scrolls

**Files:**
- Modify: `frontend/src/components/NewsTicker/NewsTicker.tsx`
- Modify: `frontend/src/index.css`

**Step 1: Write failing test**
```
# Visual check: News text should scroll horizontally
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Text is static
```

**Step 3: Minimal implementation**
```css
/* Add to frontend/src/index.css */
@keyframes ticker {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.animate-ticker {
  animation: ticker 30s linear infinite;
}
```

```typescript
// frontend/src/components/NewsTicker/NewsTicker.tsx
export function NewsTicker({ items }: NewsTickerProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-12 bg-bg-secondary border-t border-border-color flex items-center overflow-hidden">
      <div className="animate-ticker whitespace-nowrap">
        {items.map((item) => (
          <span key={item.id} className="px-8 font-mono text-sm text-text-primary">
            <span className="text-accent-cyan mr-2">⚡</span>
            {item.title}
            <span className="text-text-secondary ml-2">| {item.source}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Text scrolls horizontally
```

**Step 5: Commit**
```bash
git add frontend/src/components/NewsTicker/ frontend/src/index.css
git commit -m "feat: ticker scroll animation"
```

---

## Task U26: News ticker receives items

**Files:**
- Modify: `frontend/src/components/NewsTicker/NewsTicker.tsx`

**Step 1: Write failing test**
```
# Visual check: Ticker should display passed news items
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Already implemented
```

**Step 3: Minimal implementation**
```typescript
// Already implemented with items prop mapping
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Ticker shows news items
```

**Step 5: Commit**
```bash
git add frontend/src/components/NewsTicker/
git commit -m "feat: pass news items to ticker"
```

---

## Task U27: News ticker infinite scroll

**Files:**
- Modify: `frontend/src/components/NewsTicker/NewsTicker.tsx`

**Step 1: Write failing test**
```
# Visual check: Animation should loop infinitely
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Animation may have gaps
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/NewsTicker/NewsTicker.tsx
export function NewsTicker({ items }: NewsTickerProps) {
  // Duplicate items for seamless loop
  const duplicatedItems = [...items, ...items];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-12 bg-bg-secondary border-t border-border-color flex items-center overflow-hidden">
      <div className="animate-ticker whitespace-nowrap">
        {duplicatedItems.map((item, index) => (
          <span key={`${item.id}-${index}`} className="px-8 font-mono text-sm text-text-primary">
            <span className="text-accent-cyan mr-2">⚡</span>
            {item.title}
            <span className="text-text-secondary ml-2">| {item.source}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Animation loops seamlessly
```

**Step 5: Commit**
```bash
git add frontend/src/components/NewsTicker/
git commit -m "feat: infinite ticker scroll"
```

---

## Task U28: Node popup exists

**Files:**
- Create: `frontend/src/components/NodePopup/NodePopup.tsx`
- Create: `frontend/src/components/NodePopup/index.ts`

**Step 1: Write failing test**
```tsx
import { NodePopup } from './components/NodePopup';
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run build
# Expected: "Cannot find module"
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/NodePopup/NodePopup.tsx
interface NodePopupProps {
  node: { name: string; type?: string };
  x: number;
  y: number;
  onViewDetails: () => void;
  onClose: () => void;
}

export function NodePopup({ node, x, y, onViewDetails, onClose }: NodePopupProps) {
  return (
    <div style={{ left: x, top: y }}>
      <span>{node.name}</span>
    </div>
  );
}
```

```typescript
// frontend/src/components/NodePopup/index.ts
export { NodePopup } from './NodePopup';
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run build
# Expected: Build passes
```

**Step 5: Commit**
```bash
git add frontend/src/components/NodePopup/
git commit -m "feat: add NodePopup component"
```

---

## Task U29: Node popup receives node

**Files:**
- Modify: `frontend/src/components/NodePopup/NodePopup.tsx`

**Step 1: Write failing test**
```
# Visual check: Popup should display node name
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Already implemented
```

**Step 3: Minimal implementation**
```typescript
// Already implemented with node.name display
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Popup shows node name
```

**Step 5: Commit**
```bash
git add frontend/src/components/NodePopup/
git commit -m "feat: pass node to popup"
```

---

## Task U30: Node popup positioned

**Files:**
- Modify: `frontend/src/components/NodePopup/NodePopup.tsx`

**Step 1: Write failing test**
```
# Visual check: Popup should appear at specified x,y coordinates
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Popup position not set
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/NodePopup/NodePopup.tsx
export function NodePopup({ node, x, y, onViewDetails, onClose }: NodePopupProps) {
  return (
    <div
      className="absolute z-50"
      style={{ left: x, top: y, transform: 'translate(-50%, -100%) translateY(-10px)' }}
    >
      <span>{node.name}</span>
    </div>
  );
}
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Popup appears at correct position
```

**Step 5: Commit**
```bash
git add frontend/src/components/NodePopup/
git commit -m "feat: position popup near node"
```

---

## Task U31: Node popup styled

**Files:**
- Modify: `frontend/src/components/NodePopup/NodePopup.tsx`

**Step 1: Write failing test**
```
# Visual check: Popup should match dark theme
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Popup has no styling
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/NodePopup/NodePopup.tsx
export function NodePopup({ node, x, y, onViewDetails, onClose }: NodePopupProps) {
  return (
    <div
      className="absolute z-50 bg-bg-tertiary rounded border border-border-color p-3 shadow-lg min-w-[200px]"
      style={{ left: x, top: y, transform: 'translate(-50%, -100%) translateY(-10px)' }}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-accent-cyan font-mono text-sm font-bold">{node.name}</span>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary ml-4 text-xs">
          ✕
        </button>
      </div>
      <p className="text-text-secondary text-xs">{node.type || 'Unknown type'}</p>
    </div>
  );
}
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Popup has dark styling with border
```

**Step 5: Commit**
```bash
git add frontend/src/components/NodePopup/
git commit -m "style: popup dark theme"
```

---

## Task U32: Node popup action buttons

**Files:**
- Modify: `frontend/src/components/NodePopup/NodePopup.tsx`

**Step 1: Write failing test**
```
# Visual check: Popup should have action buttons
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# No action buttons
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/NodePopup/NodePopup.tsx
interface NodePopupProps {
  node: { name: string; type?: string };
  x: number;
  y: number;
  onViewDetails: () => void;
  onViewAlternatives?: () => void;
  onClose: () => void;
}

export function NodePopup({ node, x, y, onViewDetails, onViewAlternatives, onClose }: NodePopupProps) {
  return (
    <div
      className="absolute z-50 bg-bg-tertiary rounded border border-border-color p-3 shadow-lg min-w-[200px]"
      style={{ left: x, top: y, transform: 'translate(-50%, -100%) translateY(-10px)' }}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-accent-cyan font-mono text-sm font-bold">{node.name}</span>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary ml-4 text-xs">
          ✕
        </button>
      </div>
      <p className="text-text-secondary text-xs mb-3">{node.type || 'Unknown type'}</p>
      <div className="flex gap-2">
        <button
          onClick={onViewDetails}
          className="text-accent-cyan text-xs hover:underline"
        >
          Details →
        </button>
        {onViewAlternatives && (
          <button
            onClick={onViewAlternatives}
            className="text-accent-green text-xs hover:underline"
          >
            Alternatives
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Popup has Details and Alternatives buttons
```

**Step 5: Commit**
```bash
git add frontend/src/components/NodePopup/
git commit -m "feat: add popup action buttons"
```

---

## Task U33: Supplier form component exists

**Files:**
- Create: `frontend/src/components/SupplierForm/SupplierForm.tsx`
- Create: `frontend/src/components/SupplierForm/index.ts`

**Step 1: Write failing test**
```tsx
import { SupplierForm } from './components/SupplierForm';
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run build
# Expected: "Cannot find module"
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/SupplierForm/SupplierForm.tsx
export function SupplierForm() {
  return (
    <form className="bg-bg-secondary p-6 rounded border border-border-color">
      <h2 className="text-text-primary font-mono text-lg mb-4">Add Your Supply Chain</h2>
    </form>
  );
}
```

```typescript
// frontend/src/components/SupplierForm/index.ts
export { SupplierForm } from './SupplierForm';
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run build
# Expected: Build passes
```

**Step 5: Commit**
```bash
git add frontend/src/components/SupplierForm/
git commit -m "feat: add SupplierForm component"
```

---

## Task U34: Supplier form step 1 - company name

**Files:**
- Modify: `frontend/src/components/SupplierForm/SupplierForm.tsx`

**Step 1: Write failing test**
```
# Visual check: Form should have company name input
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# No input fields
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/SupplierForm/SupplierForm.tsx
import { useState } from 'react';

export function SupplierForm() {
  const [companyName, setCompanyName] = useState('');

  return (
    <form className="bg-bg-secondary p-6 rounded border border-border-color">
      <h2 className="text-text-primary font-mono text-lg mb-4">Add Your Supply Chain</h2>

      <div className="mb-4">
        <label className="block text-text-secondary text-xs font-mono mb-2 uppercase">
          Company Name
        </label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Your company name"
          className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary focus:border-accent-cyan focus:outline-none"
        />
      </div>
    </form>
  );
}
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Company name input visible
```

**Step 5: Commit**
```bash
git add frontend/src/components/SupplierForm/
git commit -m "feat: add company name input"
```

---

## Task U35: Supplier form step 1 - location

**Files:**
- Modify: `frontend/src/components/SupplierForm/SupplierForm.tsx`

**Step 1: Write failing test**
```
# Visual check: Form should have location input
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# No location input
```

**Step 3: Minimal implementation**
```typescript
// Add to SupplierForm after company name:
const [location, setLocation] = useState({ city: '', country: '' });

// Add in form:
<div className="mb-4 grid grid-cols-2 gap-4">
  <div>
    <label className="block text-text-secondary text-xs font-mono mb-2 uppercase">
      City
    </label>
    <input
      type="text"
      value={location.city}
      onChange={(e) => setLocation({ ...location, city: e.target.value })}
      placeholder="City"
      className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary focus:border-accent-cyan focus:outline-none"
    />
  </div>
  <div>
    <label className="block text-text-secondary text-xs font-mono mb-2 uppercase">
      Country
    </label>
    <input
      type="text"
      value={location.country}
      onChange={(e) => setLocation({ ...location, country: e.target.value })}
      placeholder="Country"
      className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary focus:border-accent-cyan focus:outline-none"
    />
  </div>
</div>
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# City and Country inputs visible
```

**Step 5: Commit**
```bash
git add frontend/src/components/SupplierForm/
git commit -m "feat: add company location input"
```

---

## Task U36: Supplier form step 2 - supplier name

**Files:**
- Modify: `frontend/src/components/SupplierForm/SupplierForm.tsx`

**Step 1: Write failing test**
```
# Visual check: Step 2 should have supplier name input
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# No supplier name input
```

**Step 3: Minimal implementation**
```typescript
// Add state for suppliers:
const [suppliers, setSuppliers] = useState<Array<{ name: string; location: string; materials: string[] }>>([]);
const [currentSupplier, setCurrentSupplier] = useState({ name: '', location: '', materials: [] as string[] });

// Add supplier input section (will be shown in step 2)
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Supplier name input available
```

**Step 5: Commit**
```bash
git add frontend/src/components/SupplierForm/
git commit -m "feat: add supplier name input"
```

---

## Task U37: Supplier form step 2 - supplier location

**Files:**
- Modify: `frontend/src/components/SupplierForm/SupplierForm.tsx`

**Step 1: Write failing test**
```
# Visual check: Step 2 should have supplier location input
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# No supplier location input
```

**Step 3: Minimal implementation**
```typescript
// Add supplier location field to currentSupplier state and form
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Supplier location input visible
```

**Step 5: Commit**
```bash
git add frontend/src/components/SupplierForm/
git commit -m "feat: add supplier location input"
```

---

## Task U38: Supplier form step 2 - materials

**Files:**
- Modify: `frontend/src/components/SupplierForm/SupplierForm.tsx`

**Step 1: Write failing test**
```
# Visual check: Step 2 should have material selection
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# No material selection
```

**Step 3: Minimal implementation**
```typescript
// Add material categories:
const MATERIAL_OPTIONS = [
  'Silicon Wafers',
  'DRAM Chips',
  'NAND Flash',
  'Processors',
  'Logic Chips',
  'Passive Components',
  'PCB',
  'Packaging Materials',
];

// Add in form:
<div className="mb-4">
  <label className="block text-text-secondary text-xs font-mono mb-2 uppercase">
    Materials Supplied
  </label>
  <div className="grid grid-cols-2 gap-2">
    {MATERIAL_OPTIONS.map((material) => (
      <label key={material} className="flex items-center gap-2 text-text-primary text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={currentSupplier.materials.includes(material)}
          onChange={(e) => {
            if (e.target.checked) {
              setCurrentSupplier({
                ...currentSupplier,
                materials: [...currentSupplier.materials, material],
              });
            } else {
              setCurrentSupplier({
                ...currentSupplier,
                materials: currentSupplier.materials.filter((m) => m !== material),
              });
            }
          }}
          className="accent-accent-cyan"
        />
        {material}
      </label>
    ))}
  </div>
</div>
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Material checkboxes visible
```

**Step 5: Commit**
```bash
git add frontend/src/components/SupplierForm/
git commit -m "feat: add material selection"
```

---

## Task U39: Supplier form wizard steps

**Files:**
- Modify: `frontend/src/components/SupplierForm/SupplierForm.tsx`

**Step 1: Write failing test**
```
# Visual check: Form should have step navigation
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# No step navigation
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/SupplierForm/SupplierForm.tsx
import { useState } from 'react';

const MATERIAL_OPTIONS = [
  'Silicon Wafers', 'DRAM Chips', 'NAND Flash', 'Processors',
  'Logic Chips', 'Passive Components', 'PCB', 'Packaging Materials',
];

interface SupplierFormProps {
  onSubmit?: (data: any) => void;
}

export function SupplierForm({ onSubmit }: SupplierFormProps) {
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState({ city: '', country: '' });
  const [suppliers, setSuppliers] = useState<Array<{ name: string; location: string; materials: string[] }>>([]);
  const [currentSupplier, setCurrentSupplier] = useState({ name: '', location: '', materials: [] as string[] });

  const handleAddSupplier = () => {
    if (currentSupplier.name) {
      setSuppliers([...suppliers, currentSupplier]);
      setCurrentSupplier({ name: '', location: '', materials: [] });
    }
  };

  const handleSubmit = () => {
    onSubmit?.({
      company: { name: companyName, location },
      suppliers,
    });
  };

  return (
    <form className="bg-bg-secondary p-6 rounded border border-border-color max-w-lg">
      {/* Step indicators */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono
              ${step >= s ? 'bg-accent-cyan text-bg-primary' : 'bg-bg-tertiary text-text-secondary'}`}
          >
            {s}
          </div>
        ))}
      </div>

      {/* Step 1: Company Info */}
      {step === 1 && (
        <div>
          <h3 className="text-text-primary font-mono mb-4">Your Company</h3>
          <div className="mb-4">
            <label className="block text-text-secondary text-xs font-mono mb-2 uppercase">
              Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your company name"
              className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-text-secondary text-xs font-mono mb-2 uppercase">City</label>
              <input
                type="text"
                value={location.city}
                onChange={(e) => setLocation({ ...location, city: e.target.value })}
                placeholder="City"
                className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary focus:border-accent-cyan focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-text-secondary text-xs font-mono mb-2 uppercase">Country</label>
              <input
                type="text"
                value={location.country}
                onChange={(e) => setLocation({ ...location, country: e.target.value })}
                placeholder="Country"
                className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary focus:border-accent-cyan focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Add Suppliers */}
      {step === 2 && (
        <div>
          <h3 className="text-text-primary font-mono mb-4">Add Suppliers</h3>
          {suppliers.length > 0 && (
            <div className="mb-4 p-2 bg-bg-tertiary rounded">
              <p className="text-text-secondary text-xs mb-2">Added suppliers:</p>
              {suppliers.map((s, i) => (
                <p key={i} className="text-text-primary text-sm">{s.name}</p>
              ))}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-text-secondary text-xs font-mono mb-2 uppercase">Supplier Name</label>
            <input
              type="text"
              value={currentSupplier.name}
              onChange={(e) => setCurrentSupplier({ ...currentSupplier, name: e.target.value })}
              placeholder="Supplier company name"
              className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <div className="mb-4">
            <label className="block text-text-secondary text-xs font-mono mb-2 uppercase">Location</label>
            <input
              type="text"
              value={currentSupplier.location}
              onChange={(e) => setCurrentSupplier({ ...currentSupplier, location: e.target.value })}
              placeholder="City, Country"
              className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary focus:border-accent-cyan focus:outline-none"
            />
          </div>
          <div className="mb-4">
            <label className="block text-text-secondary text-xs font-mono mb-2 uppercase">Materials</label>
            <div className="grid grid-cols-2 gap-2">
              {MATERIAL_OPTIONS.map((material) => (
                <label key={material} className="flex items-center gap-2 text-text-primary text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentSupplier.materials.includes(material)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCurrentSupplier({ ...currentSupplier, materials: [...currentSupplier.materials, material] });
                      } else {
                        setCurrentSupplier({ ...currentSupplier, materials: currentSupplier.materials.filter((m) => m !== material) });
                      }
                    }}
                    className="accent-accent-cyan"
                  />
                  {material}
                </label>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddSupplier}
            className="text-accent-cyan text-sm hover:underline"
          >
            + Add Supplier
          </button>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div>
          <h3 className="text-text-primary font-mono mb-4">Review</h3>
          <div className="mb-4 p-3 bg-bg-tertiary rounded">
            <p className="text-text-secondary text-xs mb-1">Company</p>
            <p className="text-text-primary">{companyName}</p>
            <p className="text-text-secondary text-sm">{location.city}, {location.country}</p>
          </div>
          <div className="mb-4">
            <p className="text-text-secondary text-xs mb-2">Suppliers ({suppliers.length})</p>
            {suppliers.map((s, i) => (
              <div key={i} className="p-2 bg-bg-tertiary rounded mb-2">
                <p className="text-text-primary text-sm">{s.name}</p>
                <p className="text-text-secondary text-xs">{s.location}</p>
                <p className="text-accent-cyan text-xs">{s.materials.join(', ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="px-4 py-2 text-text-secondary disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => {
            if (step === 3) {
              handleSubmit();
            } else {
              setStep((s) => Math.min(3, s + 1));
            }
          }}
          className="px-4 py-2 bg-accent-cyan text-bg-primary rounded hover:opacity-90"
        >
          {step === 3 ? 'Submit' : 'Next'}
        </button>
      </div>
    </form>
  );
}
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Form has step indicators and navigation
```

**Step 5: Commit**
```bash
git add frontend/src/components/SupplierForm/
git commit -m "feat: add form wizard navigation"
```

---

## Task U40: Supplier form validation

**Files:**
- Modify: `frontend/src/components/SupplierForm/SupplierForm.tsx`

**Step 1: Write failing test**
```
# Visual check: Form should validate before advancing steps
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run dev
# Can advance with empty fields
```

**Step 3: Minimal implementation**
```typescript
// Add validation check before step advancement:
const canAdvance = () => {
  if (step === 1) {
    return companyName.trim() !== '' && location.city.trim() !== '' && location.country.trim() !== '';
  }
  if (step === 2) {
    return suppliers.length > 0;
  }
  return true;
};

// Modify next button:
<button
  type="button"
  onClick={() => {
    if (step === 3) {
      handleSubmit();
    } else if (canAdvance()) {
      setStep((s) => Math.min(3, s + 1));
    }
  }}
  disabled={!canAdvance() && step !== 3}
  className="px-4 py-2 bg-accent-cyan text-bg-primary rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {step === 3 ? 'Submit' : 'Next'}
</button>
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run dev
# Cannot advance with empty required fields
```

**Step 5: Commit**
```bash
git add frontend/src/components/SupplierForm/
git commit -m "feat: add form validation"
```

---

## Verification Checklist

Before considering this workstream complete:

- [ ] Header shows "SENTINEL-ZERO" in cyan on dark background
- [ ] Header is exactly 40px tall
- [ ] Layer panel collapses/expands
- [ ] Layer panel has 4 checkboxes (nodes, arcs, heatmaps, tariffs)
- [ ] Detail panel appears on right side at 350px width
- [ ] Detail panel has Location, Type, Risk sections
- [ ] News ticker scrolls infinitely at bottom
- [ ] Node popup appears with name, type, and action buttons
- [ ] Supplier form has 3 steps with validation
- [ ] All components use dark tactical theme
- [ ] Build passes: `cd frontend && npm run build`

---

## Dependencies

This workstream can run in parallel with:
- Phase 1 Map Visualization
- Phase 1 API Endpoints
- Phase 1 External Data Integration
- Phase 1 Data Seeding

No cross-dependencies within Phase 1.
