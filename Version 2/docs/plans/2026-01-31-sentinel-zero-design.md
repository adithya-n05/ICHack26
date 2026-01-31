# Sentinel-Zero: Geopolitical Trade Shock Predictor

## Design Document
**Created:** 2026-01-31
**Status:** Brainstorming

---

## 1. Vision Summary

An autonomous "War Room" interface that predicts systemic shocks to global trade by correlating geopolitical events, natural disasters, and policy changes with supply chain dependencies. Designed for individual users to monitor and manage their supply chain risks.

## 2. Core Features (User Requirements)

### 2.1 Map Visualization (Mapbox + Deck.gl)
- High-fidelity globe with detailed zoom levels
- Heatmaps for impact areas (natural disasters, conflicts, policy impacts)
- Distinct colors per impact type
- Supply chain nodes (docks, shipping hubs, warehouses)
- Connection lines showing supply chain links with state indicators

### 2.2 Supply Chain Management
- User can input their suppliers, prices, materials
- Display connections between supply chain nodes
- Show alternative suppliers when issues detected
- Visual rerouting suggestions (green glow for alternatives)

### 2.3 News & Intelligence Feed
- Live news feed relevant to selected industry
- Data affecting companies in the industry
- Tariff and policy information display

### 2.4 Predictions & Alerts
- Predict supply chain disruptions
- Alert when connections are at risk
- Show alternative routing options

---

## 3. Brainstorming Session Log

### Session 1: 2026-01-31

**Initial Requirements from User:**
- Heatmaps with distinct colors for: natural disasters, wars/conflicts, hurricanes, earthquakes, tornados, major global events
- Nodes for: docks, shipping hubs, warehouses, supply chain components
- Supplier information management
- Live news feed (suggested Perplexity Finance)
- Supply chain connections with visual state indicators
- Tariff/policy visualization
- Alternative supplier suggestions with visual rerouting
- User input interface for supply chain setup
- Edge/connection detail breakdown
- Prediction capabilities
- High-fidelity Mapbox implementation

---

## 4. Questions & Decisions

### Q1: Primary User Persona
**Decision:** Supply Chain Manager + Procurement Analyst
- Manages vendor relationships
- Monitors specific supply chain
- Reacts to disruptions by finding alternatives
- Needs procurement insights (pricing, alternative sources)

### Q2: Industry Scope
**Decision:** Multi-Industry with Selection
- Architecture designed for multiple industries
- Development starts with ONE industry first
- User selects industry on setup
- System shows relevant data/suppliers/news for that industry
- Expandable to more industries later

### Q3: Starting Industry
**Decision:** Electronics/Semiconductors
- High geopolitical relevance (Taiwan Strait, US-China tensions)
- Complex multi-tier supply chains with clear chokepoints
- Active tariff wars provide real test cases
- High news volume for intelligence feed
- Visually compelling routes (Asia → Global distribution)
- Key players: TSMC, Samsung, Intel, ASML, etc.
- Chokepoints: Taiwan, South Korea, Netherlands (ASML), rare earth minerals (China)

### Q4: MVP Data Sources
**Decision:** News + Disasters + User Supply Chain + Industry View

**Tier 1 - MVP:**
- **News/Events:** GDELT API (free, real-time global events & sentiment)
- **Natural Disasters:** USGS API (earthquakes), NOAA API (hurricanes/storms)
- **User Data:** User inputs their own supply chain (suppliers, materials, prices)
- **Industry View:** See other companies' supply chains in the industry (shared data model)

**Tier 2 - Later:**
- Shipping/AIS data (MarineTraffic)
- Tariff APIs (trade.gov, WTO)
- Commercial supplier databases (Panjiva, ImportGenius)

**Key Insight:** Users can see BOTH their own supply chain AND the broader industry landscape. This creates network effects - more users = richer industry data.

### Q5: Data Sharing Model
**Decision:** Single User + Pre-populated Industry Data

**Architecture:**
- **Single user system** - one user/company uses this tool
- **Pre-populated industry data** - system comes with semiconductor industry supply chain map (TSMC, Samsung, Intel, ASML, key ports, shipping routes, etc.)
- **User's supply chain overlay** - user inputs THEIR suppliers, which are highlighted/distinguished against the industry backdrop
- **Comparison view** - user sees where they stand relative to industry patterns

**Implications:**
- No multi-user auth complexity for MVP
- We seed the database with semiconductor supply chain data
- User's data is distinguished visually (different color, highlight)
- Simpler architecture, faster development

### Q6: Heatmap Categories & Visual Style
**Decision:** 6 Categories with Radar-Style Visualization

**Categories:**
1. **Natural Disasters** - Earthquakes, tsunamis, volcanic (USGS)
2. **Extreme Weather** - Hurricanes, typhoons, storms (NOAA)
3. **Wars/Armed Conflict** - Active combat zones, military operations (GDELT)
4. **Geopolitical Tensions** - Diplomatic incidents, sanctions (GDELT)
5. **Trade/Tariff Policies** - New tariffs, trade restrictions (News + manual)
6. **Infrastructure Disruption** - Port closures, factory shutdowns (News)

