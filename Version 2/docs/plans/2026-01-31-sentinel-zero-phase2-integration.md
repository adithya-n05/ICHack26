# Sentinel-Zero Phase 2: Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Connect all Phase 1 components together - frontend fetches from API, map displays real data, user interactions trigger panels, and forms save to database.

**Architecture:** React hooks fetch from Express API endpoints, deck.gl layers render Supabase data, click handlers coordinate between map and panels, WebSocket provides real-time updates.

**Tech Stack:** React 18, TypeScript, deck.gl, Express.js, Supabase, Socket.io

**Prerequisites:** ALL Phase 1 workstreams must be complete:
- Phase 1 Map (M1-M35) - Map component with deck.gl layers
- Phase 1 UI (U1-U40) - Header, panels, ticker, form components
- Phase 1 API (A1-A29) - All REST endpoints
- Phase 1 External (E1-E26) - External data services + WebSocket
- Phase 1 Data (D1-D30) - Seed data populated in database

**Total Tasks:** 14 TDD slices (I1-I14)

---

## Task I1: Map fetches companies from API

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Write failing test**
```bash
# Start frontend and backend, check network tab
# Map should request /api/companies
curl http://localhost:3001/api/companies
# Verify API returns data, but map shows hardcoded nodes
```

**Step 2: Run test - verify it fails**
```
Map renders hardcoded SAMPLE_NODES instead of fetching from API
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/Map/Map.tsx
import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ScatterplotLayer, ArcLayer, PolygonLayer } from '@deck.gl/layers';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface Company {
  id: string;
  name: string;
  type: string;
  location: { lat: number; lng: number };
  city: string;
  country: string;
}

interface MapProps {
  onNodeClick?: (node: Company) => void;
}

export function Map({ onNodeClick }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const deckOverlay = useRef<MapboxOverlay | null>(null);

  const [nodes, setNodes] = useState<Company[]>([]);
  const [hoveredNode, setHoveredNode] = useState<Company | null>(null);

  // Fetch companies from API
  useEffect(() => {
    fetch('http://localhost:3001/api/companies')
      .then(res => res.json())
      .then(data => {
        console.log('Loaded companies:', data.length);
        setNodes(data);
      })
      .catch(err => console.error('Failed to load companies:', err));
  }, []);

  // Initialize map
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
      map.current?.setFog({
        color: 'rgb(13, 13, 13)',
        'high-color': 'rgb(26, 26, 26)',
        'horizon-blend': 0.02,
        'space-color': 'rgb(13, 13, 13)',
        'star-intensity': 0.6,
      });

      deckOverlay.current = new MapboxOverlay({ layers: [] });
      map.current?.addControl(deckOverlay.current as any);
    });
  }, []);

  // Update deck.gl layers when data changes
  useEffect(() => {
    if (!deckOverlay.current) return;

    const layers = [
      new ScatterplotLayer({
        id: 'nodes',
        data: nodes,
        getPosition: (d: Company) => [d.location.lng, d.location.lat],
        getRadius: (d: Company) => hoveredNode?.id === d.id ? 80000 : 50000,
        getFillColor: [0, 255, 255, 200],
        pickable: true,
        onClick: (info: any) => {
          if (info.object && onNodeClick) {
            onNodeClick(info.object);
          }
        },
        onHover: (info: any) => setHoveredNode(info.object || null),
        updateTriggers: {
          getRadius: hoveredNode?.id,
        },
      }),
    ];

    deckOverlay.current.setProps({ layers });
  }, [nodes, hoveredNode, onNodeClick]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {hoveredNode && (
        <div className="absolute top-4 left-4 bg-bg-secondary px-3 py-2 rounded border border-border-color">
          <span className="text-accent-cyan font-mono text-sm">{hoveredNode.name}</span>
        </div>
      )}
    </div>
  );
}
```

**Step 4: Run test - verify it passes**
```bash
# Start both servers
cd backend && npm run dev &
cd frontend && npm run dev &
# Open browser, check Network tab shows /api/companies request
# Map should show nodes from database (TSMC, Samsung, Intel, etc.)
```

**Step 5: Commit**
```bash
git add frontend/src/components/Map/Map.tsx
git commit -m "feat: map loads companies from API"
```

---

## Task I2: Map fetches connections from API

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write failing test**
```bash
# Check network tab for /api/connections request
curl http://localhost:3001/api/connections
# Verify API returns connections, but map shows no arcs
```

**Step 2: Run test - verify it fails**
```
No arcs visible on map - connections not fetched
```

