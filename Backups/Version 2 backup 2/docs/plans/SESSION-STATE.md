# Session State - Sentinel-Zero Plan Writing

**Last Updated:** 2026-01-31 (Session 2)
**Status:** Writing separate Phase 1 plan files for parallel execution

---

## Project Overview

Building "Sentinel-Zero" - a geopolitical trade shock predictor for supply chain managers in the semiconductor industry. Military command center aesthetic with dark tactical UI.

**Tech Stack:**
- Frontend: React 18, TypeScript, Vite, Tailwind CSS, Mapbox GL JS, deck.gl
- Backend: Node.js, Express, TypeScript, Supabase (PostgreSQL + PostGIS)
- Real-time: Socket.io
- External APIs: GDELT, USGS, NOAA, NewsAPI
- Testing: Playwright for E2E

---

## Completed Plan Files

| File | Status | Tasks |
|------|--------|-------|
| `2026-01-31-sentinel-zero-design.md` | SOURCE OF TRUTH | Brainstorming doc |
| `2026-01-31-sentinel-zero-phase0.md` | ✅ DONE | 27 Foundation tasks |
| `2026-01-31-sentinel-zero-phase1-map.md` | ✅ DONE | 35 Map Visualization tasks |
| `2026-01-31-sentinel-zero-phase1-ui.md` | ✅ DONE | 40 UI Components tasks (U1-U40) |
| `2026-01-31-sentinel-zero-phase1-api.md` | ✅ DONE | 29 API Endpoints tasks (A1-A29) |
| `2026-01-31-sentinel-zero-phase1-external.md` | ✅ DONE | 26 External Data tasks (E1-E26) |
| `2026-01-31-sentinel-zero-phase1-data.md` | ❌ TODO | 30 Data Seeding tasks (D1-D30) |
| `vectorized-beaming-twilight.md` | Combined plan | Has Playwright E2E (PW1-PW11) |

---

## What Remains To Be Written

### Phase 1 (Separate Files for Parallel Execution)
- **Data Seeding (D1-D30)** - Need to create `phase1-data.md`

### Later Phases (Can use combined plan file)
- Phase 2: Integration (I1-I14)
- Phase 3: Advanced Features (AF1-AF12)
- Phase 4: E2E Testing with Playwright (PW1-PW11) - Already in combined plan

---

## Data Seeding Slices (D1-D30) - TO BE WRITTEN

From brainstorming doc:
```
D1 - Seed data directory
D2 - Companies seed file structure
D3 - TSMC data
D4 - Samsung Semiconductor data
D5 - Intel data
D6 - ASML data
D7 - GlobalFoundries data
D8 - SK Hynix data
D9 - Micron data
D10 - Nvidia data
D11 - AMD data
D12 - Qualcomm data
D13 - Foxconn data
D14 - Applied Materials data
D15 - Major ports seed file
D16 - Kaohsiung port
D17 - Busan port
D18 - Long Beach port
D19 - Rotterdam port
D20 - Shanghai port
D21 - Singapore port
D22 - Connections seed file
D23 - TSMC to Apple connection
D24 - TSMC to Nvidia connection
D25 - Samsung to Apple connection
D26 - ASML to TSMC connection
D27 - Tariffs seed file
D28 - US-China semiconductor tariff
D29 - Seed script
D30 - Seed script runs
```

---

## Parallel Execution Structure

After Phase 0 completes, user can run these in parallel Claude sessions:

1. **Map Visualization** → `phase1-map.md`
2. **UI Components** → `phase1-ui.md`
3. **API Endpoints** → `phase1-api.md`
4. **External Data** → `phase1-external.md`
5. **Data Seeding** → `phase1-data.md` (NEEDS WRITING)

Each session uses: `superpowers:executing-plans`

---

## To Resume

1. Read this file for context
2. Create `docs/plans/2026-01-31-sentinel-zero-phase1-data.md` with D1-D30 slices
3. Each slice needs 5-step TDD format:
   - Step 1: Write failing test
   - Step 2: Run test - verify fails
   - Step 3: Minimal implementation
   - Step 4: Run test - verify passes
   - Step 5: Commit

---

## Key Data from Brainstorming Doc

**Companies to Seed:**
- TSMC (Hsinchu, Taiwan) - foundry
- Samsung (Hwaseong, Korea) - IDM
- Intel (Chandler, USA) - IDM
- ASML (Veldhoven, Netherlands) - equipment
- GlobalFoundries, SK Hynix, Micron, Nvidia, AMD, Qualcomm, Foxconn, Applied Materials

**Ports to Seed:**
- Kaohsiung (Taiwan)
- Busan (Korea)
- Long Beach (USA)
- Rotterdam (Netherlands)
- Shanghai (China)
- Singapore

**Sample Tariff:**
```json
{
  "id": "us-china-chips-2024",
  "from_country": "CN",
  "to_country": "US",
  "product_category": "semiconductors",
  "hs_codes": ["8541", "8542"],
  "tariff_rate": 25,
  "effective_date": "2024-01-01"
}
```