**Visual Style: Military Radar Aesthetic**
- Sharp, well-defined boundaries (NOT subtle gradient glows)
- High contrast colors against dark map
- Think: US NOAA radar, military command center displays
- Clear polygon/region boundaries
- Pulsing or scanning animation for active threats
- Color palette must be distinct and immediately readable:
  - Wars: Bright Red (#FF0000) with sharp edges
  - Natural Disasters: Deep Orange (#FF6600)
  - Extreme Weather: Electric Blue (#00AAFF)
  - Geopolitical: Purple (#9900FF)
  - Trade/Tariff: Amber/Yellow (#FFCC00)
  - Infrastructure: Gray/Silver (#CCCCCC)

**Implementation Notes:**
- Use deck.gl PolygonLayer or GeoJsonLayer for sharp boundaries
- Avoid HeatmapLayer's default gaussian blur
- Consider "pulse" animation for active/escalating threats
- Radar sweep effect possible for dramatic effect

### Q7: Supply Chain Nodes & Data Strategy
**Decision:** Comprehensive Pre-populated Industry Data

**Data Strategy:**
- ALL major semiconductor players pre-populated
- Use public supplier lists (annual reports, supplier responsibility reports)
- Map suppliers to known factory locations
- Infer shipping routes via nearest major ports/airports
- User can add their own suppliers on top

**Companies to Pre-populate (Semiconductor Ecosystem):**

*Chip Designers:*
- Apple, Qualcomm, Nvidia, AMD, Broadcom, MediaTek, Marvell

*Foundries (Manufacturing):*
- TSMC, Samsung Foundry, GlobalFoundries, SMIC, UMC

*IDMs (Integrated Device Manufacturers):*
- Intel, Samsung (memory), SK Hynix, Micron, Texas Instruments, NXP, Infineon

*Equipment Suppliers:*
- ASML, Applied Materials, Lam Research, Tokyo Electron, KLA

*EMS/Assembly:*
- Foxconn, Pegatron, Wistron, Quanta, Compal, ASE Technology

*Materials:*
- Shin-Etsu (silicon wafers), SUMCO, Air Liquide, Entegris, DuPont

**Node Types to Include:**
1. **Fabrication Plants (Fabs)** - Where chips are made
2. **Assembly & Test Facilities** - Packaging and testing
3. **Major Ports** - Kaohsiung, Busan, Long Beach, Rotterdam, etc.
4. **Air Cargo Hubs** - Incheon, Hong Kong, Memphis (FedEx), etc.
5. **Design Centers** - Silicon Valley, Austin, Tel Aviv, etc.
6. **Raw Material Sources** - Rare earth mines (China), silicon sources
7. **Distribution Hubs** - Regional logistics centers

**Data Sources for Seeding:**
- Apple Supplier List (public annually)
- Samsung Supplier List
- Intel Supplier List
- Company 10-K filings (SEC)
- Bloomberg Supply Chain data (if accessible)
- Wikipedia/public research for factory locations
- World Port Index for ports

### Q8: Connection Visualization System
**Decision:** 5-State Color System + Animations + User Highlight

**Connection States:**
| State | Color | Animation | Trigger |
|-------|-------|-----------|---------|
| **Healthy** | White/Light Blue (#E0E0E0) | Subtle particle flow | No issues |
| **Monitoring** | Yellow (#FFCC00) | Gentle pulse (1s cycle) | Minor news, weather approaching |
| **At Risk** | Orange (#FF6600) | Faster pulse (0.5s), line thickens | Significant event near route |
| **Critical** | Bright Red (#FF0000) | Vibrating/jittering, high glow | Direct impact confirmed |
| **Disrupted** | Dark Red, Dashed (#990000) | Broken line animation | Route blocked/closed |

**User's Supply Chain Distinction:**
- Color: Cyan/Teal (#00FFFF) base color
- Glow: Outer glow effect
- Thickness: 1.5x industry average
- State colors overlay on cyan base (cyan→yellow→orange→red)
- Always rendered on top of industry data

**Animation Types (using deck.gl):**
- **Particle Flow:** Dots moving along arc (deck.gl TripsLayer or custom shader)
- **Pulse:** Line opacity/thickness oscillation
- **Vibrate:** Small random positional offsets
- **Glow:** Outer blur effect (post-processing or thick semi-transparent outer line)
- **Dash Animation:** Moving dash pattern for disrupted state

### Q9: Alternative Supplier Feature
**Decision:** Material Match + Geographic Safety + AI Recommendation

**Alternative Supplier Logic:**
1. **Material Match (Filter):** Must provide same material/component category
2. **Geographic Safety (Rank):** Prioritize suppliers not in affected region
3. **AI Recommendation (Enhance):** AI analyzes and scores alternatives based on:
   - Capacity/reliability reputation
   - Cost implications (if known)
   - Lead time estimates
   - Risk diversification (don't concentrate in one region)
   - Historical performance data

**UX Flow:**
1. User clicks at-risk/critical connection (edge turns selected state)
2. Side panel slides in with:
   - Issue details (what's wrong: tariff, disaster, etc.)
   - Affected supplier info (company, location, products)
   - Impact assessment (severity, timeline)
3. Map updates to show:
   - Alternative suppliers as **green pulsing nodes**
   - Original route dims to 30% opacity
4. Hover on alternative supplier:
   - Shows tooltip with supplier info, AI recommendation score
   - Draws **faded green route** from that supplier to user's next node
5. Click alternative to "preview":
   - Full rerouted supply chain shown in green glow
   - Side panel shows: cost delta, lead time change, AI analysis
6. User can "Apply" to save new route or "Dismiss" to return

**AI Recommendation Output:**
- Recommendation score (1-100)
- Reasoning text (why this alternative)
- Risk factors for the alternative
- Estimated cost impact

### Q10: News Feed & Live Ticker
**Decision:** GDELT + NewsAPI Architecture

**Data Sources:**
1. **GDELT API** (Free, every 15 min)
   - Geopolitical events, conflicts, protests
   - Natural disasters
   - Structured data with locations, actors, sentiment
   - Powers: Heatmaps, alerts, geopolitical tension tracking

2. **NewsAPI** (Free tier: 100 req/day, polling every 30 min)
   - Keywords: "semiconductor", "chip", "supply chain", "TSMC", "tariff"
   - Industry-specific news
   - Powers: Scrolling news ticker

**Architecture:**
```
GDELT (15 min polling) ─┐
                        ├→ Backend Aggregator → WebSocket → Frontend Ticker
NewsAPI (30 min poll) ──┘
```

**UI Element: CNN-Style Scrolling Ticker**
- Position: Bottom of screen, full width
- Style: Dark background, white text, scrolling left-to-right
- Content: Breaking news headlines, source attribution
- Click: Opens detail panel with full article/event info
- Color coding: Red urgent, Yellow caution, White normal

**News Categories for Filtering:**
- Geopolitical (conflicts, tensions, sanctions)
- Natural Disasters (earthquakes, storms, floods)
- Trade & Policy (tariffs, regulations, trade deals)
- Industry News (deals, shortages, expansions)
- Infrastructure (port closures, strikes, accidents)

### Q11: Tariff & Policy Visualization
**Decision:** Country Overlays + Connection Badges

**Country-Level Visualization:**
- Countries with active tariffs/trade restrictions get amber/yellow tint overlay
- Different pattern types for:
  - Import tariffs (diagonal lines)
  - Export restrictions (dots)
  - Sanctions (solid overlay)
  - Trade agreements (green tint, positive)
- Click country: Side panel shows detailed tariff information

**Connection-Level Visualization:**
- Tariff badge/icon appears on supply chain connections crossing tariff boundaries
- Badge types:
  - 💰 Tariff (percentage shown)
  - 🚫 Restricted
  - ⚠️ Under review/threatened
  - ✓ Trade agreement benefit
- Hover badge: Tooltip with tariff rate, effective date, affected products
- Badge color matches severity (yellow = moderate, red = high)

**Data Source for Tariffs:**
- Manual curation for MVP (US-China tariffs, EU regulations well-documented)
- Structure: JSON/database with country pairs, product categories (HS codes), rates, effective dates
- Future: Integrate trade.gov API, WTO tariff database

**Example Tariff Data Structure:**
```json
{
  "id": "us-china-chips-2024",
  "from_country": "CN",
  "to_country": "US",
  "product_category": "semiconductors",
  "hs_codes": ["8541", "8542"],
  "tariff_rate": 25,
  "effective_date": "2024-01-01",
  "description": "Section 301 tariffs on Chinese semiconductors",
  "source_url": "https://ustr.gov/..."
}
```

### Q12: Prediction System
**Decision:** Disruption Probability Only (MVP)

**What We Predict:**
- **Disruption probability** for each supply chain route
- Output: Low / Medium / High / Critical risk level
- Time horizon: Next 7-30 days

**Input Signals for Prediction:**
1. **GDELT sentiment trends** - Rising negative sentiment in a region
2. **Weather forecasts** - NOAA hurricane/storm tracks approaching routes
3. **Historical patterns** - Typhoon season (June-Nov Asia), monsoons, etc.
4. **Proximity analysis** - How close is the event to supply chain nodes
5. **Event escalation** - Is the event getting worse over time

**Prediction Model (Simple for MVP):**
```
Risk Score = (Event_Severity × Proximity × Trend) + Historical_Risk_Baseline

Where:
- Event_Severity: 1-10 based on event type (war=10, minor protest=2)
- Proximity: 1.0 (direct) to 0.1 (far away), exponential decay
- Trend: Multiplier based on sentiment direction (improving=0.8, worsening=1.5)
- Historical_Risk_Baseline: Known risky regions/seasons
```

**Future Enhancement (Not MVP):**
- Price impact predictions
- Lead time delay estimates
- ML model trained on historical data

**Display:**
- Risk gauge/indicator per connection
- Color-coded route based on risk level
- Risk timeline graph (7/14/30 day outlook)

### Q13: User Supply Chain Input
**Decision:** Form Wizard (Step-by-Step)

**Wizard Flow:**
1. **Step 1: Your Company**
   - Company name
   - Headquarters location
   - Industry (pre-selected: Semiconductors)
   - Your role in supply chain (Designer, Manufacturer, Assembler, Distributor)

2. **Step 2: Add Suppliers**
   - Supplier company name
   - Location (address or map pin)
   - What they supply (material/component category)
   - Supplier tier (Tier 1 = direct, Tier 2 = supplier's supplier)

3. **Step 3: Add Materials/Components**
   - Material name (e.g., "Silicon Wafers", "DRAM Chips")
   - Category (dropdown: Wafers, Memory, Processors, Passive Components, etc.)
   - Which supplier provides it
   - Optional: Current price, lead time

4. **Step 4: Define Connections**
   - System auto-suggests connections based on supplier/material
   - User confirms or adjusts routing
   - Can add intermediate logistics nodes (ports, warehouses)

5. **Step 5: Review & Confirm**
   - Summary view of supply chain
   - Preview on map
   - Confirm and save

**Data Model:**
```typescript
interface UserSupplyChain {
  company: {
    name: string;
    location: GeoPoint;
    role: 'designer' | 'manufacturer' | 'assembler' | 'distributor';
  };
  suppliers: Supplier[];
  materials: Material[];
  connections: Connection[];
}

interface Supplier {
  id: string;
  name: string;
  location: GeoPoint;
  tier: 1 | 2 | 3;
  materials: string[]; // material IDs
}

interface Material {
  id: string;
  name: string;
  category: string;
  supplierId: string;
  price?: number;
  leadTimeDays?: number;
}

interface Connection {
  id: string;
  from: string; // node ID
  to: string; // node ID
  transportMode: 'sea' | 'air' | 'land';
}
```

### Q14: Edge/Connection Details Panel
**Decision:** Comprehensive Information Panel

**Panel Sections (when edge clicked):**

**Header:**
- Connection name: "TSMC Hsinchu → Port of Kaohsiung"
- Risk status badge (color-coded)
- Transport mode icon (ship/plane/truck)

**Section 1: Supplier Information**
- Company name
- Location (city, country)
- What they supply
- Tier level
- Contact info (if available)

**Section 2: Materials/Components**
- List of materials on this route
- Quantities (if known)
- Categories

**Section 3: Risk Assessment**
- Current risk level (gauge visualization)
- Risk factors (list of contributing events)
- Trend (improving/stable/worsening)
- Prediction: 7/14/30 day outlook

**Section 4: Tariffs & Policies**
- Applicable tariffs (rate, effective date)
- Trade restrictions
- Required documentation/compliance

**Section 5: Route Details**
- Distance
- Typical transit time
- Intermediate nodes (ports, hubs)
- Alternative routes available (count)

**Section 6: Nearby Events**
- Active events affecting this route
- Distance from route
- Event severity

**Section 7: Actions**
- [View Alternatives] - Shows alternative suppliers
- [View Route Options] - Shows alternative shipping paths
- [Add to Watchlist] - Monitor this connection
- [Export] - Download route data

**Panel Behavior:**
- Slides in from right side
- Can be pinned open
- Can expand to full screen for detailed analysis
- Responsive: collapses to bottom sheet on mobile

### Q15: Overall UI Layout
**Decision:** Full-Screen Map + Collapsible Panels + Node Popups

**Layout Architecture:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ [≡] SENTINEL-ZERO           [Industry: Semiconductors]    [⚙] [👤] │ ← Header (slim)
├────────┬────────────────────────────────────────────────────┬───────┤
│        │                                                    │       │
│ LAYER  │                                                    │ DETAIL│
│ CTRL   │                    3D GLOBE / MAP                  │ PANEL │
│        │                                                    │       │
│ [Heat] │            ┌────────────┐                          │ Supp- │
│ [Node] │            │ Node Popup │                          │ lier  │
│ [Conn] │            │ Quick Info │                          │ Info  │
│ [Tarif]│            └────────────┘                          │       │
│        │                                                    │ Risk  │
│ FILTER │                                                    │       │
│        │                                                    │ Events│
│ [War]  │                                                    │       │
│ [Dis]  │                                                    │ Action│
│ [Weath]│                                                    │       │
├────────┴────────────────────────────────────────────────────┴───────┤
│ ⚡ LIVE: Taiwan earthquake M4.2 │ TSMC reports... │ US-China talks... │ ← News Ticker
└─────────────────────────────────────────────────────────────────────┘
```

**Panel Specifications:**

**Header (40px):**
- Logo/name
- Industry selector dropdown
- Settings, user profile
- Minimal, dark background

**Left Panel - Layer Controls (collapsible, 200px):**
- Toggle layers: Heatmaps, Nodes, Connections, Tariffs
- Filter controls: Event types, severity thresholds
- Search: Find supplier/location
- Collapses to thin icon strip when hidden

**Right Panel - Detail Panel (collapsible, 350px):**
- Shows when node/edge selected
- Comprehensive info (from Q14)
- Tabs: Overview, Risk, Events, Alternatives
- Collapses to thin strip when hidden

**Bottom Panel - News Ticker (50px):**
- CNN-style scrolling ticker
- Color-coded by category
- Click to expand full article
- Always visible

**Node Popup (on click):**
- Small floating card near node
- Quick info: Name, type, risk status
- Buttons: "Details →" (opens right panel), "Alternatives"
- Auto-positions to not block view

**Map Interactions:**
- Click node: Popup + right panel update
- Click edge: Right panel shows edge details
- Hover: Tooltip with name/status
- Double-click: Zoom to node
- Right-click: Context menu (add to chain, view alternatives)

### Q16: Visual Design System
**Decision:** Dark Tactical + Charcoal Black

**Color Palette:**
```css
/* Base */
--bg-primary: #0D0D0D;     /* Near black */
--bg-secondary: #1A1A1A;   /* Charcoal panels */
--bg-tertiary: #262626;    /* Elevated surfaces */
--border: #333333;         /* Subtle borders */

/* Text */
--text-primary: #E0E0E0;   /* Main text */
--text-secondary: #808080; /* Muted text */
--text-accent: #00FFFF;    /* Cyan highlights */

/* Accent Colors */
--accent-cyan: #00FFFF;    /* Primary accent, user's chain */
--accent-orange: #FF6600;  /* Warning, at-risk */
--accent-red: #FF0000;     /* Critical, danger */
--accent-green: #00FF00;   /* Healthy, alternatives */
--accent-amber: #FFCC00;   /* Tariffs, caution */
--accent-purple: #9900FF;  /* Geopolitical */

/* Status Colors (from Q8) */
--status-healthy: #E0E0E0;
--status-monitoring: #FFCC00;
--status-at-risk: #FF6600;
--status-critical: #FF0000;
--status-disrupted: #990000;
```

**Typography:**
- Font: "JetBrains Mono" or "Fira Code" for data
- Headers: "Inter" or "Roboto" semi-bold
- Mono for numbers, coordinates, codes
- Sizes: 11px (small), 13px (body), 16px (headers), 24px (titles)

**UI Elements:**
- Panels: Charcoal (#1A1A1A) with 1px border (#333)
- Buttons: Outlined with accent color, solid on hover
- Cards: Subtle elevation (2px), no heavy shadows
- Inputs: Dark background (#262626), border on focus

**Map Style:**
- Mapbox Dark style base
- Reduced label density
- Muted country fills
- Emphasized water (darker)
- Subtle latitude/longitude grid overlay (optional toggle)

**Visual Effects:**
- Subtle glow on important elements (box-shadow with accent color)
- Grid pattern overlay (optional, very subtle)
- Scan line animation for active threats (subtle)
- No gradients - flat colors
- High contrast for accessibility

**Iconography:**
- Line icons, 1.5px stroke
- Consistent 20px size in UI
- Status icons filled, others outlined
- Military/tactical icon set if available

### Q17: Technology Stack
**Decision:** React + TypeScript Frontend, Node.js + Express Backend

**Frontend:**
- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (dark theme)
- **State Management:** Zustand (simple) or Redux Toolkit (if complex)
- **Map:** Mapbox GL JS + React Map GL
- **Visualization:** deck.gl for overlays (arcs, heatmaps, icons)
- **HTTP Client:** Axios or fetch
- **WebSocket Client:** Socket.io-client

**Backend:**
- **Runtime:** Node.js 20+
- **Framework:** Express.js with TypeScript
- **WebSocket:** Socket.io
- **Database:** PostgreSQL with PostGIS (geospatial queries)
- **ORM:** Prisma or TypeORM
- **Scheduling:** node-cron (for API polling)
- **Validation:** Zod

**External Services:**
- **Maps:** Mapbox GL JS + Mapbox APIs
- **News Data:** GDELT API, NewsAPI
- **Disaster Data:** USGS API, NOAA API
- **Hosting:** Vercel (frontend), Railway/Render (backend), Supabase/Neon (DB)

**Development Tools:**
- **Testing:** Vitest (frontend), Jest (backend)
- **Linting:** ESLint, Prettier
- **API Testing:** Playwright, Supertest

**Architecture:**
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React App     │────▶│   Node.js API   │────▶│   PostgreSQL    │
│   (Mapbox/DGL)  │◀────│   (Express)     │◀────│   (PostGIS)     │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌─────────┐  ┌─────────┐  ┌─────────┐
              │  GDELT  │  │ NewsAPI │  │USGS/NOAA│
              └─────────┘  └─────────┘  └─────────┘
```

### Q18: Database
**Decision:** Supabase (Hosted PostgreSQL)

**Why Supabase:**
- Hosted PostgreSQL with PostGIS support
- Built-in real-time subscriptions (can complement WebSockets)
- Auth ready if needed later
- CLI for database management
- Free tier generous for development

**Setup Requirements (for implementation phase):**
1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link to project: `supabase link --project-ref <project-ref>`
4. Enable PostGIS extension for geospatial queries
5. Create tables via migrations

**Environment Variables (to be stored in .env, NOT in code):**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Database Schema (high-level):**
```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Core tables
- companies (id, name, type, location, industry)
- suppliers (id, company_id, name, location, tier, materials)
- connections (id, from_node, to_node, transport_mode, status)
- materials (id, name, category, hs_code)
- events (id, type, location, severity, start_date, end_date, source)
- tariffs (id, from_country, to_country, product_category, rate, effective_date)
- user_supply_chain (user data overlay)
```

### Q19: Additional MVP Features
**Decision:** Export Reports (MVP), Simulation Analysis (Future)

**Export Reports (MVP):**
- Export supply chain map as PNG/SVG
- Export risk report as PDF
- Export supplier data as CSV
- Export current events affecting chain as CSV

**Future: Simulation/What-If Analysis**
- "What if Supplier X fails?" - show impact cascade
- "What if tariff increases to Y%?" - show cost impact
- "What if this region has a disaster?" - show affected routes
- Run multiple scenarios, compare outcomes
- Save/load scenarios

### Q20: TDD Implementation Slices
**Decision:** True TDD - One failing test per slice

**Slice Format:**
```
SLICE: [ID] - [Description]
RED:   [Failing test]
GREEN: [Minimal implementation]
COMMIT: "[type]: [message]"
```

---

## PHASE 0: FOUNDATION (Sequential - Must Complete First)

### Project Setup Slices

```
SLICE: F1 - React project initializes
RED:   npm run build exits with code 0 (currently no project)
GREEN: npm create vite@latest frontend -- --template react-ts
COMMIT: "chore: init react typescript project"

SLICE: F2 - TypeScript strict mode
RED:   TS compile error when using 'any' implicitly
GREEN: Set strict: true in tsconfig.json
COMMIT: "chore: enable typescript strict mode"

SLICE: F3 - Tailwind installed
RED:   className="bg-slate-900" has no effect
GREEN: npm install tailwindcss, configure postcss
COMMIT: "chore: add tailwind css"

SLICE: F4 - Dark theme base styles
RED:   Body background is white
GREEN: Add bg-[#0D0D0D] to body in index.css
COMMIT: "style: add dark theme base"

SLICE: F5 - ESLint configured
RED:   npm run lint fails (no script)
GREEN: npm install eslint, create config, add script
COMMIT: "chore: add eslint"

SLICE: F6 - Prettier configured
RED:   Code formatting inconsistent
GREEN: npm install prettier, create .prettierrc
COMMIT: "chore: add prettier"

SLICE: F7 - Backend project initializes
RED:   No backend directory exists
GREEN: mkdir backend && cd backend && npm init -y
COMMIT: "chore: init backend project"

SLICE: F8 - Express installed
RED:   require('express') fails
GREEN: npm install express
COMMIT: "chore: add express"

SLICE: F9 - Backend TypeScript
RED:   .ts files don't compile
GREEN: npm install typescript ts-node, create tsconfig
COMMIT: "chore: add typescript to backend"

SLICE: F10 - Server starts
RED:   Test: server.listen() resolves
GREEN: Create src/index.ts with app.listen(3001)
COMMIT: "feat: server starts on port 3001"

SLICE: F11 - Health endpoint
RED:   GET /health returns 404
GREEN: app.get('/health', (_, res) => res.json({ status: 'ok' }))
COMMIT: "feat: add health endpoint"

SLICE: F12 - CORS enabled
RED:   Frontend fetch blocked by CORS
GREEN: npm install cors, app.use(cors())
COMMIT: "feat: enable cors"

SLICE: F13 - Supabase client (backend)
RED:   import { supabase } throws
GREEN: npm install @supabase/supabase-js, create client
COMMIT: "feat: add supabase client"

SLICE: F14 - Supabase connection test
RED:   Health endpoint doesn't verify DB
GREEN: Query supabase in health, return DB status
COMMIT: "feat: verify supabase connection in health"

SLICE: F15 - Supabase client (frontend)
RED:   Frontend can't query supabase
GREEN: Install client in frontend, create hook
COMMIT: "feat: add supabase to frontend"
```

### Shared Types Slices

```
SLICE: T1 - Shared types package
RED:   Import from 'shared/types' fails
GREEN: Create shared/types/index.ts
COMMIT: "chore: create shared types package"

SLICE: T2 - GeoPoint type
RED:   GeoPoint type doesn't exist
GREEN: export interface GeoPoint { lat: number; lng: number }
COMMIT: "feat: add GeoPoint type"

SLICE: T3 - Company type
RED:   Company type doesn't exist
GREEN: export interface Company { id, name, location: GeoPoint, type, industry }
COMMIT: "feat: add Company type"

SLICE: T4 - Supplier type
RED:   Supplier type doesn't exist
GREEN: export interface Supplier { id, companyId, name, location, tier, materials }
COMMIT: "feat: add Supplier type"

SLICE: T5 - Material type
RED:   Material type doesn't exist
GREEN: export interface Material { id, name, category, hsCode? }
COMMIT: "feat: add Material type"

SLICE: T6 - Connection type
RED:   Connection type doesn't exist
GREEN: export interface Connection { id, fromNodeId, toNodeId, transportMode, status }
COMMIT: "feat: add Connection type"

SLICE: T7 - ConnectionStatus enum
RED:   ConnectionStatus doesn't exist
GREEN: export type ConnectionStatus = 'healthy' | 'monitoring' | 'at-risk' | 'critical' | 'disrupted'
COMMIT: "feat: add ConnectionStatus type"

SLICE: T8 - Event type
RED:   Event type doesn't exist
GREEN: export interface Event { id, type, location, severity, startDate, description, source }
COMMIT: "feat: add Event type"

SLICE: T9 - EventType enum
RED:   EventType doesn't exist
GREEN: export type EventType = 'natural_disaster' | 'weather' | 'war' | 'geopolitical' | 'tariff' | 'infrastructure'
COMMIT: "feat: add EventType enum"

SLICE: T10 - Tariff type
RED:   Tariff type doesn't exist
GREEN: export interface Tariff { id, fromCountry, toCountry, productCategory, rate, effectiveDate }
COMMIT: "feat: add Tariff type"

SLICE: T11 - NewsItem type
RED:   NewsItem type doesn't exist
GREEN: export interface NewsItem { id, title, source, url, publishedAt, category }
COMMIT: "feat: add NewsItem type"

SLICE: T12 - UserSupplyChain type
RED:   UserSupplyChain type doesn't exist
GREEN: export interface UserSupplyChain { company, suppliers, materials, connections }
COMMIT: "feat: add UserSupplyChain type"
```

---

## PHASE 1: PARALLEL WORKSTREAMS

### MAP VISUALIZATION (Workstream 1)

```
SLICE: M1 - Map component exists
RED:   <Map /> throws "not defined"
GREEN: export function Map() { return <div>Map</div> }
COMMIT: "feat: add Map component shell"

SLICE: M2 - Map container has dimensions
RED:   Map div has 0 height
GREEN: Add className="h-screen w-screen"
COMMIT: "style: map container full screen"

SLICE: M3 - Mapbox GL imported
RED:   mapboxgl is undefined
GREEN: npm install mapbox-gl, import mapboxgl
COMMIT: "chore: add mapbox-gl"

SLICE: M4 - React Map GL imported
RED:   <ReactMapGL> throws
GREEN: npm install react-map-gl
COMMIT: "chore: add react-map-gl"

SLICE: M5 - Map renders with token
RED:   Map shows "token required" error
GREEN: Add VITE_MAPBOX_TOKEN env, pass to Map
COMMIT: "feat: configure mapbox token"

SLICE: M6 - Map renders globe
RED:   Map doesn't show globe view
GREEN: Set projection="globe" on Map
COMMIT: "feat: render globe projection"

SLICE: M7 - Dark style applied
RED:   Map has light background
GREEN: mapStyle="mapbox://styles/mapbox/dark-v11"
COMMIT: "feat: apply dark map style"

SLICE: M8 - Initial viewport set
RED:   Map starts zoomed to wrong location
GREEN: initialViewState={{ longitude: 0, latitude: 20, zoom: 1.5 }}
COMMIT: "feat: set initial map viewport"

SLICE: M9 - DeckGL layer container
RED:   <DeckGL> throws "not defined"
GREEN: npm install deck.gl, wrap Map with DeckGL
COMMIT: "feat: add deck.gl container"

SLICE: M10 - Layers array passed to DeckGL
RED:   layers prop is undefined
GREEN: const layers = []; <DeckGL layers={layers}>
COMMIT: "feat: pass layers array to deck.gl"

SLICE: M11 - ScatterplotLayer for nodes
RED:   layers doesn't contain ScatterplotLayer
GREEN: import { ScatterplotLayer }, add to array
COMMIT: "feat: add ScatterplotLayer for nodes"

SLICE: M12 - Single node renders
RED:   No dots on map
GREEN: Add data: [{ position: [120.9969, 24.7866] }] to layer
COMMIT: "feat: render node at TSMC coordinates"

SLICE: M13 - Node has radius
RED:   Node dot invisible (0 radius)
GREEN: getRadius: 50000
COMMIT: "feat: set node radius"

SLICE: M14 - Node has color
RED:   Node is black/invisible
GREEN: getFillColor: [0, 255, 255] (cyan)
COMMIT: "feat: set node color cyan"

SLICE: M15 - Multiple nodes render
RED:   Only one node visible
GREEN: Add array of node data with multiple positions
COMMIT: "feat: render multiple nodes"

SLICE: M16 - IconLayer for custom icons
RED:   Nodes are circles, not icons
GREEN: Replace ScatterplotLayer with IconLayer
COMMIT: "feat: switch to IconLayer for nodes"

SLICE: M17 - Custom node icon
RED:   No icon displays
GREEN: Add getIcon function returning icon definition
COMMIT: "feat: add node icon"

SLICE: M18 - Node pickable
RED:   Clicking node doesn't register
GREEN: pickable: true on IconLayer
COMMIT: "feat: make nodes pickable"

SLICE: M19 - Node hover state
RED:   hoveredNode is never set
GREEN: onHover: setHoveredNode(info.object)
COMMIT: "feat: track hovered node"

SLICE: M20 - Hovered node highlighted
RED:   Hovered node same as others
GREEN: Conditional getSize based on hovered
COMMIT: "feat: highlight hovered node"

SLICE: M21 - ArcLayer exists
RED:   No arcs on map
GREEN: Add ArcLayer to layers array
COMMIT: "feat: add ArcLayer"

SLICE: M22 - Arc data structure
RED:   Arc layer has no data
GREEN: data: [{ source: [...], target: [...] }]
COMMIT: "feat: add arc data"

SLICE: M23 - Arc renders between nodes
RED:   Arc not visible
GREEN: getSourcePosition: d => d.source, getTargetPosition: d => d.target
COMMIT: "feat: render arc between nodes"

SLICE: M24 - Arc color white
RED:   Arc is default color
GREEN: getSourceColor: [224, 224, 224]
COMMIT: "feat: style arc white"

SLICE: M25 - Arc width
RED:   Arc too thin
GREEN: getWidth: 2
COMMIT: "feat: set arc width"

SLICE: M26 - Arc height (curve)
RED:   Arc is straight line
GREEN: getHeight: 0.5
COMMIT: "feat: add arc curve height"

SLICE: M27 - Arc animation parameter
RED:   Arc is static
GREEN: Add getDashArray, dashJustified props
COMMIT: "feat: add arc animation params"

SLICE: M28 - Arc animation runs
RED:   Dashes don't move
GREEN: Use useFrame or requestAnimationFrame to update time
COMMIT: "feat: animate arc dashes"

SLICE: M29 - PolygonLayer for heatmaps
RED:   No heatmap capability
GREEN: Add PolygonLayer to layers
COMMIT: "feat: add PolygonLayer for heatmaps"

SLICE: M30 - Heatmap polygon data
RED:   Heatmap layer has no data
GREEN: Add sample polygon coordinates (country outline)
COMMIT: "feat: add heatmap polygon data"

SLICE: M31 - Heatmap polygon renders
RED:   Polygon not visible
GREEN: getPolygon: d => d.contour, getFillColor: d => d.color
COMMIT: "feat: render heatmap polygon"

SLICE: M32 - Heatmap color by type
RED:   All heatmaps same color
GREEN: Color based on event type (red for war, etc)
COMMIT: "feat: color heatmap by event type"

SLICE: M33 - Heatmap sharp edges
RED:   Heatmap has blurry edges
GREEN: Use PolygonLayer instead of HeatmapLayer for sharp boundaries
COMMIT: "style: heatmap sharp edges"

SLICE: M34 - Heatmap opacity
RED:   Heatmap too opaque
GREEN: opacity: 0.6
COMMIT: "style: heatmap opacity"

SLICE: M35 - Heatmap pulse animation
RED:   Heatmap is static
GREEN: Animate fill color alpha over time
COMMIT: "feat: heatmap pulse animation"
```

### UI COMPONENTS (Workstream 2)

```
SLICE: U1 - Header component exists
RED:   <Header /> throws
GREEN: export function Header() { return <header>Header</header> }
COMMIT: "feat: add Header component"

SLICE: U2 - Header has logo
RED:   Header doesn't show "SENTINEL-ZERO"
GREEN: Add h1 with app name
COMMIT: "feat: add app name to header"

SLICE: U3 - Header styled dark
RED:   Header has light background
GREEN: Add bg-[#1A1A1A] border-b border-[#333]
COMMIT: "style: header dark theme"

SLICE: U4 - Header height correct
RED:   Header not 40px
GREEN: h-10 (Tailwind for 40px)
COMMIT: "style: header height"

SLICE: U5 - Layer control panel exists
RED:   <LayerControlPanel /> throws
GREEN: export function LayerControlPanel() { return <div /> }
COMMIT: "feat: add LayerControlPanel component"

SLICE: U6 - Layer panel positioned left
RED:   Panel not on left side
GREEN: className="absolute left-0 top-10"
COMMIT: "style: position layer panel left"

SLICE: U7 - Layer panel collapsible state
RED:   isCollapsed state doesn't exist
GREEN: const [isCollapsed, setIsCollapsed] = useState(false)
COMMIT: "feat: add panel collapse state"

SLICE: U8 - Layer panel collapse toggle
RED:   No way to collapse panel
GREEN: Add button that toggles isCollapsed
COMMIT: "feat: add collapse toggle"

SLICE: U9 - Layer panel hides when collapsed
RED:   Panel visible when collapsed
GREEN: Conditional width: isCollapsed ? 'w-12' : 'w-48'
COMMIT: "feat: hide panel content when collapsed"

SLICE: U10 - Layer toggle checkbox exists
RED:   No checkbox for node layer
GREEN: <input type="checkbox" id="nodes" />
COMMIT: "feat: add node layer checkbox"

SLICE: U11 - Layer toggle state
RED:   Checkbox state not tracked
GREEN: const [showNodes, setShowNodes] = useState(true)
COMMIT: "feat: track layer visibility state"

SLICE: U12 - Layer toggle wired
RED:   Checkbox doesn't control layer
GREEN: Pass showNodes to Map via context/props
COMMIT: "feat: wire layer toggle to map"

SLICE: U13 - Multiple layer toggles
RED:   Only one toggle exists
GREEN: Add toggles for: nodes, arcs, heatmaps, tariffs
COMMIT: "feat: add all layer toggles"

SLICE: U14 - Detail panel exists
RED:   <DetailPanel /> throws
GREEN: export function DetailPanel() { return <aside /> }
COMMIT: "feat: add DetailPanel component"

SLICE: U15 - Detail panel positioned right
RED:   Panel not on right side
GREEN: className="absolute right-0 top-10"
COMMIT: "style: position detail panel right"

SLICE: U16 - Detail panel width
RED:   Panel wrong width
GREEN: w-[350px]
COMMIT: "style: detail panel width"

SLICE: U17 - Detail panel styled dark
RED:   Panel has light background
GREEN: bg-[#1A1A1A] border-l border-[#333]
COMMIT: "style: detail panel dark theme"

SLICE: U18 - Detail panel receives node data
RED:   Panel doesn't show selected node
GREEN: Add selectedNode prop, display name
COMMIT: "feat: pass selected node to detail panel"

SLICE: U19 - Detail panel sections
RED:   Panel is flat text
GREEN: Add section headers: "Supplier Info", "Risk", etc
COMMIT: "feat: add detail panel sections"

SLICE: U20 - Detail panel close button
RED:   No way to close panel
GREEN: Add X button, call onClose prop
COMMIT: "feat: add detail panel close"

SLICE: U21 - News ticker exists
RED:   <NewsTicker /> throws
GREEN: export function NewsTicker() { return <div /> }
COMMIT: "feat: add NewsTicker component"

SLICE: U22 - News ticker positioned bottom
RED:   Ticker not at bottom
GREEN: className="fixed bottom-0 left-0 right-0"
COMMIT: "style: position ticker bottom"

SLICE: U23 - News ticker height
RED:   Ticker wrong height
GREEN: h-12 (48px)
COMMIT: "style: ticker height"

SLICE: U24 - News ticker styled dark
RED:   Ticker light background
GREEN: bg-[#1A1A1A] border-t border-[#333]
COMMIT: "style: ticker dark theme"

SLICE: U25 - News ticker content scrolls
RED:   Text is static
GREEN: Add CSS animation: translate-x from 100% to -100%
COMMIT: "feat: ticker scroll animation"

SLICE: U26 - News ticker receives items
RED:   Ticker shows no news
GREEN: Add items prop, map to spans
COMMIT: "feat: pass news items to ticker"

SLICE: U27 - News ticker infinite scroll
RED:   Animation stops after one cycle
GREEN: animation: scroll 30s linear infinite
COMMIT: "feat: infinite ticker scroll"

SLICE: U28 - Node popup exists
RED:   <NodePopup /> throws
GREEN: export function NodePopup() { return <div /> }
COMMIT: "feat: add NodePopup component"

SLICE: U29 - Node popup receives node
RED:   Popup doesn't show node name
GREEN: Add node prop, display name
COMMIT: "feat: pass node to popup"

SLICE: U30 - Node popup positioned
RED:   Popup not near node
GREEN: Add x, y props, set style.transform
COMMIT: "feat: position popup near node"

SLICE: U31 - Node popup styled
RED:   Popup doesn't match theme
GREEN: bg-[#262626] rounded border border-[#333]
COMMIT: "style: popup dark theme"

SLICE: U32 - Node popup action buttons
RED:   No actions in popup
GREEN: Add "Details" and "View Alternatives" buttons
COMMIT: "feat: add popup action buttons"

SLICE: U33 - Supplier form component exists
RED:   <SupplierForm /> throws
GREEN: export function SupplierForm() { return <form /> }
COMMIT: "feat: add SupplierForm component"

SLICE: U34 - Supplier form step 1 - company
RED:   No company input
GREEN: Add input for company name
COMMIT: "feat: add company name input"

SLICE: U35 - Supplier form step 1 - location
RED:   No location input
GREEN: Add input for location (or map picker)
COMMIT: "feat: add company location input"

SLICE: U36 - Supplier form step 2 - supplier name
RED:   No supplier name input
GREEN: Add input for supplier name
COMMIT: "feat: add supplier name input"

SLICE: U37 - Supplier form step 2 - supplier location
RED:   No supplier location input
GREEN: Add input for supplier location
COMMIT: "feat: add supplier location input"

SLICE: U38 - Supplier form step 2 - materials
RED:   No material selection
GREEN: Add multi-select for materials
COMMIT: "feat: add material selection"

SLICE: U39 - Supplier form wizard steps
RED:   Can't navigate between steps
GREEN: Add step state, next/back buttons
COMMIT: "feat: add form wizard navigation"

SLICE: U40 - Supplier form validation
RED:   Invalid data submits
GREEN: Add validation before step advance
COMMIT: "feat: add form validation"
```

### API ENDPOINTS (Workstream 3)

```
SLICE: A1 - Companies route file
RED:   /api/companies 404
GREEN: Create routes/companies.ts, register in app
COMMIT: "feat: add companies router"

SLICE: A2 - GET /api/companies returns array
RED:   Response not array
GREEN: res.json([])
COMMIT: "feat: companies returns array"

SLICE: A3 - Company Prisma model
RED:   prisma.company undefined
GREEN: Add Company model to schema.prisma
COMMIT: "feat: add Company prisma model"

SLICE: A4 - Company migration
RED:   Company table doesn't exist
GREEN: npx prisma migrate dev
COMMIT: "feat: migrate Company table"

SLICE: A5 - Companies from database
RED:   Hardcoded empty array
GREEN: const companies = await prisma.company.findMany()
COMMIT: "feat: query companies from database"

SLICE: A6 - GET /api/companies/:id
RED:   /api/companies/1 returns 404
GREEN: Add route handler for :id
COMMIT: "feat: add company by ID endpoint"

SLICE: A7 - Company by ID from database
RED:   Returns hardcoded data
GREEN: prisma.company.findUnique({ where: { id } })
COMMIT: "feat: query company by ID"

SLICE: A8 - Company not found 404
RED:   Invalid ID returns 200
GREEN: if (!company) return res.status(404)
COMMIT: "feat: return 404 for missing company"

SLICE: A9 - Supplier Prisma model
RED:   prisma.supplier undefined
GREEN: Add Supplier model to schema.prisma
COMMIT: "feat: add Supplier prisma model"

SLICE: A10 - Supplier-Company relation
RED:   Supplier has no companyId
GREEN: Add companyId field, relation to Company
COMMIT: "feat: add supplier-company relation"

SLICE: A11 - Supplier migration
RED:   Supplier table doesn't exist
GREEN: npx prisma migrate dev
COMMIT: "feat: migrate Supplier table"

SLICE: A12 - GET /api/suppliers
RED:   /api/suppliers 404
GREEN: Create suppliers router, return []
COMMIT: "feat: add suppliers endpoint"

SLICE: A13 - Suppliers from database
RED:   Hardcoded empty array
GREEN: prisma.supplier.findMany()
COMMIT: "feat: query suppliers from database"

SLICE: A14 - Suppliers filter by company
RED:   Can't filter by company
GREEN: Check query param, add where clause
COMMIT: "feat: filter suppliers by company"

SLICE: A15 - Connection Prisma model
RED:   prisma.connection undefined
GREEN: Add Connection model to schema.prisma
COMMIT: "feat: add Connection prisma model"

SLICE: A16 - Connection migration
RED:   Connection table doesn't exist
GREEN: npx prisma migrate dev
COMMIT: "feat: migrate Connection table"

SLICE: A17 - GET /api/connections
RED:   /api/connections 404
GREEN: Create connections router
COMMIT: "feat: add connections endpoint"

SLICE: A18 - Connections from database
RED:   Hardcoded data
GREEN: prisma.connection.findMany()
COMMIT: "feat: query connections from database"

SLICE: A19 - Event Prisma model
RED:   prisma.event undefined
GREEN: Add Event model to schema.prisma
COMMIT: "feat: add Event prisma model"

SLICE: A20 - Event migration
RED:   Event table doesn't exist
GREEN: npx prisma migrate dev
COMMIT: "feat: migrate Event table"

SLICE: A21 - GET /api/events
RED:   /api/events 404
GREEN: Create events router
COMMIT: "feat: add events endpoint"

SLICE: A22 - Events filter by type
RED:   Can't filter events
GREEN: Check type query param, add where clause
COMMIT: "feat: filter events by type"

SLICE: A23 - Events filter by region
RED:   Can't filter by location
GREEN: Add bounding box filter using PostGIS
COMMIT: "feat: filter events by region"

SLICE: A24 - Tariff Prisma model
RED:   prisma.tariff undefined
GREEN: Add Tariff model to schema.prisma
COMMIT: "feat: add Tariff prisma model"

SLICE: A25 - GET /api/tariffs
RED:   /api/tariffs 404
GREEN: Create tariffs router
COMMIT: "feat: add tariffs endpoint"

SLICE: A26 - Tariffs filter by country pair
RED:   Can't filter tariffs
GREEN: Add fromCountry, toCountry query params
COMMIT: "feat: filter tariffs by countries"

SLICE: A27 - POST /api/user-supply-chain
RED:   Can't save user data
GREEN: Add POST handler, validate body
COMMIT: "feat: add user supply chain endpoint"

SLICE: A28 - User supply chain saved
RED:   Data not persisted
GREEN: prisma.userSupplyChain.create()
COMMIT: "feat: save user supply chain"

SLICE: A29 - GET /api/user-supply-chain
RED:   Can't retrieve user data
GREEN: Add GET handler
COMMIT: "feat: get user supply chain"
```

### EXTERNAL DATA INTEGRATION (Workstream 4)

```
SLICE: E1 - GDELT service file
RED:   gdelt service doesn't exist
GREEN: Create services/gdelt.ts
COMMIT: "feat: add GDELT service file"

SLICE: E2 - GDELT fetch function
RED:   fetchGdeltEvents() undefined
GREEN: export async function fetchGdeltEvents()
COMMIT: "feat: add GDELT fetch function"

SLICE: E3 - GDELT API call
RED:   Function doesn't call API
GREEN: fetch('https://api.gdeltproject.org/...')
COMMIT: "feat: call GDELT API"

SLICE: E4 - GDELT response parsed
RED:   Raw response not parsed
GREEN: Parse CSV/JSON response to Event objects
COMMIT: "feat: parse GDELT response"

SLICE: E5 - GDELT events saved to DB
RED:   Events not persisted
GREEN: prisma.event.createMany()
COMMIT: "feat: save GDELT events to database"

SLICE: E6 - GDELT cron job
RED:   No scheduled fetching
GREEN: Add node-cron job every 15 minutes
COMMIT: "feat: schedule GDELT polling"

SLICE: E7 - USGS service file
RED:   usgs service doesn't exist
GREEN: Create services/usgs.ts
COMMIT: "feat: add USGS service file"

SLICE: E8 - USGS fetch function
RED:   fetchEarthquakes() undefined
GREEN: export async function fetchEarthquakes()
COMMIT: "feat: add USGS fetch function"

SLICE: E9 - USGS API call
RED:   Function doesn't call API
GREEN: fetch('https://earthquake.usgs.gov/...')
COMMIT: "feat: call USGS API"

SLICE: E10 - USGS response parsed
RED:   GeoJSON not parsed to Events
GREEN: Map features to Event objects
COMMIT: "feat: parse USGS GeoJSON"

SLICE: E11 - USGS cron job
RED:   No scheduled fetching
GREEN: Add node-cron job
COMMIT: "feat: schedule USGS polling"

SLICE: E12 - NOAA service file
RED:   noaa service doesn't exist
GREEN: Create services/noaa.ts
COMMIT: "feat: add NOAA service file"

SLICE: E13 - NOAA fetch function
RED:   fetchWeatherAlerts() undefined
GREEN: export async function fetchWeatherAlerts()
COMMIT: "feat: add NOAA fetch function"

SLICE: E14 - NOAA API call
RED:   Function doesn't call API
GREEN: fetch('https://api.weather.gov/...')
COMMIT: "feat: call NOAA API"

SLICE: E15 - NOAA response parsed
RED:   Alerts not parsed to Events
GREEN: Map alerts to Event objects
COMMIT: "feat: parse NOAA alerts"

SLICE: E16 - NewsAPI service file
RED:   newsapi service doesn't exist
GREEN: Create services/newsapi.ts
COMMIT: "feat: add NewsAPI service file"

SLICE: E17 - NewsAPI fetch function
RED:   fetchNews() undefined
GREEN: export async function fetchNews()
COMMIT: "feat: add NewsAPI fetch function"

SLICE: E18 - NewsAPI with keywords
RED:   Function doesn't filter by keywords
GREEN: Add 'semiconductor' 'chip' 'supply chain' to query
COMMIT: "feat: filter news by semiconductor keywords"

SLICE: E19 - NewsAPI response parsed
RED:   Articles not parsed to NewsItem
GREEN: Map articles to NewsItem objects
COMMIT: "feat: parse NewsAPI response"

SLICE: E20 - News cron job
RED:   No scheduled fetching
GREEN: Add node-cron job every 30 minutes
COMMIT: "feat: schedule news polling"

SLICE: E21 - WebSocket setup
RED:   No real-time connection
GREEN: npm install socket.io, create ws server
COMMIT: "feat: add socket.io server"

SLICE: E22 - WebSocket emits events
RED:   New events not broadcast
GREEN: io.emit('new-event', event) after fetch
COMMIT: "feat: broadcast new events via websocket"

SLICE: E23 - WebSocket emits news
RED:   New news not broadcast
GREEN: io.emit('new-news', news) after fetch
COMMIT: "feat: broadcast new news via websocket"

SLICE: E24 - Frontend WebSocket client
RED:   Frontend doesn't receive updates
GREEN: npm install socket.io-client, connect
COMMIT: "feat: add websocket client"

SLICE: E25 - Frontend handles event updates
RED:   New events don't appear
GREEN: socket.on('new-event', addEvent)
COMMIT: "feat: handle real-time event updates"

SLICE: E26 - Frontend handles news updates
RED:   Ticker doesn't update
GREEN: socket.on('new-news', addNewsItem)
COMMIT: "feat: handle real-time news updates"
```

---

## PHASE 2: INTEGRATION SLICES

```
SLICE: I1 - Map fetches companies
RED:   Map doesn't load companies
GREEN: useEffect fetch /api/companies, setNodes
COMMIT: "feat: map loads companies from API"

SLICE: I2 - Map fetches connections
RED:   Map doesn't load connections
GREEN: useEffect fetch /api/connections, setArcs
COMMIT: "feat: map loads connections from API"

SLICE: I3 - Map fetches events
RED:   Map doesn't load events
GREEN: useEffect fetch /api/events, setHeatmapData
COMMIT: "feat: map loads events from API"

SLICE: I4 - Click node opens detail panel
RED:   Clicking node does nothing
GREEN: onClick: setSelectedNode, panel receives selectedNode
COMMIT: "feat: click node opens detail panel"

SLICE: I5 - Detail panel shows node data
RED:   Panel shows placeholder
GREEN: Display node.name, node.location, etc
COMMIT: "feat: detail panel shows node info"

SLICE: I6 - Click edge opens detail panel
RED:   Clicking edge does nothing
GREEN: onClick: setSelectedEdge, panel mode for edges
COMMIT: "feat: click edge opens detail panel"

SLICE: I7 - Detail panel shows edge data
RED:   Panel doesn't show edge info
GREEN: Display edge endpoints, status, materials
COMMIT: "feat: detail panel shows edge info"

SLICE: I8 - News ticker receives real news
RED:   Ticker shows hardcoded news
GREEN: Fetch from /api/news, connect to ticker
COMMIT: "feat: ticker shows real news"

SLICE: I9 - Events render as heatmap
RED:   Events don't show on map
GREEN: Transform events to polygon data
COMMIT: "feat: events render as heatmap"

SLICE: I10 - Connection color by status
RED:   All connections same color
GREEN: getSourceColor based on connection.status
COMMIT: "feat: color connections by status"

SLICE: I11 - Heatmap color by event type
RED:   All heatmaps same color
GREEN: getFillColor based on event.type
COMMIT: "feat: color heatmap by event type"

SLICE: I12 - User supply chain highlighted
RED:   User's chain not distinguished
GREEN: Different color/glow for user's connections
COMMIT: "feat: highlight user supply chain"

SLICE: I13 - Form saves to database
RED:   Form submit does nothing
GREEN: POST to /api/user-supply-chain
COMMIT: "feat: save form to database"

SLICE: I14 - Saved chain appears on map
RED:   Saved chain not visible
GREEN: Fetch user chain, add to map data
COMMIT: "feat: display saved user chain on map"
```

---

## PHASE 3: ADVANCED FEATURES

```
SLICE: AF1 - Risk calculation function
RED:   calculateRisk() undefined
GREEN: Export function with basic formula
COMMIT: "feat: add risk calculation"

SLICE: AF2 - Risk considers event proximity
RED:   Risk ignores distance
GREEN: Add distance decay to calculation
COMMIT: "feat: risk includes event proximity"

SLICE: AF3 - Risk considers event severity
RED:   Risk ignores severity
GREEN: Multiply by severity factor
COMMIT: "feat: risk includes event severity"

SLICE: AF4 - Risk displayed on connection
RED:   No risk indicator on arc
GREEN: Add risk badge/color to arc layer
COMMIT: "feat: display risk on connections"

SLICE: AF5 - Alternative suppliers query
RED:   Can't find alternatives
GREEN: API endpoint for alternatives by material
COMMIT: "feat: query alternative suppliers"

SLICE: AF6 - Alternatives shown on click
RED:   Clicking risky edge shows nothing
GREEN: Fetch alternatives, highlight on map
COMMIT: "feat: show alternatives for risky edge"

SLICE: AF7 - Alternative route preview
RED:   Can't preview reroute
GREEN: Hover alternative shows potential route
COMMIT: "feat: preview alternative route"

SLICE: AF8 - Tariff overlay on countries
RED:   No tariff visualization
GREEN: Add country polygons with tariff color
COMMIT: "feat: tariff country overlay"

SLICE: AF9 - Tariff badges on connections
RED:   No tariff indicators on routes
GREEN: Add badge to arcs crossing tariff boundaries
COMMIT: "feat: tariff badges on connections"

SLICE: AF10 - Export as PNG
RED:   Can't export map
GREEN: Use html-to-image or mapbox export
COMMIT: "feat: export map as PNG"

SLICE: AF11 - Export as CSV
RED:   Can't export data
GREEN: Convert supply chain to CSV, download
COMMIT: "feat: export data as CSV"

SLICE: AF12 - Export as PDF report
RED:   Can't generate report
GREEN: Use jsPDF to create report
COMMIT: "feat: export PDF report"
```

### DATA SEEDING (Workstream 5)

```
SLICE: D1 - Seed data directory
RED:   data/seed/ doesn't exist
GREEN: mkdir -p data/seed
COMMIT: "chore: create seed data directory"

SLICE: D2 - Companies seed file structure
RED:   companies.json doesn't exist
GREEN: Create empty array JSON file
COMMIT: "chore: add companies seed file"

SLICE: D3 - TSMC data
RED:   TSMC not in seed data
GREEN: Add TSMC with location, type, products
COMMIT: "data: add TSMC"

SLICE: D4 - Samsung Semiconductor data
RED:   Samsung not in seed data
GREEN: Add Samsung with location, type, products
COMMIT: "data: add Samsung Semiconductor"

SLICE: D5 - Intel data
RED:   Intel not in seed data
GREEN: Add Intel with locations (multiple fabs)
COMMIT: "data: add Intel"

SLICE: D6 - ASML data
RED:   ASML not in seed data
GREEN: Add ASML Netherlands HQ
COMMIT: "data: add ASML"

SLICE: D7 - GlobalFoundries data
RED:   GF not in seed data
GREEN: Add GlobalFoundries locations
COMMIT: "data: add GlobalFoundries"

SLICE: D8 - SK Hynix data
RED:   SK Hynix not in seed data
GREEN: Add SK Hynix Korea
COMMIT: "data: add SK Hynix"

SLICE: D9 - Micron data
RED:   Micron not in seed data
GREEN: Add Micron USA locations
COMMIT: "data: add Micron"

SLICE: D10 - Nvidia data
RED:   Nvidia not in seed data
GREEN: Add Nvidia (fabless, design centers)
COMMIT: "data: add Nvidia"

SLICE: D11 - AMD data
RED:   AMD not in seed data
GREEN: Add AMD locations
COMMIT: "data: add AMD"

SLICE: D12 - Qualcomm data
RED:   Qualcomm not in seed data
GREEN: Add Qualcomm San Diego
COMMIT: "data: add Qualcomm"

SLICE: D13 - Foxconn data
RED:   Foxconn not in seed data
GREEN: Add Foxconn assembly plants
COMMIT: "data: add Foxconn"

SLICE: D14 - Applied Materials data
RED:   Applied Materials not in seed data
GREEN: Add Applied Materials
COMMIT: "data: add Applied Materials"

SLICE: D15 - Major ports seed file
RED:   ports.json doesn't exist
GREEN: Create ports seed file
COMMIT: "chore: add ports seed file"

SLICE: D16 - Kaohsiung port
RED:   Kaohsiung not in ports
GREEN: Add Port of Kaohsiung (Taiwan's main chip port)
COMMIT: "data: add Kaohsiung port"

SLICE: D17 - Busan port
RED:   Busan not in ports
GREEN: Add Port of Busan (Korea)
COMMIT: "data: add Busan port"

SLICE: D18 - Long Beach port
RED:   Long Beach not in ports
GREEN: Add Port of Long Beach (US West Coast)
COMMIT: "data: add Long Beach port"

SLICE: D19 - Rotterdam port
RED:   Rotterdam not in ports
GREEN: Add Port of Rotterdam (Europe)
COMMIT: "data: add Rotterdam port"

SLICE: D20 - Shanghai port
RED:   Shanghai not in ports
GREEN: Add Port of Shanghai
COMMIT: "data: add Shanghai port"

SLICE: D21 - Singapore port
RED:   Singapore not in ports
GREEN: Add Port of Singapore
COMMIT: "data: add Singapore port"

SLICE: D22 - Connections seed file
RED:   connections.json doesn't exist
GREEN: Create connections seed file
COMMIT: "chore: add connections seed file"

SLICE: D23 - TSMC to Apple connection
RED:   TSMC-Apple connection not seeded
GREEN: Add connection data
COMMIT: "data: add TSMC-Apple connection"

SLICE: D24 - TSMC to Nvidia connection
RED:   TSMC-Nvidia connection not seeded
GREEN: Add connection data
COMMIT: "data: add TSMC-Nvidia connection"

SLICE: D25 - Samsung to Apple connection
RED:   Samsung-Apple connection not seeded
GREEN: Add connection data
COMMIT: "data: add Samsung-Apple connection"

SLICE: D26 - ASML to TSMC connection
RED:   ASML-TSMC connection not seeded
GREEN: Add connection (equipment supplier)
COMMIT: "data: add ASML-TSMC connection"

SLICE: D27 - Tariffs seed file
RED:   tariffs.json doesn't exist
GREEN: Create tariffs seed file
COMMIT: "chore: add tariffs seed file"

SLICE: D28 - US-China semiconductor tariff
RED:   US-China tariff not seeded
GREEN: Add Section 301 tariff data
COMMIT: "data: add US-China semiconductor tariff"

SLICE: D29 - Seed script
RED:   Can't run seeding
GREEN: Create seed.ts script
COMMIT: "feat: add database seed script"

SLICE: D30 - Seed script runs
RED:   npm run seed fails
GREEN: Add script to package.json, test run
COMMIT: "feat: seed script functional"
```

---

## Summary Statistics

**Total Slices:** ~150+ individual TDD cycles

**Phase Breakdown:**
- Phase 0 (Foundation): ~27 slices
- Phase 1 Map: ~35 slices
- Phase 1 UI: ~40 slices
- Phase 1 API: ~29 slices
- Phase 1 External: ~26 slices
- Phase 1 Data: ~30 slices
- Phase 2 Integration: ~14 slices
- Phase 3 Advanced: ~12 slices

**Parallelization:**
- After Phase 0 completes, 5 workstreams can run in parallel
- Each workstream can have a dedicated developer/Claude agent
- No cross-dependencies within Phase 1
- Phase 2 begins when Phase 1 workstreams complete

---

(End of brainstorming session Q20)

