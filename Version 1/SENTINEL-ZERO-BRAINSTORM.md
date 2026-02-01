# SENTINEL-ZERO: Complete Brainstorming Session

## Project Overview
**Name:** Sentinel-Zero
**Purpose:** Geopolitical supply chain intelligence platform with real-time risk visualization, disruption prediction, and AI-powered simulation.
**Timeline:** Hackathon pace (IC Hack 26) but with real data and full UX

---

## Target Users
1. **Supply Chain Managers** - monitoring their own supply chain
2. **Procurement/Sourcing Teams** - finding and evaluating alternative suppliers

## Industry Focus
- **Initial:** Manufacturing/Electronics (semiconductors, rare earth, etc.)
- **Architecture:** Industry-switchable - users can switch between different industries

---

## Core Features Defined

### 1. 3D Globe Visualization
- **Tech:** React + Mapbox GL JS (or MapLibre as fallback) + Deck.gl
- **Layout:** Full-screen immersive globe (80%+), slide-in panels
- **View:** Giant 3D globe at center with stars visible when zoomed out
- **Components:**
  - AI Simulation chat bar (top)
  - 3D globe (center)
  - Slide panels (right): News feed, Chat history, Node details
  - Timeline scrubber (bottom) for historical playback

### 2. Visualization Layers (Deck.gl)

| Layer | Component | Purpose |
|-------|-----------|---------|
| Risk Heatmaps | `HeatmapLayer` + 3D elevation | Color-coded by risk type |
| Supply Chain Arcs | `ArcLayer` | Pulsing connections, color = status |
| Infrastructure Nodes | `IconLayer` | Ports, warehouses, fabs |
| Alternative Suppliers | `ScatterplotLayer` | Green bubbles when disruption detected |
| Tariff Barriers | `PolygonLayer` + `ArcLayer` | Walls at borders + bilateral relationship arcs |
| Vessel Traffic | `TripsLayer` | Animated ship movements |

### 3. Heatmap Color Coding
- **War/Conflict:** `#DC2626` (Red)
- **Earthquake:** `#F97316` (Orange)
- **Hurricane/Storm:** `#06B6D4` (Cyan)
- **Political Instability:** `#9333EA` (Purple)
- **Tariff/Trade:** `#F59E0B` (Amber)

### 4. Arc States (Supply Chain Links)
- **Healthy:** Green, steady pulse
- **At Risk:** Amber, faster pulse, vibration
- **Disrupted:** Red, erratic animation
- **Simulated Reroute:** Faded green glow, dashed line

### 5. Node Interactions
- **Click existing node:** Slide panel shows details (company, products, risk score, connections, prices)
- **Add new node:** Click map to place → form popup captures data → node appears
- **Click edge/arc:** Panel shows route details, transport mode, lead time, cost

### 6. Tariff Visualization
- **Barrier Walls:** Translucent amber walls at destination borders where tariffs apply
- **Bilateral Arcs:** Connecting arc showing which two countries are in the tariff relationship
- **Cost Delta:** Display (+25%) on supply arcs crossing barriers

### 7. Right Panel Behavior
- **Default view:** News Feed + Chat content
- **On node/arc selection:** Switches to show node details + alternative suppliers
- **Alternative suppliers:** Appear ON THE MAP as green markers when arc/node selected

### 8. Alternative Supplier Flow
1. User clicks on a node or arc
2. System detects if disruption risk > 60%
3. Green glowing markers appear on map at alternative supplier locations
4. User clicks alternative marker → faded green pulsing arc shows rerouted path
5. Panel shows ranked alternatives with metrics (risk %, cost delta, lead time)
6. Click "Select & Simulate Route" → map animates the new supply chain path

---

## Data Sources (Researched via Web Search)