**Step 3: Minimal implementation**
```typescript
// Add to frontend/src/components/Map/Map.tsx

interface Connection {
  id: string;
  from_node_id: string;
  to_node_id: string;
  transport_mode: string;
  status: string;
  is_user_connection: boolean;
  materials?: string[];
}

// Inside Map component, add state:
const [connections, setConnections] = useState<Connection[]>([]);

// Add useEffect to fetch connections:
useEffect(() => {
  fetch('http://localhost:3001/api/connections')
    .then(res => res.json())
    .then(data => {
      console.log('Loaded connections:', data.length);
      setConnections(data);
    })
    .catch(err => console.error('Failed to load connections:', err));
}, []);

// Helper to get node position by ID
const getNodePosition = (nodeId: string): [number, number] | null => {
  const node = nodes.find(n => n.id === nodeId);
  return node ? [node.location.lng, node.location.lat] : null;
};

// In the layers array, add ArcLayer:
new ArcLayer({
  id: 'arcs',
  data: connections.filter(c => {
    const from = getNodePosition(c.from_node_id);
    const to = getNodePosition(c.to_node_id);
    return from && to;
  }),
  getSourcePosition: (d: Connection) => getNodePosition(d.from_node_id)!,
  getTargetPosition: (d: Connection) => getNodePosition(d.to_node_id)!,
  getSourceColor: [224, 224, 224, 200],
  getTargetColor: [224, 224, 224, 200],
  getWidth: 2,
  getHeight: 0.3,
}),
```

**Step 4: Run test - verify it passes**
```bash
# Refresh browser
# Arcs should connect nodes (TSMC to Nvidia, ASML to TSMC, etc.)
```

**Step 5: Commit**
```bash
git add frontend/src/components/Map/Map.tsx
git commit -m "feat: map loads connections from API"
```

---

## Task I3: Map fetches events from API

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write failing test**
```bash
# Check network tab for /api/events request
curl http://localhost:3001/api/events
# Verify API returns events (if any), but map shows no heatmap polygons
```

**Step 2: Run test - verify it fails**
```
No heatmap polygons visible - events not fetched or rendered
```

**Step 3: Minimal implementation**
```typescript
// Add to frontend/src/components/Map/Map.tsx

interface GeoEvent {
  id: string;
  type: string;
  title: string;
  location: { lat: number; lng: number };
  severity: number;
  polygon?: Array<{ lat: number; lng: number }>;
}

// Color mapping for event types
const EVENT_COLORS: Record<string, [number, number, number, number]> = {
  war: [255, 0, 0, 150],
  natural_disaster: [255, 102, 0, 150],
  weather: [0, 170, 255, 150],
  geopolitical: [153, 0, 255, 150],
  tariff: [255, 204, 0, 150],
  infrastructure: [204, 204, 204, 150],
};

// Helper to create a circle polygon around a point
function createCirclePolygon(
  center: { lat: number; lng: number },
  radiusKm: number,
  points: number = 32
): Array<[number, number]> {
  const coords: Array<[number, number]> = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = radiusKm * Math.cos(angle) / 111; // rough km to degrees
    const dy = radiusKm * Math.sin(angle) / 111;
    coords.push([center.lng + dx, center.lat + dy]);
  }
  return coords;
}

// Inside Map component, add state:
const [events, setEvents] = useState<GeoEvent[]>([]);

// Add useEffect to fetch events:
useEffect(() => {
  fetch('http://localhost:3001/api/events')
    .then(res => res.json())
    .then(data => {
      console.log('Loaded events:', data.length);
      setEvents(data);
    })
    .catch(err => console.error('Failed to load events:', err));
}, []);

// In the layers array, add PolygonLayer:
new PolygonLayer({
  id: 'heatmaps',
  data: events.map(e => ({
    ...e,
    contour: e.polygon
      ? e.polygon.map(p => [p.lng, p.lat])
      : createCirclePolygon(e.location, e.severity * 50),
  })),
  getPolygon: (d: any) => d.contour,
  getFillColor: (d: any) => EVENT_COLORS[d.type] || [128, 128, 128, 150],
  getLineColor: [255, 255, 255, 50],
  getLineWidth: 1,
  opacity: 0.6,
}),
```

**Step 4: Run test - verify it passes**
```bash
# Refresh browser
# If events exist in DB, colored polygons should appear
# Initially may be empty until external data services fetch real events
```

**Step 5: Commit**
```bash
git add frontend/src/components/Map/Map.tsx
git commit -m "feat: map loads events from API"
```

---

## Task I4: Click node opens detail panel

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Write failing test**
```
# Click on a node (dot) on the map
# Detail panel should appear on the right side
```

**Step 2: Run test - verify it fails**
```
Clicking node does nothing - no panel appears
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/App.tsx
import { useState } from 'react';
import { Header } from './components/Header';
import { Map } from './components/Map';
import { DetailPanel } from './components/DetailPanel';
import { LayerControlPanel } from './components/LayerControlPanel';
import { NewsTicker } from './components/NewsTicker';

interface Company {
  id: string;
  name: string;
  type: string;
  location: { lat: number; lng: number };
  city: string;
  country: string;
  description?: string;
  products?: string[];
}

function App() {
  const [selectedNode, setSelectedNode] = useState<Company | null>(null);
  const [layers, setLayers] = useState({
    nodes: true,
    arcs: true,
    heatmaps: true,
    tariffs: true,
  });

  const handleNodeClick = (node: Company) => {
    console.log('Node clicked:', node.name);
    setSelectedNode(node);
  };

  const handleLayerToggle = (layer: string) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer as keyof typeof prev] }));
  };

  return (
    <div className="h-screen w-screen bg-bg-primary flex flex-col">
      <Header />
      <div className="flex-1 relative">
        <Map onNodeClick={handleNodeClick} />
        <LayerControlPanel layers={layers} onToggle={handleLayerToggle} />
        <DetailPanel
          selectedNode={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      </div>
      <NewsTicker items={[]} />
    </div>
  );
}

export default App;
```

