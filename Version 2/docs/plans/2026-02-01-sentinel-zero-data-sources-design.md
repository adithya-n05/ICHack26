# Sentinel-Zero Data Sources & Path Generation (Design Notes)

Date: 2026-02-01

## Goals
- Use **free data sources** (free with signup/API key is OK).
- Focus on **electronics industry** supply chains.
- Prioritize **deep coverage in major hubs**, while keeping global ports visible.
- Provide **supply chain paths** (company ↔ factory ↔ port ↔ warehouse ↔ customer).
- Prepare for **future predictions and alternative suppliers** when live data arrives.

## Geographic Focus (Deep Coverage)
- Taiwan, South Korea, Japan, China
- United States (West + Southwest)
- Europe (Netherlands, Germany, France, plus major EU ports)
- Southeast Asia (Singapore, Malaysia, Vietnam)

## Data Sources (Free or Free With Signup)

### Ports
- **World Ports Index (open dataset)**: global port locations, GeoJSON/shapefiles.
- Optional later: **SeaRates World Sea Ports** (commercial; skip for now).

### Industrial Facilities (Factories, Warehouses, Logistics Hubs)
- **OpenStreetMap + Overpass**:
  - Tags: `industrial`, `factory`, `warehouse`, `logistics`, `manufacturing`
  - Enrich with electronics‑related operator names when present.
  - Accept variable quality; prioritize regions above for density.

### Companies (Electronics/Semiconductors)
- **Curated seed list** of major companies (TSMC, Samsung, Intel, ASML, etc.).
- **OSM POIs** for companies and industrial sites with electronics tags.

### Tariffs / Trade Policy
- **WTO Developer Portal API** (free signup): tariff/trade indicators by country.
- Optional later: **USITC DataWeb API** (free with account, US focus).

### Conflict / Wars
- **ReliefWeb API** (free): conflict + humanitarian reports.
- Use to annotate impacted regions for risk weighting.

### News / Sentiment
- **GDELT** (already integrated in V2).
- **NewsAPI** (already integrated in V2; free with API key).

## Data Model (Minimal for Phase 1)

### Nodes
- `company` (HQ + key facilities)
- `factory` / `industrial_site`
- `warehouse` / `logistics_hub`
- `port`
- `market` / `customer_region`

Common fields:
- `id`, `name`, `type`, `location`, `country`, `industry`, `tags`, `source`
- Optional: `capacity`, `employees`, `revenue`, `specialties`

### Connections (Edges)
- `from_node_id`, `to_node_id`
- `transport_mode` (sea/air/land)
- `status` (healthy/monitoring/at-risk/critical)
- `materials`, `lead_time_days`, `annual_volume_units`
- `is_user_connection`

### Tariffs
- `from_country`, `to_country`, `product_category`, `hs_codes`, `rate`, `effective_date`

## Path Generation (Baseline Heuristic)

### Approach (Option A)
- Build **static paths** from node types:
  1. Company → Factory
  2. Factory → Port (nearest major port within region)
  3. Port → Port (trade corridor)
  4. Port → Warehouse / Logistics hub
  5. Warehouse → Market region / Customer

### Heuristic Rules
- Prefer **shortest distance** for intra‑region steps.
- Use **known trade corridors** between hub regions (e.g., Taiwan ↔ US West).
- Penalize routes with **high tariffs** (WTO/USITC) once available.
- Weight routes with **conflict risk** (ReliefWeb) or disaster risk (USGS/NOAA).

### Outputs
- Visual paths (arcs) with **company/material ownership**.
- Aggregate **cost/lead time** estimates (baseline + tariff adjustments).
- Display **path metadata** in detail panel.

## Path Construction During Ingestion (Detailed)

### Node Layers
- `company`, `factory`, `logistics_hub`, `port`, `warehouse`, `market`
- Each node carries region tags (e.g., TW, KR, US-W, EU-NW).

### Candidate Edge Rules (Option C depth)
1. **Company → Factory**: nearest factory with electronics tag or same operator.
2. **Factory → Logistics Hub**: nearest hub/warehouse in region.
3. **Logistics Hub → Port**: nearest major port in region.
4. **Port → Port**: corridor selection based on region-to-region pairings.
5. **Port → Warehouse → Market**: nearest warehouse to destination market.

