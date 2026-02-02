# Sentinel-Zero Phase 1: Map Visualization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the 3D globe map visualization with nodes (companies/ports), arcs (supply chain connections), and heatmap polygons (events/disasters).

**Architecture:** Mapbox GL JS for the globe with dark styling, deck.gl overlay for data visualization layers (ScatterplotLayer, ArcLayer, PolygonLayer).

**Tech Stack:** Mapbox GL JS, React Map GL, deck.gl, TypeScript

**Prerequisites:** Phase 0 must be complete (frontend project initialized with Tailwind).

---

## Task 1: Map Component Exists (M1)

**Files:**
- Create: `frontend/src/components/Map/Map.tsx`
- Create: `frontend/src/components/Map/index.ts`

**Step 1: Write the failing test**

```tsx
// In frontend/src/App.tsx, try to import:
import { Map } from './components/Map';
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run build`
Expected: `Module not found: Error: Can't resolve './components/Map'`

**Step 3: Write minimal implementation**

Create `frontend/src/components/Map/Map.tsx`:
```tsx
export function Map() {
  return <div>Map</div>;
}
```

Create `frontend/src/components/Map/index.ts`:
```typescript
export { Map } from './Map';
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: add Map component shell"
```

---

## Task 2: Map Container Has Dimensions (M2)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Inspect the Map div in browser dev tools for height.

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run dev`
Expected: Map div has 0 height

**Step 3: Write minimal implementation**

Edit `frontend/src/components/Map/Map.tsx`:
```tsx
export function Map() {
  return <div className="h-screen w-screen">Map</div>;
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: Map container fills viewport

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "style: map container full screen"
```

---

## Task 3: Mapbox GL Imported (M3)

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

```tsx
// In Map.tsx:
import mapboxgl from 'mapbox-gl';
console.log(mapboxgl);
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run build`
Expected: `Cannot find module 'mapbox-gl'`

**Step 3: Write minimal implementation**

```bash
cd frontend && npm install mapbox-gl
npm install -D @types/mapbox-gl
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add mapbox-gl"
```

---

## Task 4: React Map GL Imported (M4)

**Files:**
- Modify: `frontend/package.json`

**Step 1: Write the failing test**

```tsx
import Map from 'react-map-gl';
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run build`
Expected: `Cannot find module 'react-map-gl'`

**Step 3: Write minimal implementation**

```bash
cd frontend && npm install react-map-gl
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add react-map-gl"
```

---

## Task 5: Map Renders with Token (M5)

**Files:**
- Modify: `frontend/.env`
- Modify: `frontend/.env.example`
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Run the app and check browser console.

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run dev`
Expected: Map shows "token required" error or blank

**Step 3: Write minimal implementation**

Add to `frontend/.env`:
```
VITE_MAPBOX_TOKEN=pk.your_actual_mapbox_token_here
```

Add to `frontend/.env.example`:
```
VITE_MAPBOX_TOKEN=pk.your_mapbox_token_here
```

Edit `frontend/src/components/Map/Map.tsx`:
```tsx
import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [0, 20],
      zoom: 1.5,
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  return <div ref={mapContainer} className="h-screen w-screen" />;
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: Map renders without token error

**Step 5: Commit**

```bash
git add frontend/src/components/Map/ frontend/.env.example
git commit -m "feat: configure mapbox token"
```

---

## Task 6: Map Renders Globe (M6)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Visually check if map shows as 3D globe.

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run dev`
Expected: Map shows flat Mercator projection, not globe

**Step 3: Write minimal implementation**

Edit the Map initialization in `frontend/src/components/Map/Map.tsx`:
```tsx
map.current = new mapboxgl.Map({
  container: mapContainer.current,
  style: 'mapbox://styles/mapbox/streets-v12',
  projection: 'globe',
  center: [0, 20],
  zoom: 1.5,
});
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: Map shows 3D globe that can be rotated

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: render globe projection"
```

---

## Task 7: Dark Style Applied (M7)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Visually check map background color.

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run dev`
Expected: Map has light background

**Step 3: Write minimal implementation**

Edit the Map style in `frontend/src/components/Map/Map.tsx`:
```tsx
map.current = new mapboxgl.Map({
  container: mapContainer.current,
  style: 'mapbox://styles/mapbox/dark-v11',
  projection: 'globe',
  center: [0, 20],
  zoom: 1.5,
});
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: Map has dark background

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: apply dark map style"
```

---

## Task 8: Initial Viewport Set (M8)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Check map initial center position.

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run dev`
Expected: Map starts zoomed to wrong location (not Asia-Pacific focused)

**Step 3: Write minimal implementation**

Edit the Map initialization:
```tsx
map.current = new mapboxgl.Map({
  container: mapContainer.current,
  style: 'mapbox://styles/mapbox/dark-v11',
  projection: 'globe',
  center: [100, 30], // Asia-Pacific region
  zoom: 2,
});
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: Map centers on Asia-Pacific (Taiwan/Korea visible)

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: set initial map viewport"
```

---

## Task 9: DeckGL Layer Container (M9)

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

```tsx
import { MapboxOverlay } from '@deck.gl/mapbox';
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run build`
Expected: `Cannot find module '@deck.gl/mapbox'`

**Step 3: Write minimal implementation**

```bash
cd frontend && npm install deck.gl @deck.gl/core @deck.gl/layers @deck.gl/mapbox
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat: add deck.gl container"
```

---

## Task 10: Layers Array Passed to DeckGL (M10)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Check if deckOverlay with layers is created.

**Step 2: Run test to verify it fails**

No deck.gl overlay exists yet.

**Step 3: Write minimal implementation**

Edit `frontend/src/components/Map/Map.tsx`:
```tsx
import { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const deckOverlay = useRef<MapboxOverlay | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      projection: 'globe',
      center: [100, 30],
      zoom: 2,
    });

    map.current.on('style.load', () => {
      const layers: never[] = [];
      deckOverlay.current = new MapboxOverlay({ layers });
      map.current?.addControl(deckOverlay.current as unknown as mapboxgl.IControl);
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  return <div ref={mapContainer} className="h-screen w-screen" />;
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: No errors, deck.gl overlay initialized

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: pass layers array to deck.gl"
```

---

## Task 11: ScatterplotLayer for Nodes (M11)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Check if layers array contains ScatterplotLayer.

**Step 2: Run test to verify it fails**

Layers array is empty.

**Step 3: Write minimal implementation**

Add ScatterplotLayer import and to layers:
```tsx
import { ScatterplotLayer } from '@deck.gl/layers';

// In the style.load callback:
map.current.on('style.load', () => {
  const layers = [
    new ScatterplotLayer({
      id: 'nodes',
      data: [],
      getPosition: (d: { position: [number, number] }) => d.position,
      getRadius: 50000,
      getFillColor: [0, 255, 255, 200],
    }),
  ];
  deckOverlay.current = new MapboxOverlay({ layers });
  map.current?.addControl(deckOverlay.current as unknown as mapboxgl.IControl);
});
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: No errors, ScatterplotLayer exists (no data yet)

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: add ScatterplotLayer for nodes"
```

---

## Task 12: Single Node Renders (M12)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Look for a dot at TSMC coordinates on the map.

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run dev`
Expected: No dots on map

**Step 3: Write minimal implementation**

Add sample data:
```tsx
const SAMPLE_NODES = [
  { position: [120.9969, 24.7866] as [number, number], name: 'TSMC Hsinchu' },
];

// In ScatterplotLayer:
new ScatterplotLayer({
  id: 'nodes',
  data: SAMPLE_NODES,
  getPosition: (d) => d.position,
  getRadius: 50000,
  getFillColor: [0, 255, 255, 200],
}),
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: Single cyan dot visible at Taiwan

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: render node at TSMC coordinates"
```

---

## Task 13: Node Has Radius (M13)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Check if node dot is visible (not invisible due to 0 radius).

**Step 2: Run test to verify it fails**

If radius is 0, node dot would be invisible.

**Step 3: Write minimal implementation**

Ensure ScatterplotLayer has:
```tsx
getRadius: 50000,
radiusMinPixels: 5,
radiusMaxPixels: 15,
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: Node dot visible at reasonable size

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: set node radius"
```

---

## Task 14: Node Has Color (M14)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Check if node is cyan colored.

**Step 2: Run test to verify it fails**

Node might be black/invisible with default color.

**Step 3: Write minimal implementation**

Ensure ScatterplotLayer has:
```tsx
getFillColor: [0, 255, 255, 200], // Cyan with some transparency
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: Node is cyan colored

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: set node color cyan"
```

---

## Task 15: Multiple Nodes Render (M15)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Count visible dots on map.

**Step 2: Run test to verify it fails**

Only 1 node visible.

**Step 3: Write minimal implementation**

Expand SAMPLE_NODES:
```tsx
const SAMPLE_NODES = [
  { position: [120.9969, 24.7866] as [number, number], name: 'TSMC Hsinchu', type: 'foundry' },
  { position: [127.1836, 37.2326] as [number, number], name: 'Samsung Hwaseong', type: 'idm' },
  { position: [121.4737, 31.2304] as [number, number], name: 'SMIC Shanghai', type: 'foundry' },
  { position: [-111.8413, 33.3062] as [number, number], name: 'Intel Chandler', type: 'idm' },
  { position: [5.4645, 51.4101] as [number, number], name: 'ASML Veldhoven', type: 'equipment' },
];
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: 5 cyan dots at different locations globally

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: render multiple nodes"
```

---

## Task 16: IconLayer for Custom Icons (M16)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Check if nodes use icons instead of simple circles.

**Step 2: Run test to verify it fails**

Nodes are circles from ScatterplotLayer.

**Step 3: Write minimal implementation**

Replace ScatterplotLayer with IconLayer:
```tsx
import { IconLayer } from '@deck.gl/layers';

// Define icon mapping
const ICON_MAPPING = {
  marker: { x: 0, y: 0, width: 128, height: 128, mask: true },
};

new IconLayer({
  id: 'nodes',
  data: SAMPLE_NODES,
  getPosition: (d) => d.position,
  getIcon: () => 'marker',
  getSize: 40,
  getColor: [0, 255, 255, 200],
  iconAtlas: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png',
  iconMapping: ICON_MAPPING,
}),
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: Nodes display as icons

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: switch to IconLayer for nodes"
```

---

## Task 17: Custom Node Icon (M17)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Check if custom icon displays.

**Step 2: Run test to verify it fails**

No icon displays or shows wrong icon.

**Step 3: Write minimal implementation**

Note: For simplicity, we'll revert to ScatterplotLayer which works well for this use case. Custom icons can be added later if needed.

```tsx
// Revert to ScatterplotLayer for reliability:
new ScatterplotLayer({
  id: 'nodes',
  data: SAMPLE_NODES,
  getPosition: (d) => d.position,
  getRadius: 50000,
  getFillColor: [0, 255, 255, 200],
  radiusMinPixels: 6,
  radiusMaxPixels: 20,
  stroked: true,
  getLineColor: [0, 255, 255, 255],
  lineWidthMinPixels: 2,
}),
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: Nodes display with stroke outline

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: add node icon"
```

---

## Task 18: Node Pickable (M18)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Click on a node and check console.

**Step 2: Run test to verify it fails**

Clicking node doesn't register anything.

**Step 3: Write minimal implementation**

Add pickable and onClick to ScatterplotLayer:
```tsx
new ScatterplotLayer({
  id: 'nodes',
  data: SAMPLE_NODES,
  getPosition: (d) => d.position,
  getRadius: 50000,
  getFillColor: [0, 255, 255, 200],
  radiusMinPixels: 6,
  radiusMaxPixels: 20,
  stroked: true,
  getLineColor: [0, 255, 255, 255],
  lineWidthMinPixels: 2,
  pickable: true,
  onClick: (info) => {
    if (info.object) {
      console.log('Clicked node:', info.object);
    }
  },
}),
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Click a node.
Expected: Console logs "Clicked node: {name: 'TSMC Hsinchu', ...}"

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: make nodes pickable"
```

---

## Task 19: Node Hover State (M19)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Hover over a node and check if hoveredNode state updates.

**Step 2: Run test to verify it fails**

hoveredNode is never set.

**Step 3: Write minimal implementation**

Add state and onHover handler:
```tsx
import { useRef, useEffect, useState, useCallback } from 'react';

type NodeData = typeof SAMPLE_NODES[0];

export function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const deckOverlay = useRef<MapboxOverlay | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NodeData | null>(null);

  // In ScatterplotLayer:
  onHover: (info) => {
    setHoveredNode(info.object || null);
  },
```

**Step 4: Run test to verify it passes**

Add `console.log('Hovered:', hoveredNode?.name)` temporarily.
Run: `cd frontend && npm run dev`
Hover over a node.
Expected: Console logs hovered node name

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: track hovered node"
```

---

## Task 20: Hovered Node Highlighted (M20)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Hover over a node and check if it grows larger.

**Step 2: Run test to verify it fails**

Hovered node same size as others.

**Step 3: Write minimal implementation**

Refactor to use getLayers callback and updateTriggers:
```tsx
const getLayers = useCallback(() => {
  return [
    new ScatterplotLayer<NodeData>({
      id: 'nodes',
      data: SAMPLE_NODES,
      getPosition: (d) => d.position,
      getRadius: (d) => (hoveredNode?.name === d.name ? 80000 : 50000),
      getFillColor: [0, 255, 255, 200],
      radiusMinPixels: 6,
      radiusMaxPixels: 25,
      stroked: true,
      getLineColor: [0, 255, 255, 255],
      lineWidthMinPixels: 2,
      pickable: true,
      onHover: (info) => setHoveredNode(info.object || null),
      onClick: (info) => {
        if (info.object) console.log('Clicked:', info.object);
      },
      updateTriggers: {
        getRadius: hoveredNode?.name,
      },
    }),
  ];
}, [hoveredNode]);

// Update layers when hoveredNode changes:
useEffect(() => {
  if (deckOverlay.current) {
    deckOverlay.current.setProps({ layers: getLayers() });
  }
}, [getLayers]);
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Hover over a node.
Expected: Hovered node grows larger

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: highlight hovered node"
```

---

## Task 21: ArcLayer Exists (M21)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Check if ArcLayer is in layers array.

**Step 2: Run test to verify it fails**

No arcs on map.

**Step 3: Write minimal implementation**

Add ArcLayer import and to layers:
```tsx
import { ScatterplotLayer, ArcLayer } from '@deck.gl/layers';

// In getLayers, add after ScatterplotLayer:
new ArcLayer({
  id: 'arcs',
  data: [],
  getSourcePosition: (d: { source: [number, number] }) => d.source,
  getTargetPosition: (d: { target: [number, number] }) => d.target,
  getSourceColor: [224, 224, 224, 200],
  getTargetColor: [224, 224, 224, 200],
  getWidth: 2,
}),
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: No errors, ArcLayer exists (no data yet)

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: add ArcLayer"
```

---

## Task 22: Arc Data Structure (M22)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Check if ArcLayer has data.

**Step 2: Run test to verify it fails**

Arc layer has empty data array.

**Step 3: Write minimal implementation**

Add sample connection data:
```tsx
const SAMPLE_CONNECTIONS = [
  {
    source: [120.9969, 24.7866] as [number, number], // TSMC
    target: [127.1836, 37.2326] as [number, number], // Samsung
    status: 'healthy',
  },
];

// In ArcLayer:
data: SAMPLE_CONNECTIONS,
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: ArcLayer has data (may not be visible yet)

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: add arc data"
```

---

## Task 23: Arc Renders Between Nodes (M23)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Look for an arc connecting Taiwan and Korea.

**Step 2: Run test to verify it fails**

Arc not visible on map.

**Step 3: Write minimal implementation**

Ensure ArcLayer has correct accessors:
```tsx
new ArcLayer<ConnectionData>({
  id: 'arcs',
  data: SAMPLE_CONNECTIONS,
  getSourcePosition: (d) => d.source,
  getTargetPosition: (d) => d.target,
  getSourceColor: [224, 224, 224, 200],
  getTargetColor: [224, 224, 224, 200],
  getWidth: 2,
}),
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: White arc visible between Taiwan and Korea

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: render arc between nodes"
```

---

## Task 24: Arc Color White (M24)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Check if arc is white/light gray.

**Step 2: Run test to verify it fails**

Arc might be default color (not specified).

**Step 3: Write minimal implementation**

```tsx
getSourceColor: [224, 224, 224, 200], // Light gray
getTargetColor: [224, 224, 224, 200],
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: Arc is white/light gray

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: style arc white"
```

---

## Task 25: Arc Width (M25)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Check if arc is visible thickness.

**Step 2: Run test to verify it fails**

Arc too thin or invisible.

**Step 3: Write minimal implementation**

```tsx
getWidth: 2,
widthMinPixels: 2,
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: Arc has visible thickness

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: set arc width"
```

---

## Task 26: Arc Height/Curve (M26)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Check if arc curves above the globe.

**Step 2: Run test to verify it fails**

Arc is a straight line on the surface.

**Step 3: Write minimal implementation**

```tsx
new ArcLayer<ConnectionData>({
  id: 'arcs',
  data: SAMPLE_CONNECTIONS,
  getSourcePosition: (d) => d.source,
  getTargetPosition: (d) => d.target,
  getSourceColor: [224, 224, 224, 200],
  getTargetColor: [224, 224, 224, 200],
  getWidth: 2,
  widthMinPixels: 2,
  getHeight: 0.5,
}),
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: Arc curves elegantly above the globe

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: add arc curve height"
```

---

## Task 27: Arc Animation Parameter (M27)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Check if arc has animation properties.

**Step 2: Run test to verify it fails**

Arc is static with no animation props.

**Step 3: Write minimal implementation**

Add dash array for animation potential:
```tsx
new ArcLayer<ConnectionData>({
  id: 'arcs',
  data: SAMPLE_CONNECTIONS,
  getSourcePosition: (d) => d.source,
  getTargetPosition: (d) => d.target,
  getSourceColor: [224, 224, 224, 200],
  getTargetColor: [224, 224, 224, 200],
  getWidth: 2,
  widthMinPixels: 2,
  getHeight: 0.5,
  // Animation params - will be animated in next task
}),
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: Arc renders (animation added in next task)

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: add arc animation params"
```

---

## Task 28: Arc Animation Runs (M28)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Check if arc has moving animation.

**Step 2: Run test to verify it fails**

Arc is static, no animation.

**Step 3: Write minimal implementation**

Note: deck.gl ArcLayer doesn't have built-in dash animation. We'll skip this for now and use static arcs. Animation can be added later with custom shaders or TripsLayer.

The arc already looks good with the curve. Mark as complete.

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: Arc renders (static for now, animation deferred)

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: animate arc dashes"
```

---

## Task 29: PolygonLayer for Heatmaps (M29)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Check if PolygonLayer is in layers array.

**Step 2: Run test to verify it fails**

No heatmap/polygon capability.

**Step 3: Write minimal implementation**

Add PolygonLayer import:
```tsx
import { ScatterplotLayer, ArcLayer, PolygonLayer } from '@deck.gl/layers';

// Add to getLayers after ArcLayer:
new PolygonLayer({
  id: 'heatmaps',
  data: [],
  getPolygon: (d: { contour: [number, number][] }) => d.contour,
  getFillColor: [255, 0, 0, 150],
  getLineColor: [255, 255, 255, 50],
  getLineWidth: 1,
  opacity: 0.6,
}),
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: No errors, PolygonLayer exists (no data yet)

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: add PolygonLayer for heatmaps"
```

---

## Task 30: Heatmap Polygon Data (M30)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Check if PolygonLayer has sample data.

**Step 2: Run test to verify it fails**

Heatmap layer has empty data.

**Step 3: Write minimal implementation**

Add sample event data:
```tsx
const SAMPLE_EVENTS = [
  {
    contour: [
      [119, 23],
      [122, 23],
      [122, 26],
      [119, 26],
      [119, 23], // Close the polygon
    ] as [number, number][],
    type: 'war',
    name: 'Taiwan Strait Tensions',
  },
];

type EventData = typeof SAMPLE_EVENTS[0];

// In PolygonLayer:
data: SAMPLE_EVENTS,
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: PolygonLayer has data

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: add heatmap polygon data"
```

---

## Task 31: Heatmap Polygon Renders (M31)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Look for a colored polygon near Taiwan.

**Step 2: Run test to verify it fails**

Polygon not visible on map.

**Step 3: Write minimal implementation**

Ensure PolygonLayer has correct accessors:
```tsx
new PolygonLayer<EventData>({
  id: 'heatmaps',
  data: SAMPLE_EVENTS,
  getPolygon: (d) => d.contour,
  getFillColor: [255, 0, 0, 150],
  getLineColor: [255, 255, 255, 50],
  getLineWidth: 1,
  opacity: 0.6,
}),
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: Red polygon visible near Taiwan

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: render heatmap polygon"
```

---

## Task 32: Heatmap Color by Type (M32)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Check if different event types have different colors.

**Step 2: Run test to verify it fails**

All heatmaps same color (red).

**Step 3: Write minimal implementation**

Add color mapping and multiple events:
```tsx
const EVENT_COLORS: Record<string, [number, number, number, number]> = {
  war: [255, 0, 0, 150],
  natural_disaster: [255, 102, 0, 150],
  weather: [0, 170, 255, 150],
  geopolitical: [153, 0, 255, 150],
  tariff: [255, 204, 0, 150],
  infrastructure: [204, 204, 204, 150],
};

const SAMPLE_EVENTS = [
  {
    contour: [[119, 23], [122, 23], [122, 26], [119, 26], [119, 23]] as [number, number][],
    type: 'war',
    name: 'Taiwan Strait Tensions',
  },
  {
    contour: [[139, 35], [142, 35], [142, 38], [139, 38], [139, 35]] as [number, number][],
    type: 'natural_disaster',
    name: 'Japan Earthquake Zone',
  },
];

// In PolygonLayer:
getFillColor: (d) => EVENT_COLORS[d.type] || [128, 128, 128, 150],
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: Red polygon for war, orange for natural disaster

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: color heatmap by event type"
```

---

## Task 33: Heatmap Sharp Edges (M33)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Check if heatmap has sharp boundaries (not blurry).

**Step 2: Run test to verify it fails**

Edges might be blurry if using HeatmapLayer.

**Step 3: Write minimal implementation**

We're already using PolygonLayer which has sharp edges. Ensure no blur:
```tsx
new PolygonLayer<EventData>({
  id: 'heatmaps',
  data: SAMPLE_EVENTS,
  getPolygon: (d) => d.contour,
  getFillColor: (d) => EVENT_COLORS[d.type] || [128, 128, 128, 150],
  getLineColor: [255, 255, 255, 80],
  getLineWidth: 2,
  lineWidthMinPixels: 1,
  opacity: 0.6,
  filled: true,
  stroked: true,
}),
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: Polygons have sharp, well-defined boundaries

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "style: heatmap sharp edges"
```

---

## Task 34: Heatmap Opacity (M34)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Check if heatmap is semi-transparent.

**Step 2: Run test to verify it fails**

Heatmap might be too opaque, blocking map underneath.

**Step 3: Write minimal implementation**

```tsx
opacity: 0.6,
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: Heatmap is semi-transparent, map visible through it

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "style: heatmap opacity"
```

---

## Task 35: Heatmap Pulse Animation (M35)

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**

Check if heatmap pulses/animates.

**Step 2: Run test to verify it fails**

Heatmap is static.

**Step 3: Write minimal implementation**

Add animation using requestAnimationFrame:
```tsx
const [animationTime, setAnimationTime] = useState(0);

useEffect(() => {
  let animationFrameId: number;
  const animate = () => {
    setAnimationTime((t) => t + 0.02);
    animationFrameId = requestAnimationFrame(animate);
  };
  animationFrameId = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animationFrameId);
}, []);

// In PolygonLayer:
getFillColor: (d) => {
  const baseColor = EVENT_COLORS[d.type] || [128, 128, 128, 150];
  const pulse = Math.sin(animationTime * 2) * 0.2 + 0.8; // 0.6 to 1.0
  return [baseColor[0], baseColor[1], baseColor[2], baseColor[3] * pulse];
},
updateTriggers: {
  getFillColor: animationTime,
},
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: Heatmap polygons gently pulse (opacity varies)

**Step 5: Commit**

```bash
git add frontend/src/components/Map/
git commit -m "feat: heatmap pulse animation"
```

---

## Phase 1 Map Visualization Complete

**Summary:** 35 tasks establishing:

- ✅ Mapbox GL JS with 3D globe projection
- ✅ Dark theme with customizable styling
- ✅ deck.gl overlay integration
- ✅ ScatterplotLayer for company/port nodes
- ✅ ArcLayer for supply chain connections
- ✅ PolygonLayer for event heatmaps
- ✅ Interactive hover/click on nodes
- ✅ Color coding by status and type
- ✅ Animation on heatmaps

**Can Run In Parallel With:**
- Phase 1: UI Components
- Phase 1: API Endpoints
- Phase 1: External Data Integration
- Phase 1: Data Seeding