**Step 4: Run test - verify it passes**
```bash
# Refresh browser
# Click on TSMC node (Taiwan area)
# Detail panel should slide in from right showing "TSMC"
```

**Step 5: Commit**
```bash
git add frontend/src/App.tsx
git commit -m "feat: click node opens detail panel"
```

---

## Task I5: Detail panel shows node data

**Files:**
- Modify: `frontend/src/components/DetailPanel/DetailPanel.tsx`

**Step 1: Write failing test**
```
# Click on a node
# Panel should show: name, type, city, country, description, products
```

**Step 2: Run test - verify it fails**
```
Panel shows placeholder content, not actual node data
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/DetailPanel/DetailPanel.tsx
interface Company {
  id: string;
  name: string;
  type: string;
  location: { lat: number; lng: number };
  city: string;
  country: string;
  description?: string;
  products?: string[];
  annual_revenue_usd?: number;
  employees?: number;
}

interface DetailPanelProps {
  selectedNode: Company | null;
  onClose: () => void;
}

export function DetailPanel({ selectedNode, onClose }: DetailPanelProps) {
  if (!selectedNode) return null;

  const formatRevenue = (revenue?: number) => {
    if (!revenue) return 'N/A';
    if (revenue >= 1e9) return `$${(revenue / 1e9).toFixed(1)}B`;
    if (revenue >= 1e6) return `$${(revenue / 1e6).toFixed(1)}M`;
    return `$${revenue.toLocaleString()}`;
  };

  return (
    <aside
      data-testid="detail-panel"
      className="absolute right-0 top-0 w-[350px] h-full bg-bg-secondary border-l border-border-color p-4 overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-accent-cyan font-mono text-lg font-bold">
          {selectedNode.name}
        </h2>
        <button
          data-testid="detail-panel-close"
          onClick={onClose}
          className="text-text-secondary hover:text-text-primary text-xl"
        >
          &times;
        </button>
      </div>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Location
        </h3>
        <p className="text-text-primary text-sm">
          {selectedNode.city}, {selectedNode.country}
        </p>
        <p className="text-text-secondary text-xs mt-1">
          {selectedNode.location.lat.toFixed(4)}, {selectedNode.location.lng.toFixed(4)}
        </p>
      </section>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Type
        </h3>
        <span className="inline-block px-2 py-1 bg-bg-tertiary text-accent-cyan text-xs font-mono rounded">
          {selectedNode.type.toUpperCase()}
        </span>
      </section>

      {selectedNode.description && (
        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Description
          </h3>
          <p className="text-text-primary text-sm leading-relaxed">
            {selectedNode.description}
          </p>
        </section>
      )}

      {selectedNode.products && selectedNode.products.length > 0 && (
        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Products
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedNode.products.map((product, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-bg-tertiary text-text-primary text-xs rounded"
              >
                {product}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Financials
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-text-secondary text-xs">Annual Revenue</p>
            <p className="text-text-primary text-sm font-mono">
              {formatRevenue(selectedNode.annual_revenue_usd)}
            </p>
          </div>
          <div>
            <p className="text-text-secondary text-xs">Employees</p>
            <p className="text-text-primary text-sm font-mono">
              {selectedNode.employees?.toLocaleString() || 'N/A'}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Risk Status
        </h3>
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
# Click on TSMC node
# Panel should show:
# - "TSMC" as title
# - "Hsinchu, Taiwan" as location
# - "FOUNDRY" badge
# - Description about world's largest foundry
# - Products: Logic chips, SoCs, etc.
# - Revenue: $76B, Employees: 73,000
```

**Step 5: Commit**
```bash
git add frontend/src/components/DetailPanel/DetailPanel.tsx
git commit -m "feat: detail panel shows node info"
```

---

## Task I6: Click edge opens detail panel

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Write failing test**
```
# Click on an arc (connection line) on the map
# Detail panel should show connection info
```

**Step 2: Run test - verify it fails**
```
Clicking arc does nothing - arcs are not pickable
```

**Step 3: Minimal implementation**
```typescript
// In frontend/src/components/Map/Map.tsx

// Update Map props interface:
interface MapProps {
  onNodeClick?: (node: Company) => void;
  onConnectionClick?: (connection: Connection) => void;
}

// Update Map function signature:
export function Map({ onNodeClick, onConnectionClick }: MapProps) {

// In the ArcLayer, add pickable and onClick:
new ArcLayer({
  id: 'arcs',
  data: connections.filter(c => {
    const from = getNodePosition(c.from_node_id);
    const to = getNodePosition(c.to_node_id);
    return from && to;
  }),
  getSourcePosition: (d: Connection) => getNodePosition(d.from_node_id)!,
  getTargetPosition: (d: Connection) => getNodePosition(d.to_node_id)!,
  getSourceColor: [224, 224, 224, 200],
  getTargetColor: [224, 224, 224, 200],
  getWidth: 2,
  getHeight: 0.3,
  pickable: true,
  onClick: (info: any) => {
    if (info.object && onConnectionClick) {
      // Enrich connection with node names
      const fromNode = nodes.find(n => n.id === info.object.from_node_id);
      const toNode = nodes.find(n => n.id === info.object.to_node_id);
      onConnectionClick({
        ...info.object,
        fromNode,
        toNode,
      });
    }
  },
}),
```