### Layer 1: Risk & Events
| Data Type | API | Notes |
|-----------|-----|-------|
| Earthquakes | [USGS Earthquake API](https://earthquake.usgs.gov/fdsnws/event/1/) | Free, real-time, GeoJSON |
| Storms | [Ambee Severe Storms API](https://www.getambee.com/api/severe-storms) | Commercial |
| Multi-hazard | [PredictHQ](https://www.predicthq.com/events/disasters) | Ranked severity |
| Humanitarian/Wars | [ReliefWeb API](https://reliefweb.int/help/api) | Free, conflicts |

### Layer 2: Geopolitical Sentiment
| Source | Notes |
|--------|-------|
| [GDELT Project](https://www.gdeltproject.org/) | 2,300+ emotions, 15-min updates, FREE via BigQuery |
| [GDELT Cloud](https://gdeltcloud.com/) | MCP integration, custom alerts |

GDELT Details:
- Updates every 15 minutes
- 100+ languages
- GCAM sentiment analysis (2,300+ emotions/themes)
- Available free via Google BigQuery

### Layer 3: Infrastructure (Ports, Hubs)
| Data Type | API |
|-----------|-----|
| Ports (8,000+ global) | [SeaRates World Sea Ports](https://www.searates.com/integrations/api-world-sea-ports) |
| Port congestion | [Sinay Ports Intelligence](https://sinay.ai/en/sinay-hub/ports-and-vessels-api/) |
| Vessels | [AISStream.io](https://aisstream.io/) (FREE WebSocket) |

AISStream.io Details:
- Free WebSocket API
- Connect to: `wss://stream.aisstream.io/v0/stream`
- Send subscription with API key and bounding boxes
- Message types: ShipStaticData, PositionReport
- Can filter by MMSI or message types

### Layer 4: Trade Policy & Tariffs
| Source | Coverage |
|--------|----------|
| [WTO Tariff & Trade Data](https://ttd.wto.org/en) | 170+ economies, API access |
| [USITC DataWeb](https://dataweb.usitc.gov/) | U.S. tariffs, HTS codes |

### Layer 5: News & Market Sentiment
| API | Best For |
|-----|----------|
| [Finnhub](https://finnhub.io/) | Free tier, sentiment scores |
| [Alpha Vantage](https://www.alphavantage.co/) | AI sentiment, economic indicators |
| [Stock News API](https://stocknewsapi.com/) | Multi-source aggregation |

### Layer 6: Supplier Data (Electronics)
| Source | Value |
|--------|-------|
| [Octopart](https://octopart.com/) | Component search, pricing, inventory |
| [SEMI World Fab Watch](https://www.semi.org/) | 1,400+ fab locations globally |
| [SIA Ecosystem Map](https://www.semiconductors.org/ecosystem/) | U.S. semiconductor mapping |

---

## Tech Stack

### Frontend
- React 18 + TypeScript
- Mapbox GL JS (or MapLibre GL JS as fallback for free tiles)
- Deck.gl (visualization layers)
- Zustand (state management)
- TailwindCSS (styling - dark, command-center aesthetic)

### Backend
- Node.js + Express (API server, WebSocket)
- Python (data ingestion, prediction engine, LangGraph agent)
- Redis (real-time cache, pub/sub)

### Database
- **Supabase** (PostgreSQL + PostGIS)
  - Geospatial queries
  - User auth
  - Realtime subscriptions
- PostGIS extension for geo queries

### AI/ML
- **Weighted scoring model** for disruption prediction (real-time)
- **LangGraph agent** for simulation queries ("what if" scenarios)
- **Anthropic Claude** for LLM reasoning

---

## Prediction System

### What We Predict

**1. Weighted Scoring Model predicts:**
- Disruption Probability (0-100%) for each route/supplier in real-time
- Example: "Taiwan Semiconductor Route: 78% disruption risk"
- Updates continuously as new data arrives

**2. LangGraph Agent predicts:**
- Scenario impact analysis ("What if 50% tariff on China?" → cost increase, affected routes)
- Alternative supplier recommendations (ranked by cost, capacity, risk exposure)
- Natural language explanations of risk factors

### Disruption Probability Formula
```
score = (
  0.25 × regional_sentiment +      # GDELT sentiment (-100 to 100)
  0.30 × active_disasters +        # Nearby disaster severity
  0.15 × vessel_anomalies +        # AIS behavior changes
  0.20 × tariff_exposure +         # Trade policy impact
  0.10 × historical_rate           # Past disruption frequency
)
```

Output: 0-100% disruption probability per route/supplier

### Alternative Supplier Ranking
When disruption > 60%:
1. Query suppliers for same product category
2. Score by: distance from risk zone, capacity, cost delta, lead time
3. Return top 5 ranked alternatives as green bubbles on map

---

## LangGraph Simulation Agent

### Architecture (from context7 research)
```python
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool

@tool
def get_affected_routes(tariff_region: str, product_type: str) -> list:
    """Find user's supply routes that pass through affected region"""
    pass

@tool
def calculate_disruption_score(route_id: str, scenario: dict) -> float:
    """Recalculate disruption score with simulated conditions"""
    pass

@tool
def find_alternative_suppliers(product: str, exclude_regions: list) -> list:
    """Find suppliers for product outside excluded regions"""
    pass

@tool
def update_map_visualization(changes: dict) -> str:
    """Send updates to frontend to modify map state"""
    pass

simulation_agent = create_react_agent(
    model="anthropic:claude-3-7-sonnet-latest",
    tools=[
        get_affected_routes,
        calculate_disruption_score,
        find_alternative_suppliers,
        update_map_visualization
    ],
    prompt="""You are a supply chain simulation assistant..."""
)
```

### User Flow for Simulation
1. User types: "What if 50% tariff on Taiwan semiconductors?"
2. Agent parses query → identifies affected routes
3. Agent recalculates disruption scores with simulated tariff
4. Agent finds alternative suppliers outside Taiwan
5. Agent updates map visualization in real-time
6. Agent returns natural language summary

---

## Additional Features

### Historical Playback
- Timeline scrubber at bottom
- Scrub back to see past events (COVID, Suez blockage, etc.)
- See how supply chains were affected historically

### Simulation Mode
- Chat interface at top of screen
- Type "what if" scenarios
- Map transforms in real-time to show impact
- "SIMULATION ACTIVE" badge appears
- Mode indicator changes to "Simulation"

### Export & Reporting
- **PDF Report:** Generate supply chain risk assessment
- **CSV Export:** Download supply chain data
- **Map Screenshot:** Export current globe view as high-res image
- **Simulation Report:** Export "what if" scenario analysis results

---

## UI Design Direction

### Aesthetic
- **Modern minimalist military** (NOT retro CRT)
- NASA mission control meets Bloomberg terminal
- Clean, sharp, professional with tactical precision
- Dark backgrounds with blue/cyan undertones

### Color Palette (CSS Variables)
```css
--bg-base: #030712;        /* Deep black */
--bg-surface: #0a0f1a;     /* Panel backgrounds */
--accent-primary: #3b82f6; /* Electric blue */
--accent-success: #10b981; /* Green for safe/alternatives */
--accent-warning: #f59e0b; /* Amber for at-risk */
--accent-danger: #ef4444;  /* Red for critical */
```

### Typography
- **Display:** Geist or Space Grotesk (clean, geometric)
- **UI:** Inter or Geist (modern sans-serif)
- **Data:** Geist Mono or IBM Plex Mono (monospace for numbers)

### Key UI Components
1. **Header:** Logo, status indicators, AI command input, industry selector
2. **Globe:** Full-screen 3D with stars, markers, arcs
3. **Right Panel:** Tabs (News/Chat/Details), contextual content
4. **Footer:** Timeline controls, date display, scrubber track, mode indicator

---

## Mapbox Token Info
- **Public token (use this):** `pk.eyJ1IjoiYWRpdGh5YW4wNSIsImEiOiJjbWwxZWFtNnowNjI3M2tzYTVmbG9keWN5In0.M686z8SrmhccrUVl343F1w`
- **Note:** Network was timing out to api.mapbox.com - may need VPN or use MapLibre with free tiles

### MapLibre Alternative (if Mapbox blocked)
- Use MapLibre GL JS (open-source fork)
- Free tile servers: OpenFreeMap, OpenStreetMap, MapLibre demo tiles
- Globe projection supported
- No API key needed for basic usage

---

## Project Structure

```
sentinel-zero/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── map/
│   │   │   │   ├── Globe.tsx
│   │   │   │   └── layers/
│   │   │   │       ├── SupplyChainArcs.tsx
│   │   │   │       ├── RiskHeatmap.tsx
│   │   │   │       ├── InfrastructureNodes.tsx
│   │   │   │       ├── TariffBarriers.tsx
│   │   │   │       └── AlternativeSuppliers.tsx
│   │   │   ├── panels/
│   │   │   │   ├── NewsPanel.tsx
│   │   │   │   ├── ChatPanel.tsx
│   │   │   │   ├── NodeDetailPanel.tsx
│   │   │   │   └── SupplierFormPanel.tsx
│   │   │   ├── chat/
│   │   │   │   └── SimulationChat.tsx
│   │   │   ├── export/
│   │   │   │   └── ExportMenu.tsx
│   │   │   └── timeline/
│   │   │       └── TimelineScrubber.tsx
│   │   ├── hooks/
│   │   ├── store/
│   │   └── types/
│   └── package.json
├── backend/
│   ├── node-api/
│   │   └── src/
│   │       ├── routes/
│   │       ├── websocket/
│   │       └── services/
│   └── python-services/
│       ├── data_ingestion/
│       │   ├── gdelt_client.py
│       │   ├── disaster_apis.py
│       │   └── ais_stream.py
│       ├── prediction/
│       │   ├── disruption_scorer.py
│       │   └── alternative_ranker.py
│       └── agent/
│           ├── simulation_agent.py
│           └── tools/
└── README.md
```

---

## Implementation Phases

### Phase 1: Foundation
1. Set up Vite + React + TypeScript project
2. Integrate Mapbox/MapLibre GL JS with 3D globe
3. Add Deck.gl layers (basic arcs, nodes)
4. Set up Supabase with PostGIS
5. Create basic data models

### Phase 2: Visualization
1. Implement all Deck.gl layers
2. Build risk heatmaps with color coding
3. Add supply chain arc animations
4. Implement tariff barrier visualization
5. Build node/edge click interactions

### Phase 3: Data Integration
1. Integrate GDELT for sentiment
2. Connect USGS earthquake API
3. Add disaster API
4. Integrate port data
5. Set up real-time data pipeline

### Phase 4: Prediction Engine
1. Implement weighted scoring model
2. Build alternative supplier ranker
3. Create disruption probability API
4. Connect to frontend for live scores

### Phase 5: AI Simulation
1. Set up LangGraph agent
2. Implement simulation tools
3. Build chat interface
4. Connect agent to map visualization

### Phase 6: User Features
1. Build supplier input form
2. Add node placement on map
3. Implement supply chain persistence
4. Build industry switcher
5. Add historical playback

### Phase 7: Export & Reporting
1. PDF report generator
2. CSV export
3. Map screenshot capture
4. Simulation report export

---

## UI Mockup Files Created
- `/Users/adithyanarayanan/.claude/plans/sentinel-zero-ui-v3.html` (latest version)
- `/Users/adithyanarayanan/.claude/plans/sentinel-zero-ui-v2.html`
- `/Users/adithyanarayanan/.claude/plans/sentinel-zero-ui-design.html` (original)

### To view mockups:
```bash
cd /Users/adithyanarayanan/.claude/plans && python3 -m http.server 8080
# Then open: http://localhost:8080/sentinel-zero-ui-v3.html
```

---

## Key Decisions Made
1. ✅ Primary users: Supply Chain Managers + Procurement Teams
2. ✅ Initial industry: Electronics/Semiconductors (switchable)
3. ✅ Data approach: API-gathered data + user input overlay
4. ✅ Predictions: Weighted scoring + LangGraph for simulations (no XGBoost)
5. ✅ Map interaction: Full-screen globe, visual node placement + forms
6. ✅ Tech stack: React + Mapbox/MapLibre + Deck.gl + Supabase + LangGraph
7. ✅ UI aesthetic: Modern minimalist military (not retro CRT)
8. ✅ Right panel: News/Chat default, Details on selection
9. ✅ Alternatives: Appear ON MAP as green markers when arc selected
10. ✅ Tariffs: Barrier walls + bilateral arcs showing relationship

---

## Open Items / Next Steps
1. Fix Mapbox network timeout (try MapLibre with free tiles)
2. Finalize UI design approval
3. Begin implementation following phases above
4. Set up Supabase project
5. Register for API keys (GDELT Cloud, AISStream, etc.)

---

## DETAILED DECISION RATIONALE

### Why Weighted Scoring + LangGraph (Not XGBoost)?
- **User requested:** Avoid XGBoost, combine weighted scoring with LLM reasoning
- **Weighted scoring:** Fast, deterministic, explainable for real-time risk display
- **LangGraph:** Handles "what if" simulation queries with natural language
- **Hybrid approach:** Scoring runs continuously, LLM runs on-demand for simulations

### Why Supabase (Not Raw PostgreSQL)?
- Faster setup for hackathon pace
- Built-in auth for multi-user support
- Realtime subscriptions for live updates
- PostGIS extension available for geospatial queries
- Still get full PostgreSQL + PostGIS power

### Why Node.js + Python (Not Single Language)?
- Node.js: Better for WebSocket real-time connections
- Python: Better for ML/data processing, LangGraph is Python-native
- Microservices approach: Each does what it's best at

### Why Deck.gl on Mapbox (Not Just Mapbox Layers)?
- Deck.gl provides advanced visualization: ArcLayer, HeatmapLayer, TripsLayer
- Better animation control for pulsing arcs, glowing alternatives
- GPU-accelerated for large datasets
- Easier to create custom visual effects

### Alternative Supplier Display - DETAILED FLOW
1. User clicks a node OR an arc on the map
2. System checks: Is this node/route at risk (>60% disruption)?
3. If yes: Query database for suppliers with same product category
4. Rank alternatives by: `score = 0.3*safety + 0.25*capacity + 0.25*cost + 0.2*leadtime`
5. Display TOP 5 as GREEN GLOWING MARKERS directly on the globe
6. Markers are LARGER than normal nodes (28px vs 18px) with pulsing animation
7. User clicks a green marker → Panel shows supplier details
8. User clicks "Simulate Reroute" → GREEN DASHED ARC draws from their destination to alternative
9. Original arc stays visible but faded, new arc is prominent
10. "SIMULATION ACTIVE" badge appears at top of map
11. Timeline mode indicator switches to "Simulation"

### Tariff Barrier Visualization - DETAILED
- **Problem:** Tariffs are bilateral (between 2 countries), not just at one location
- **Solution:** TWO visual elements:
  1. **Barrier Wall:** Translucent amber polygon at the DESTINATION country border
  2. **Bilateral Arc:** Separate amber arc layer showing the relationship (US ↔ China)
- When user's supply chain arc crosses a barrier wall, show cost delta on the arc (+25%)
- Click the barrier wall → Panel shows tariff details

### Right Panel Behavior - DETAILED
**Default State (nothing selected):**
- Tab 1 "News" (active): Live news feed from GDELT/Finnhub
- Tab 2 "Chat": AI conversation history
- Tab 3 "Details": Empty or prompt to select something

**When Node/Arc Selected:**
- Auto-switch to "Details" tab
- Show: Node name, location, type badge
- Show: Risk gauge (0-100% with color gradient)
- Show: Data grid (lead time, capacity, cost, products)
- Show: Alternatives section (if risk > 60%)

**Chat Tab:**
- Shows conversation with simulation agent
- User messages on right (blue bubble)
- AI responses on left (dark bubble with border)
- Timestamps below each message

### Map Interaction Specifics
**Click on empty space:** Deselect, return panel to News
**Click on node:** Select node, show details, show alternatives if at-risk
**Click on arc:** Select arc, show route details, show alternatives if at-risk
**Click on alternative marker:** Select that supplier, show its details, draw reroute arc
**Drag timeline:** Switch between Live/Historical mode, update all data on map
**Type in command bar + Run:** Activate simulation mode, process with LangGraph

### Timeline Scrubber - DETAILED
- **Left:** Playback controls (rewind, step back, play/pause, stop)
- **Center-left:** Current date display (31 JAN 2026, 14:32:07 UTC)
- **Center:** Track with fill showing position
- **On track:** Event markers (red=disaster, amber=policy change)
- **Right:** Mode indicator pill (LIVE=green, HISTORICAL=amber, SIMULATION=blue pulsing)

**Dragging behavior:**
- Drag handle left → Mode changes to "Historical"
- Drag to far right (>95%) → Mode changes back to "Live"
- During simulation → Mode stays "Simulation" until user exits

---

## API Integration Details

### GDELT Integration
```
Endpoint: BigQuery or GDELT DOC 2.0 API
Update frequency: Every 15 minutes
Key fields to extract:
- GoldsteinScale: Conflict/cooperation score (-10 to +10)
- AvgTone: Sentiment (-100 to +100)
- Actor1Geo_Lat/Long: Location coordinates
- EventCode: CAMEO event codes
- GCAM themes: 2,300+ emotion dimensions
```

### USGS Earthquake Integration
```
Endpoint: https://earthquake.usgs.gov/fdsnws/event/1/query
Format: GeoJSON
Parameters:
- format=geojson
- minmagnitude=4.0 (filter small quakes)
- orderby=time
Key fields:
- geometry.coordinates: [lng, lat, depth]
- properties.mag: Magnitude
- properties.place: Location description
- properties.time: Unix timestamp
```

### AISStream Integration
```
WebSocket: wss://stream.aisstream.io/v0/stream
Subscription message:
{
  "APIKey": "your-api-key",
  "BoundingBoxes": [[[-180,-90],[180,90]]], // World
  "FiltersShipMMSI": [], // Optional: specific vessels
  "FilterMessageTypes": ["PositionReport", "ShipStaticData"]
}
Message fields:
- MessageType: Type of AIS message
- MetaData.MMSI: Vessel identifier
- MetaData.latitude/longitude: Position
- Message.PositionReport.Sog: Speed over ground
- Message.PositionReport.Cog: Course over ground
```

---

## Mapbox/MapLibre Configuration

### Mapbox Setup (if network works)
```javascript
mapboxgl.accessToken = 'pk.eyJ1IjoiYWRpdGh5YW4wNSIsImEiOiJjbWwxZWFtNnowNjI3M2tzYTVmbG9keWN5In0.M686z8SrmhccrUVl343F1w';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/dark-v11',
  center: [105, 20],
  zoom: 2,
  projection: 'globe',
  antialias: true
});

// Add atmosphere and stars
map.on('style.load', () => {
  map.setFog({
    color: 'rgb(5, 5, 12)',
    'high-color': 'rgb(20, 20, 40)',
    'horizon-blend': 0.08,
    'space-color': 'rgb(3, 7, 18)',
    'star-intensity': 0.6
  });
});
```

### MapLibre Fallback (if Mapbox blocked)
```javascript
const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    projection: { type: 'globe' },
    sources: {
      satellite: {
        tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg'],
        type: 'raster'
      }
    },
    layers: [{ id: 'Satellite', type: 'raster', source: 'satellite' }],
    sky: {
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 7, 0]
    }
  }
});
```

---

## User Input Flow - Adding Suppliers

### Step 1: User clicks "Add Node" button (or clicks empty space on map)
### Step 2: Map enters "placement mode" - cursor changes
### Step 3: User clicks location on globe → marker appears
### Step 4: Slide panel opens with form:
- **Supplier Name** (text input)
- **Company** (text input with autocomplete from database)
- **Location** (auto-filled from click coordinates, editable)
- **Node Type** (dropdown: Supplier, Port, Warehouse, Factory)
- **Products** (multi-select dropdown + custom add)
- **Unit Cost** (number input with currency)
- **Lead Time** (number input in days)
- **Capacity** (percentage or units)
- **Notes** (textarea)
### Step 5: User clicks "Save" → Node persists to Supabase
### Step 6: Map updates with new node, arcs can now connect to it

---

## Current Issue: Mapbox Network Timeout
- Error: `net::ERR_TIMED_OUT` when loading from `api.mapbox.com`
- Affects: Both mapbox-gl.js CDN and map style/tiles
- Workaround tried: Switch to unpkg CDN (partial success)
- Solution needed: Use MapLibre with free tile servers OR fix network/VPN

**MapLibre free tile options:**
- OpenFreeMap: `https://tiles.openfreemap.org/styles/liberty`
- MapLibre demo: `https://demotiles.maplibre.org/style.json`
- OpenStreetMap: `https://a.tile.openstreetmap.org/{z}/{x}/{y}.png`