### Edge Weights
- **Cost**: distance × mode multiplier + tariff modifiers.
- **Lead Time**: distance / speed by mode + buffer.
- **Risk (initial)**: 0, but store region + hazard keys for later updates.

### Best Path Selection
- Choose lowest weighted score: `w_cost * cost + w_time * lead_time + w_risk * risk`.
- Store **one best path** per company/product.
- If any layer missing, gracefully downgrade to shallower path (C → B → A).

## Path Risk Updates & Alternative Supplier Hints

- **Risk updates** raise edge severity and color arcs (green → amber → red).
- **Alternative supplier hints** appear when a user selects a path that is
  **amber or worse**, showing candidate suppliers in the panel and map.

## Alternative Supplier Candidates (On Selection, Amber+)

### Candidate Pipeline
1. Identify the first amber (or worse) edge on the selected path.
2. Extract product/material context from that edge or company metadata.
3. Query suppliers with matching tags and exclude impacted regions.
4. Score candidates:
   `score = 0.35*safety + 0.25*distance + 0.2*lead_time + 0.2*tariff_exposure`
5. Return top N (default 5) for display.

### UI/UX
- Show candidates as green markers on the map.
- Detail panel shows lead time, tariff delta, and a “simulate reroute” action.

## Electronics Taxonomy + HS Mapping (Speed-First)

### Taxonomy (Examples)
- `semiconductors`
  - `logic` → HS 8542
  - `memory` → HS 8542
  - `discrete` → HS 8541
  - `wafer` → HS 3818
- `components`
  - `passives` → HS 8533 / 8532
  - `connectors` → HS 8536
- `equipment`
  - `lithography` → HS 8486
  - `test` → HS 9030
  - `packaging` → HS 8479
- `subassemblies`
  - `pcbs` → HS 8534
  - `modules` → HS 8473
- `finished_goods`
  - `servers` → HS 8471
  - `mobile` → HS 8517
  - `automotive_electronics` → HS 8537

### Mapping Rules
- Each node gets taxonomy tags + a **primary HS-4 code**.
- Tariff impact is computed when paths cross country pairs with active tariffs.

## Inferred Paths (No Confidence Display)

- Paths are inferred from public facility + port + region data.
- Confidence is used internally for scoring, but **not shown in UI**.

## LLM-Assisted Path Filling (During Ingestion)

- Use **math + LLM** to generate best-effort paths for companies.
- LLM suggests missing hops (factory/assembly/logistics) based on
  taxonomy tags + regional hubs.
- Mathematical scoring still selects the final path (cost/time/tariff/risk).
- LLM is **constrained to real nodes**; no synthetic nodes in final edges.
- Final edges are stored in Supabase after local generation.
- Run LLM **once per company**, using its **top product category**.
- LLM uses **static nodes + product category only**; external signals
  are applied later for impact prediction.

## Arc Coloring & State Scheme

### Status Colors (Arcs)
- **Healthy**: soft gray/white (baseline flow)
- **Monitoring**: amber
- **At-risk**: orange
- **Critical**: red
- **Disrupted**: dark red

### Visual Treatments
- **User path**: brighter cyan, slightly thicker stroke.
- **Selected path**: glow + increased opacity.
- **Amber+ selected**: trigger alternative supplier hints.

## Future‑Ready: Predictions & Alternatives

### Predictions
- Use incoming events (GDELT, ReliefWeb, USGS, NOAA) to **re‑score edges**.
- Risk score per edge: severity × proximity × tariff impact.

### Alternative Suppliers
- When risk > threshold, propose alternatives:
  - Same product category
  - Outside affected region
  - Lower tariff exposure
  - Better lead time/cost

## Next Steps
- Implement data ingestion for:
  - World Ports Index
  - OSM/Overpass POI extraction
  - WTO tariffs (basic indicators)
  - ReliefWeb conflict feed
- Generate baseline paths using heuristic rules.
- Prepare weighting hooks for predictions and alternatives.