```typescript
// In frontend/src/App.tsx, add:

interface Connection {
  id: string;
  from_node_id: string;
  to_node_id: string;
  transport_mode: string;
  status: string;
  is_user_connection: boolean;
  materials?: string[];
  fromNode?: Company;
  toNode?: Company;
}

// Add state:
const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);

const handleConnectionClick = (connection: Connection) => {
  console.log('Connection clicked:', connection.id);
  setSelectedNode(null); // Clear node selection
  setSelectedConnection(connection);
};

// Update Map component:
<Map
  onNodeClick={handleNodeClick}
  onConnectionClick={handleConnectionClick}
/>
```

**Step 4: Run test - verify it passes**
```bash
# Refresh browser
# Click on an arc between two nodes
# Console should log "Connection clicked: conn-xxx"
```

**Step 5: Commit**
```bash
git add frontend/src/components/Map/Map.tsx frontend/src/App.tsx
git commit -m "feat: click edge opens detail panel"
```

---

## Task I7: Detail panel shows edge data

**Files:**
- Modify: `frontend/src/components/DetailPanel/DetailPanel.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Write failing test**
```
# Click on an arc
# Panel should show: from/to nodes, transport mode, status, materials
```

**Step 2: Run test - verify it fails**
```
Panel doesn't render for connections - only handles nodes
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/DetailPanel/DetailPanel.tsx - update to handle both

interface Company {
  id: string;
  name: string;
  type: string;
  location: { lat: number; lng: number };
  city: string;
  country: string;
  description?: string;
  products?: string[];
  annual_revenue_usd?: number;
  employees?: number;
}

interface Connection {
  id: string;
  from_node_id: string;
  to_node_id: string;
  transport_mode: string;
  status: string;
  is_user_connection: boolean;
  materials?: string[];
  description?: string;
  lead_time_days?: number;
  fromNode?: Company;
  toNode?: Company;
}

interface DetailPanelProps {
  selectedNode: Company | null;
  selectedConnection: Connection | null;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  healthy: 'bg-accent-green',
  monitoring: 'bg-accent-amber',
  'at-risk': 'bg-accent-orange',
  critical: 'bg-accent-red',
  disrupted: 'bg-red-900',
};

const TRANSPORT_ICONS: Record<string, string> = {
  sea: '🚢',
  air: '✈️',
  land: '🚛',
};

export function DetailPanel({ selectedNode, selectedConnection, onClose }: DetailPanelProps) {
  // Show connection panel if connection selected
  if (selectedConnection) {
    return (
      <aside
        data-testid="detail-panel"
        className="absolute right-0 top-0 w-[350px] h-full bg-bg-secondary border-l border-border-color p-4 overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-accent-cyan font-mono text-lg font-bold">
            Supply Route
          </h2>
          <button
            data-testid="detail-panel-close"
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary text-xl"
          >
            &times;
          </button>
        </div>

        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Route
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-text-primary text-sm font-bold">
              {selectedConnection.fromNode?.name || selectedConnection.from_node_id}
            </span>
            <span className="text-text-secondary">→</span>
            <span className="text-text-primary text-sm font-bold">
              {selectedConnection.toNode?.name || selectedConnection.to_node_id}
            </span>
          </div>
        </section>

        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Transport Mode
          </h3>
          <span className="inline-flex items-center gap-2 px-2 py-1 bg-bg-tertiary text-text-primary text-sm rounded">
            <span>{TRANSPORT_ICONS[selectedConnection.transport_mode] || '📦'}</span>
            <span className="capitalize">{selectedConnection.transport_mode}</span>
          </span>
        </section>

        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Status
          </h3>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${STATUS_COLORS[selectedConnection.status] || 'bg-gray-500'}`}></span>
            <span className="text-text-primary text-sm capitalize">{selectedConnection.status}</span>
          </div>
        </section>

        {selectedConnection.materials && selectedConnection.materials.length > 0 && (
          <section className="mb-4">
            <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
              Materials
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedConnection.materials.map((material, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-bg-tertiary text-text-primary text-xs rounded"
                >
                  {material}
                </span>
              ))}
            </div>
          </section>
        )}

        {selectedConnection.description && (
          <section className="mb-4">
            <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
              Description
            </h3>
            <p className="text-text-primary text-sm leading-relaxed">
              {selectedConnection.description}
            </p>
          </section>
        )}

        {selectedConnection.lead_time_days && (
          <section className="mb-4">
            <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
              Lead Time
            </h3>
            <p className="text-text-primary text-sm font-mono">
              {selectedConnection.lead_time_days} days
            </p>
          </section>
        )}

        {selectedConnection.is_user_connection && (
          <div className="mt-4 px-3 py-2 bg-accent-cyan/20 border border-accent-cyan rounded">
            <span className="text-accent-cyan text-xs font-mono">YOUR SUPPLY CHAIN</span>
          </div>
        )}
      </aside>
    );
  }

  // Show node panel if node selected
  if (!selectedNode) return null;

  // ... (keep existing node panel code)
  const formatRevenue = (revenue?: number) => {
    if (!revenue) return 'N/A';
    if (revenue >= 1e9) return `$${(revenue / 1e9).toFixed(1)}B`;
    if (revenue >= 1e6) return `$${(revenue / 1e6).toFixed(1)}M`;
    return `$${revenue.toLocaleString()}`;
  };

  return (
    <aside
      data-testid="detail-panel"
      className="absolute right-0 top-0 w-[350px] h-full bg-bg-secondary border-l border-border-color p-4 overflow-y-auto"
    >
      {/* ... existing node panel JSX ... */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-accent-cyan font-mono text-lg font-bold">
          {selectedNode.name}
        </h2>
        <button
          data-testid="detail-panel-close"
          onClick={onClose}
          className="text-text-secondary hover:text-text-primary text-xl"
        >
          &times;
        </button>
      </div>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Location
        </h3>
        <p className="text-text-primary text-sm">
          {selectedNode.city}, {selectedNode.country}
        </p>
      </section>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Type
        </h3>
        <span className="inline-block px-2 py-1 bg-bg-tertiary text-accent-cyan text-xs font-mono rounded">
          {selectedNode.type.toUpperCase()}
        </span>
      </section>

      {selectedNode.description && (
        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Description
          </h3>
          <p className="text-text-primary text-sm leading-relaxed">
            {selectedNode.description}
          </p>
        </section>
      )}

      {selectedNode.products && selectedNode.products.length > 0 && (
        <section className="mb-4">
          <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
            Products
          </h3>
          <div className="flex flex-wrap gap-2">
            {selectedNode.products.map((product, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-bg-tertiary text-text-primary text-xs rounded"
              >
                {product}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase tracking-wider">
          Financials
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-text-secondary text-xs">Annual Revenue</p>
            <p className="text-text-primary text-sm font-mono">
              {formatRevenue(selectedNode.annual_revenue_usd)}
            </p>
          </div>
          <div>
            <p className="text-text-secondary text-xs">Employees</p>
            <p className="text-text-primary text-sm font-mono">
              {selectedNode.employees?.toLocaleString() || 'N/A'}
            </p>
          </div>
        </div>
      </section>
    </aside>
  );
}
```

```typescript
// Update frontend/src/App.tsx to pass selectedConnection:
<DetailPanel
  selectedNode={selectedNode}
  selectedConnection={selectedConnection}
  onClose={() => {
    setSelectedNode(null);
    setSelectedConnection(null);
  }}
/>
```

**Step 4: Run test - verify it passes**
```bash
# Click on ASML to TSMC arc
# Panel should show:
# - "Supply Route" title
# - "ASML → TSMC"
# - Transport: Air ✈️
# - Status: Healthy (green dot)
# - Materials: EUV lithography machines
```

**Step 5: Commit**
```bash
git add frontend/src/components/DetailPanel/DetailPanel.tsx frontend/src/App.tsx
git commit -m "feat: detail panel shows edge info"
```

---

## Task I8: News ticker receives real news

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/NewsTicker/NewsTicker.tsx`

**Step 1: Write failing test**
```bash
# Check network tab for /api/news request
curl http://localhost:3001/api/news
# Ticker should show real news, not empty or mock data
```

**Step 2: Run test - verify it fails**
```
Ticker shows empty or hardcoded news
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/App.tsx - add news fetching

import { useState, useEffect } from 'react';
import { socket } from './lib/socket';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: string;
}

// Inside App component:
const [news, setNews] = useState<NewsItem[]>([]);

// Fetch initial news
useEffect(() => {
  fetch('http://localhost:3001/api/news')
    .then(res => res.json())
    .then(data => {
      console.log('Loaded news:', data.length);
      setNews(data);
    })
    .catch(err => console.error('Failed to load news:', err));
}, []);

// Listen for real-time news updates
useEffect(() => {
  socket.on('new-news', (items: NewsItem[]) => {
    console.log('Received new news:', items.length);
    setNews(prev => [...items, ...prev].slice(0, 50)); // Keep last 50
  });

  return () => {
    socket.off('new-news');
  };
}, []);

// Update NewsTicker:
<NewsTicker items={news} />
```

```typescript
// frontend/src/components/NewsTicker/NewsTicker.tsx - ensure it handles items

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

  // Duplicate items for seamless loop
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
```

**Step 4: Run test - verify it passes**
```bash
# Refresh browser
# Ticker should show real news from API (or "Loading..." if API returns empty)
# When external data service fetches news, ticker updates automatically
```

**Step 5: Commit**
```bash
git add frontend/src/App.tsx frontend/src/components/NewsTicker/NewsTicker.tsx
git commit -m "feat: ticker shows real news"
```

---

## Task I9: Events render as heatmap

**Files:**
- Verify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write failing test**
```
# Events from API should render as colored polygons on map
# Each event type should have a different color
```

**Step 2: Run test - verify it fails**
```
Events may not have polygon data, or colors may be wrong
```

**Step 3: Minimal implementation**
```typescript
// This was partially implemented in I3. Ensure the PolygonLayer is in the layers array:

// In Map.tsx, verify the PolygonLayer is included and uses events state:
new PolygonLayer({
  id: 'heatmaps',
  data: events.map(e => ({
    ...e,
    contour: e.polygon
      ? e.polygon.map((p: any) => [p.lng, p.lat])
      : createCirclePolygon(e.location, Math.max(e.severity * 50, 100)), // Min 100km radius
  })),
  getPolygon: (d: any) => d.contour,
  getFillColor: (d: any) => EVENT_COLORS[d.type] || [128, 128, 128, 150],
  getLineColor: [255, 255, 255, 50],
  getLineWidth: 1,
  opacity: 0.6,
  pickable: true,
  onClick: (info: any) => {
    if (info.object) {
      console.log('Event clicked:', info.object.title);
    }
  },
}),

// Also update the useEffect dependencies to include events:
useEffect(() => {
  if (!deckOverlay.current) return;
  // ... layers definition
}, [nodes, connections, events, hoveredNode, onNodeClick, onConnectionClick]);
```

**Step 4: Run test - verify it passes**
```bash
# If events exist (from USGS earthquakes, GDELT news, etc.):
# - Red polygons for war events
# - Orange polygons for natural disasters
# - Blue polygons for weather
# - Purple polygons for geopolitical
```

**Step 5: Commit**
```bash
git add frontend/src/components/Map/Map.tsx
git commit -m "feat: events render as heatmap"
```

---

## Task I10: Connection color by status

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write failing test**
```
# Connections should be colored based on status:
# - healthy: white/gray
# - monitoring: amber
# - at-risk: orange
# - critical: red
# - disrupted: dark red
```

**Step 2: Run test - verify it fails**
```
All arcs are the same white color regardless of status
```

**Step 3: Minimal implementation**
```typescript
// In frontend/src/components/Map/Map.tsx

// Add status color mapping:
const CONNECTION_STATUS_COLORS: Record<string, [number, number, number, number]> = {
  healthy: [224, 224, 224, 200],    // Gray
  monitoring: [255, 204, 0, 200],   // Amber
  'at-risk': [255, 102, 0, 200],    // Orange
  critical: [255, 0, 0, 200],       // Red
  disrupted: [139, 0, 0, 200],      // Dark red
};

// Update ArcLayer to use dynamic colors:
new ArcLayer({
  id: 'arcs',
  data: connections.filter(c => {
    const from = getNodePosition(c.from_node_id);
    const to = getNodePosition(c.to_node_id);
    return from && to;
  }),
  getSourcePosition: (d: Connection) => getNodePosition(d.from_node_id)!,
  getTargetPosition: (d: Connection) => getNodePosition(d.to_node_id)!,
  getSourceColor: (d: Connection) => CONNECTION_STATUS_COLORS[d.status] || [224, 224, 224, 200],
  getTargetColor: (d: Connection) => CONNECTION_STATUS_COLORS[d.status] || [224, 224, 224, 200],
  getWidth: 2,
  getHeight: 0.3,
  pickable: true,
  onClick: (info: any) => {
    if (info.object && onConnectionClick) {
      const fromNode = nodes.find(n => n.id === info.object.from_node_id);
      const toNode = nodes.find(n => n.id === info.object.to_node_id);
      onConnectionClick({
        ...info.object,
        fromNode,
        toNode,
      });
    }
  },
}),
```

**Step 4: Run test - verify it passes**
```bash
# Update a connection status in database to "at-risk"
# Refresh browser - that arc should appear orange
# Healthy connections remain gray/white
```

**Step 5: Commit**
```bash
git add frontend/src/components/Map/Map.tsx
git commit -m "feat: color connections by status"
```

---

## Task I11: Heatmap color by event type

**Files:**
- Verify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write failing test**
```
# Event heatmaps should be colored by type:
# - war: red
# - natural_disaster: orange
# - weather: blue
# - geopolitical: purple
# - tariff: amber
```

**Step 2: Run test - verify it fails**
```
All heatmaps same color, or colors don't match expected scheme
```

**Step 3: Minimal implementation**
```typescript
// Verify EVENT_COLORS is defined correctly in Map.tsx:

const EVENT_COLORS: Record<string, [number, number, number, number]> = {
  war: [255, 0, 0, 150],            // Red
  natural_disaster: [255, 102, 0, 150], // Orange
  weather: [0, 170, 255, 150],      // Blue
  geopolitical: [153, 0, 255, 150], // Purple
  tariff: [255, 204, 0, 150],       // Amber
  infrastructure: [204, 204, 204, 150], // Gray
};

// Verify PolygonLayer uses this mapping:
getFillColor: (d: any) => EVENT_COLORS[d.type] || [128, 128, 128, 150],
```

**Step 4: Run test - verify it passes**
```bash
# Add test events with different types to database
# Each should appear with correct color:
# - Earthquake (natural_disaster) → Orange
# - Typhoon (weather) → Blue
# - Trade war (geopolitical) → Purple
```

**Step 5: Commit**
```bash
git add frontend/src/components/Map/Map.tsx
git commit -m "feat: color heatmap by event type"
```

---

## Task I12: User supply chain highlighted

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`

**Step 1: Write failing test**
```
# Connections with is_user_connection=true should:
# - Be cyan colored (not gray)
# - Be thicker than regular connections
# - Have a glow effect
```

**Step 2: Run test - verify it fails**
```
User's connections look the same as industry connections
```

**Step 3: Minimal implementation**
```typescript
// In frontend/src/components/Map/Map.tsx

// Update ArcLayer to highlight user connections:
new ArcLayer({
  id: 'arcs',
  data: connections.filter(c => {
    const from = getNodePosition(c.from_node_id);
    const to = getNodePosition(c.to_node_id);
    return from && to;
  }),
  getSourcePosition: (d: Connection) => getNodePosition(d.from_node_id)!,
  getTargetPosition: (d: Connection) => getNodePosition(d.to_node_id)!,
  getSourceColor: (d: Connection) => {
    if (d.is_user_connection) return [0, 255, 255, 255]; // Cyan for user
    return CONNECTION_STATUS_COLORS[d.status] || [224, 224, 224, 200];
  },
  getTargetColor: (d: Connection) => {
    if (d.is_user_connection) return [0, 255, 255, 255]; // Cyan for user
    return CONNECTION_STATUS_COLORS[d.status] || [224, 224, 224, 200];
  },
  getWidth: (d: Connection) => d.is_user_connection ? 4 : 2, // Thicker for user
  getHeight: 0.3,
  pickable: true,
  onClick: (info: any) => {
    if (info.object && onConnectionClick) {
      const fromNode = nodes.find(n => n.id === info.object.from_node_id);
      const toNode = nodes.find(n => n.id === info.object.to_node_id);
      onConnectionClick({
        ...info.object,
        fromNode,
        toNode,
      });
    }
  },
  updateTriggers: {
    getSourceColor: connections.map(c => c.is_user_connection),
    getTargetColor: connections.map(c => c.is_user_connection),
    getWidth: connections.map(c => c.is_user_connection),
  },
}),
```

**Step 4: Run test - verify it passes**
```bash
# Mark a connection as is_user_connection=true in database
# That arc should appear cyan and thicker than others
```

**Step 5: Commit**
```bash
git add frontend/src/components/Map/Map.tsx
git commit -m "feat: highlight user supply chain"
```

---

## Task I13: Form saves to database

**Files:**
- Modify: `frontend/src/components/SupplierForm/SupplierForm.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Write failing test**
```bash
# Fill out supplier form, click Submit
# POST to /api/user-supply-chain should be sent
curl -X POST http://localhost:3001/api/user-supply-chain \
  -H "Content-Type: application/json" \
  -d '{"company":{"name":"Test"}}'
```

**Step 2: Run test - verify it fails**
```
Form submit does nothing - no API call made
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/components/SupplierForm/SupplierForm.tsx
import { useState } from 'react';

interface SupplierFormProps {
  onSubmitSuccess?: () => void;
  onClose?: () => void;
}

interface FormData {
  companyName: string;
  companyCity: string;
  companyCountry: string;
  supplierName: string;
  supplierCity: string;
  supplierCountry: string;
  materials: string;
}

export function SupplierForm({ onSubmitSuccess, onClose }: SupplierFormProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    companyCity: '',
    companyCountry: '',
    supplierName: '',
    supplierCity: '',
    supplierCountry: '',
    materials: '',
  });

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:3001/api/user-supply-chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: {
            name: formData.companyName,
            city: formData.companyCity,
            country: formData.companyCountry,
          },
          suppliers: [{
            name: formData.supplierName,
            city: formData.supplierCity,
            country: formData.supplierCountry,
            materials: formData.materials.split(',').map(m => m.trim()),
          }],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save supply chain');
      }

      console.log('Supply chain saved successfully');
      onSubmitSuccess?.();
    } catch (error) {
      console.error('Error saving supply chain:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-bg-secondary p-6 rounded border border-border-color max-w-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-text-primary font-mono text-lg">Add Your Supply Chain</h2>
        {onClose && (
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            &times;
          </button>
        )}
      </div>

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

      {/* Step 1: Your Company */}
      {step === 1 && (
        <div>
          <h3 className="text-text-primary font-mono mb-4">Your Company</h3>
          <input
            type="text"
            placeholder="Company name"
            value={formData.companyName}
            onChange={(e) => updateField('companyName', e.target.value)}
            className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary mb-3"
          />
          <input
            type="text"
            placeholder="City"
            value={formData.companyCity}
            onChange={(e) => updateField('companyCity', e.target.value)}
            className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary mb-3"
          />
          <input
            type="text"
            placeholder="Country"
            value={formData.companyCountry}
            onChange={(e) => updateField('companyCountry', e.target.value)}
            className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary"
          />
        </div>
      )}

      {/* Step 2: Your Supplier */}
      {step === 2 && (
        <div>
          <h3 className="text-text-primary font-mono mb-4">Your Supplier</h3>
          <input
            type="text"
            placeholder="Supplier name"
            value={formData.supplierName}
            onChange={(e) => updateField('supplierName', e.target.value)}
            className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary mb-3"
          />
          <input
            type="text"
            placeholder="City"
            value={formData.supplierCity}
            onChange={(e) => updateField('supplierCity', e.target.value)}
            className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary mb-3"
          />
          <input
            type="text"
            placeholder="Country"
            value={formData.supplierCountry}
            onChange={(e) => updateField('supplierCountry', e.target.value)}
            className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary"
          />
        </div>
      )}

      {/* Step 3: Materials */}
      {step === 3 && (
        <div>
          <h3 className="text-text-primary font-mono mb-4">Materials</h3>
          <textarea
            placeholder="Enter materials (comma-separated)"
            value={formData.materials}
            onChange={(e) => updateField('materials', e.target.value)}
            className="w-full bg-bg-tertiary border border-border-color rounded p-2 text-text-primary h-32"
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
          className="px-4 py-2 text-text-secondary disabled:opacity-50"
        >
          Back
        </button>
        {step < 3 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            className="px-4 py-2 bg-accent-cyan text-bg-primary rounded font-mono"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-accent-cyan text-bg-primary rounded font-mono disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Submit'}
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 4: Run test - verify it passes**
```bash
# Open form, fill out all steps, click Submit
# Network tab should show POST to /api/user-supply-chain
# Response should be 200 OK with success message
```

**Step 5: Commit**
```bash
git add frontend/src/components/SupplierForm/SupplierForm.tsx
git commit -m "feat: save form to database"
```

---

## Task I14: Saved chain appears on map

**Files:**
- Modify: `frontend/src/components/Map/Map.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Write failing test**
```
# After saving supply chain, user's nodes and connections should appear on map
# User's connections should be cyan
```

**Step 2: Run test - verify it fails**
```
Saved data doesn't appear until page refresh
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/App.tsx - add refresh function

// Add state for showing form:
const [showSupplierForm, setShowSupplierForm] = useState(false);

// Add function to refresh data:
const refreshData = () => {
  // Trigger a re-fetch of companies and connections
  fetch('http://localhost:3001/api/companies')
    .then(res => res.json())
    .then(data => {
      // The Map component will need to expose a way to update its data
      // Or we lift state up to App
      console.log('Refreshed companies:', data.length);
    });

  fetch('http://localhost:3001/api/connections')
    .then(res => res.json())
    .then(data => {
      console.log('Refreshed connections:', data.length);
    });
};

// Handle form success:
const handleSupplierFormSuccess = () => {
  setShowSupplierForm(false);
  // Refresh map data
  refreshData();
  // Or trigger a full page re-render by updating a key
};

// Add button to open form in header or sidebar:
<button
  onClick={() => setShowSupplierForm(true)}
  className="px-3 py-1 bg-accent-cyan text-bg-primary rounded font-mono text-sm"
>
  + Add Supply Chain
</button>

// Render form modal:
{showSupplierForm && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <SupplierForm
      onSubmitSuccess={handleSupplierFormSuccess}
      onClose={() => setShowSupplierForm(false)}
    />
  </div>
)}
```

```typescript
// Better approach: Lift data state to App and pass down to Map

// frontend/src/App.tsx
const [companies, setCompanies] = useState<Company[]>([]);
const [connections, setConnections] = useState<Connection[]>([]);

useEffect(() => {
  fetch('http://localhost:3001/api/companies')
    .then(res => res.json())
    .then(setCompanies);

  fetch('http://localhost:3001/api/connections')
    .then(res => res.json())
    .then(setConnections);
}, []);

const refreshMapData = async () => {
  const [companiesRes, connectionsRes] = await Promise.all([
    fetch('http://localhost:3001/api/companies'),
    fetch('http://localhost:3001/api/connections'),
  ]);
  setCompanies(await companiesRes.json());
  setConnections(await connectionsRes.json());
};

// Pass to Map:
<Map
  companies={companies}
  connections={connections}
  onNodeClick={handleNodeClick}
  onConnectionClick={handleConnectionClick}
/>
```

**Step 4: Run test - verify it passes**
```bash
# Save a new supply chain via form
# Map should update to show new user nodes and cyan connections
# No page refresh needed
```

**Step 5: Commit**
```bash
git add frontend/src/App.tsx frontend/src/components/Map/Map.tsx
git commit -m "feat: display saved user chain on map"
```

---

## Verification Checklist

Before considering Phase 2 Integration complete, verify:

### Data Flow
- [ ] Map loads companies from `/api/companies`
- [ ] Map loads connections from `/api/connections`
- [ ] Map loads events from `/api/events`
- [ ] News ticker loads from `/api/news`

### Interactions
- [ ] Click node → Detail panel opens with node info
- [ ] Click connection → Detail panel opens with connection info
- [ ] Close button dismisses panel

### Visual Rendering
- [ ] Connections colored by status (gray/amber/orange/red)
- [ ] Events colored by type (red/orange/blue/purple)
- [ ] User supply chain is cyan and thicker

### Real-time Updates
- [ ] WebSocket connected (check console)
- [ ] New events appear automatically
- [ ] News ticker updates automatically

### User Supply Chain
- [ ] Form saves to database via POST
- [ ] Saved chain appears on map immediately
- [ ] User connections are highlighted

---

## Integration Points

| Frontend Component | API Endpoint | Purpose |
|-------------------|--------------|---------|
| Map (nodes) | GET /api/companies | Load node data |
| Map (arcs) | GET /api/connections | Load connection data |
| Map (polygons) | GET /api/events | Load event data |
| NewsTicker | GET /api/news | Load news items |
| DetailPanel | Node/Connection data | Display selected item |
| SupplierForm | POST /api/user-supply-chain | Save user data |
| WebSocket | Socket.io events | Real-time updates |
