# Sentinel-Zero Ingestion + Path Generation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ingest real supply-chain nodes (companies, facilities, ports), generate best inferred paths during ingestion using math + LLM, persist to Supabase, and update frontend to display paths with state coloring.

**Architecture:** Backend ingestion pipeline pulls OSM/Overpass facilities, World Ports Index ports, and tariff/conflict metadata; normalizes nodes into the `companies` table. An LLM proposes paths constrained to real nodes, then a scoring engine selects the final path and stores edges + metadata in Supabase. Frontend fetches paths and renders arcs with state‑based color.

**Tech Stack:** Node.js + TypeScript, Supabase, Overpass API, World Ports Index dataset, OpenAI API, React + deck.gl.

---

### Task 1: Add backend test runner (Vitest)

**Files:**
- Modify: `Version 2/backend/package.json`
- Create: `Version 2/backend/vitest.config.ts`

**Step 1: Write the failing test**
```bash
cd "Version 2/backend" && npm run test
```
Expected: exits with error (no test runner).

**Step 2: Run test to verify it fails**
```bash
cd "Version 2/backend" && npm run test
```
Expected: "Error: no test specified".

**Step 3: Write minimal implementation**
```bash
cd "Version 2/backend" && npm install -D vitest
```

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

Update `package.json`:
```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

**Step 4: Run test to verify it passes**
```bash
cd "Version 2/backend" && npm run test
```
Expected: "No test files found".

**Step 5: Commit**
```bash
git add "Version 2/backend/package.json" "Version 2/backend/vitest.config.ts"
git commit -m "chore: add vitest to backend"
```

---

### Task 2: Extend Supabase schema for taxonomy + paths

**Files:**
- Modify: `Version 2/backend/supabase-schema.sql`

**Step 1: Write the failing test**
```
# No test runner for SQL; use a simple check after SQL update.
```

**Step 2: Run test to verify it fails**
```
# Not applicable; proceed to schema update.
```

**Step 3: Write minimal implementation**
Add columns to `companies`:
```sql
ALTER TABLE companies ADD COLUMN IF NOT EXISTS node_type TEXT; -- company, factory, port, warehouse, hub, market
ALTER TABLE companies ADD COLUMN IF NOT EXISTS source TEXT; -- osm, curated, ports_index
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS region_code TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS taxonomy JSONB DEFAULT '{}'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_hs_code TEXT;
```

Add columns to `connections`:
```sql
ALTER TABLE connections ADD COLUMN IF NOT EXISTS path_id TEXT;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS sequence INTEGER;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS cost_score DOUBLE PRECISION;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS risk_score DOUBLE PRECISION;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS tariff_cost DOUBLE PRECISION;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS product_category TEXT;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS is_path_edge BOOLEAN DEFAULT FALSE;
```

Create `supply_paths` table:
```sql
CREATE TABLE IF NOT EXISTS supply_paths (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT REFERENCES companies(id),
  product_category TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Step 4: Run test to verify it passes**
```
# Apply SQL in Supabase editor; confirm columns exist.
```

**Step 5: Commit**
```bash
git add "Version 2/backend/supabase-schema.sql"
git commit -m "db: extend schema for taxonomy and paths"
```

---

### Task 3: Add shared types for taxonomy and paths

**Files:**
- Create: `Version 2/shared/types/taxonomy.ts`
- Create: `Version 2/shared/types/path.ts`
- Modify: `Version 2/shared/types/index.ts`

**Step 1: Write the failing test**
```ts
import { ProductCategory } from '../../shared/types/taxonomy';
```

**Step 2: Run test to verify it fails**
```bash
cd "Version 2/backend" && npm run test
```
Expected: module not found.

**Step 3: Write minimal implementation**
`taxonomy.ts`:
```ts
export type ProductCategory =
  | 'semiconductors.logic'
  | 'semiconductors.memory'
  | 'semiconductors.discrete'
  | 'semiconductors.wafer'
  | 'components.passives'
  | 'components.connectors'
  | 'equipment.lithography'
  | 'equipment.test'
  | 'equipment.packaging'
  | 'subassemblies.pcbs'
  | 'subassemblies.modules'
  | 'finished_goods.servers'
  | 'finished_goods.mobile'
  | 'finished_goods.automotive_electronics';

export const HS4_BY_CATEGORY: Record<ProductCategory, string[]> = {
  'semiconductors.logic': ['8542'],
  'semiconductors.memory': ['8542'],
  'semiconductors.discrete': ['8541'],
  'semiconductors.wafer': ['3818'],
  'components.passives': ['8533', '8532'],
  'components.connectors': ['8536'],
  'equipment.lithography': ['8486'],
  'equipment.test': ['9030'],
  'equipment.packaging': ['8479'],
  'subassemblies.pcbs': ['8534'],
  'subassemblies.modules': ['8473'],
  'finished_goods.servers': ['8471'],
  'finished_goods.mobile': ['8517'],
  'finished_goods.automotive_electronics': ['8537'],
};
```

`path.ts`:
```ts
export interface SupplyPath {
  id: string;
  companyId: string;
  productCategory: string;
  status: 'active' | 'at-risk' | 'disrupted';
}

export interface PathEdge {
  id: string;
  pathId: string;
  fromNodeId: string;
  toNodeId: string;
  sequence: number;
  costScore: number;
  riskScore: number;
  tariffCost: number;
}
```

Update `index.ts` exports.

**Step 4: Run test to verify it passes**
```bash
cd "Version 2/backend" && npm run test
```
Expected: no test files found.

**Step 5: Commit**
```bash
git add "Version 2/shared/types"
git commit -m "feat: add taxonomy and path types"
```

---

### Task 4: Overpass query builder for facilities

**Files:**
- Create: `Version 2/backend/src/ingestion/overpass.ts`
- Create: `Version 2/backend/src/ingestion/overpass.test.ts`

**Step 1: Write the failing test**
```ts
import { buildOverpassQuery } from './overpass';

test('builds query with tags and bbox', () => {
  const query = buildOverpassQuery([['industrial', '*']], [1, 2, 3, 4]);
  expect(query).toContain('[bbox:1,2,3,4]');
  expect(query).toContain('nwr["industrial"]');
});
```

**Step 2: Run test to verify it fails**
```bash
cd "Version 2/backend" && npm run test
```
Expected: module not found.

**Step 3: Write minimal implementation**
```ts
export function buildOverpassQuery(tags: Array<[string, string]>, bbox: [number, number, number, number]) {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const filters = tags
    .map(([key, value]) => (value === '*' ? `["${key}"]` : `["${key}"="${value}"]`))
    .join('');
  return `[out:json][timeout:25][bbox:${minLng},${minLat},${maxLng},${maxLat}];
  (
    nwr${filters};
  );
  out center;`;
}
```

**Step 4: Run test to verify it passes**
```bash
cd "Version 2/backend" && npm run test
```
Expected: PASS.

**Step 5: Commit**
```bash
git add "Version 2/backend/src/ingestion/overpass.ts" "Version 2/backend/src/ingestion/overpass.test.ts"
git commit -m "feat: add overpass query builder"
```

---

### Task 5: Ports index parser

**Files:**
- Create: `Version 2/backend/src/ingestion/ports.ts`
- Create: `Version 2/backend/src/ingestion/ports.test.ts`

**Step 1: Write the failing test**
```ts
import { parsePortsGeojson } from './ports';

test('parses ports geojson into nodes', () => {
  const node = parsePortsGeojson({
    features: [{ properties: { name: 'Port A' }, geometry: { coordinates: [1, 2] } }]
  })[0];
  expect(node.name).toBe('Port A');
  expect(node.lat).toBe(2);
});
```

**Step 2: Run test to verify it fails**
```bash
cd "Version 2/backend" && npm run test
```

**Step 3: Write minimal implementation**
```ts
export function parsePortsGeojson(geojson: any) {
  return (geojson.features || []).map((feature: any, index: number) => ({
    id: `port-${index}`,
    name: feature.properties?.name || 'Unknown Port',
    type: 'port',
    lat: feature.geometry?.coordinates?.[1],
    lng: feature.geometry?.coordinates?.[0],
    source: 'world_ports_index',
  }));
}
```

**Step 4: Run test to verify it passes**
```bash
cd "Version 2/backend" && npm run test
```

**Step 5: Commit**
```bash
git add "Version 2/backend/src/ingestion/ports.ts" "Version 2/backend/src/ingestion/ports.test.ts"
git commit -m "feat: add ports geojson parser"
```

---

### Task 6: Node normalization + dedupe

**Files:**
- Create: `Version 2/backend/src/ingestion/normalizeNodes.ts`
- Create: `Version 2/backend/src/ingestion/normalizeNodes.test.ts`

**Step 1: Write the failing test**
```ts
import { normalizeNodes } from './normalizeNodes';

test('dedupes by name + proximity', () => {
  const nodes = normalizeNodes([
    { name: 'Fab A', lat: 1, lng: 1 },
    { name: 'Fab A', lat: 1.0001, lng: 1.0001 }
  ]);
  expect(nodes.length).toBe(1);
});
```

**Step 2: Run test to verify it fails**
```bash
cd "Version 2/backend" && npm run test
```

**Step 3: Write minimal implementation**
```ts
export function normalizeNodes(nodes: any[]) {
  const seen = new Map<string, any>();
  for (const node of nodes) {
    const key = `${node.name?.toLowerCase()}-${Math.round(node.lat * 100)}-${Math.round(node.lng * 100)}`;
    if (!seen.has(key)) {
      seen.set(key, node);
    }
  }
  return Array.from(seen.values());
}
```

**Step 4: Run test to verify it passes**
```bash
cd "Version 2/backend" && npm run test
```

**Step 5: Commit**
```bash
git add "Version 2/backend/src/ingestion/normalizeNodes.ts" "Version 2/backend/src/ingestion/normalizeNodes.test.ts"
git commit -m "feat: add node normalization"
```

---

### Task 7: LLM path proposal + scoring

**Files:**
- Create: `Version 2/backend/src/services/pathLLM.ts`
- Create: `Version 2/backend/src/services/pathScoring.ts`
- Create: `Version 2/backend/src/services/pathScoring.test.ts`

**Step 1: Write the failing test**
```ts
import { scorePath } from './pathScoring';

test('scores path with cost/time/tariff/risk', () => {
  const score = scorePath({ cost: 10, leadTime: 5, tariff: 2, risk: 1 });
  expect(score).toBeGreaterThan(0);
});
```

**Step 2: Run test to verify it fails**
```bash
cd "Version 2/backend" && npm run test
```

**Step 3: Write minimal implementation**
`pathScoring.ts`:
```ts
export function scorePath(input: { cost: number; leadTime: number; tariff: number; risk: number }) {
  return input.cost * 0.4 + input.leadTime * 0.3 + input.tariff * 0.2 + input.risk * 0.1;
}
```

`pathLLM.ts`:
```ts
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function proposePath(input: {
  companyName: string;
  productCategory: string;
  candidateNodeIds: string[];
}) {
  const prompt = `Choose a plausible path using only these node IDs: ${input.candidateNodeIds.join(', ')}`;
  const response = await client.responses.create({
    model: 'gpt-4.1-mini',
    input: prompt,
  });
  return response.output_text;
}
```

**Step 4: Run test to verify it passes**
```bash
cd "Version 2/backend" && npm run test
```

**Step 5: Commit**
```bash
git add "Version 2/backend/src/services/pathScoring.ts" \
        "Version 2/backend/src/services/pathScoring.test.ts" \
        "Version 2/backend/src/services/pathLLM.ts"
git commit -m "feat: add path scoring and LLM proposer"
```

---

### Task 8: Ingestion script for nodes + paths

**Files:**
- Create: `Version 2/backend/src/scripts/ingest.ts`
- Modify: `Version 2/backend/package.json`

**Step 1: Write the failing test**
```bash
cd "Version 2/backend" && npm run ingest
```
Expected: script not found.

**Step 2: Run test to verify it fails**
```bash
cd "Version 2/backend" && npm run ingest
```

**Step 3: Write minimal implementation**
`ingest.ts` should:
- Load ports dataset file
- Fetch OSM facilities per region
- Normalize/dedupe nodes
- Upsert to `companies`
- Generate one path per company using LLM + scoring
- Upsert to `supply_paths` and `connections`

Add `package.json` script:
```json
{
  "scripts": {
    "ingest": "npx ts-node src/scripts/ingest.ts"
  }
}
```

**Step 4: Run test to verify it passes**
```bash
cd "Version 2/backend" && npm run ingest
```
Expected: "Ingestion complete" (or Supabase errors if not configured).

**Step 5: Commit**
```bash
git add "Version 2/backend/src/scripts/ingest.ts" "Version 2/backend/package.json"
git commit -m "feat: add ingestion pipeline"
```

---

### Task 9: API endpoint for paths

**Files:**
- Create: `Version 2/backend/src/routes/paths.ts`
- Modify: `Version 2/backend/src/index.ts`

**Step 1: Write the failing test**
```bash
curl "http://localhost:3001/api/paths?company_id=tsmc-hsinchu"
```
Expected: 404.

**Step 2: Run test to verify it fails**
```bash
curl "http://localhost:3001/api/paths?company_id=tsmc-hsinchu"
```

**Step 3: Write minimal implementation**
Return path + edges from `supply_paths` + `connections`.

**Step 4: Run test to verify it passes**
```bash
curl "http://localhost:3001/api/paths?company_id=tsmc-hsinchu"
```
Expected: JSON with path + edges.

**Step 5: Commit**
```bash
git add "Version 2/backend/src/routes/paths.ts" "Version 2/backend/src/index.ts"
git commit -m "feat: add paths endpoint"
```

---

### Task 10: Frontend path rendering

**Files:**
- Create: `Version 2/frontend/src/hooks/usePaths.ts`
- Modify: `Version 2/frontend/src/components/Map/Map.tsx`
- Modify: `Version 2/frontend/src/App.tsx`

**Step 1: Write the failing test**
```
# Select a company: no path arcs appear
```

**Step 2: Run test to verify it fails**
```
# Visual only (manual)
```

**Step 3: Write minimal implementation**
- Fetch `/api/paths?company_id=...`
- Render arcs with state colors
- Highlight selected path

**Step 4: Run test to verify it passes**
```
# Path arcs appear and change color by status
```

**Step 5: Commit**
```bash
git add "Version 2/frontend/src/hooks/usePaths.ts" \
        "Version 2/frontend/src/components/Map/Map.tsx" \
        "Version 2/frontend/src/App.tsx"
git commit -m "feat: render inferred supply paths"
```

---

### Task 11: Alternative supplier hints on amber+

**Files:**
- Modify: `Version 2/frontend/src/components/DetailPanel/DetailPanel.tsx`
- Modify: `Version 2/frontend/src/components/Map/Map.tsx`

**Step 1: Write the failing test**
```
# Select amber path → no alternative hints shown
```

**Step 2: Run test to verify it fails**
```
# Visual only (manual)
```

**Step 3: Write minimal implementation**
- Show candidate suppliers when selected path status is amber+
- Display green markers for candidates

**Step 4: Run test to verify it passes**
```
# Amber path shows alternatives in panel + markers
```

**Step 5: Commit**
```bash
git add "Version 2/frontend/src/components/DetailPanel/DetailPanel.tsx" \
        "Version 2/frontend/src/components/Map/Map.tsx"
git commit -m "feat: show alternative hints for amber paths"
```

---

## Verification Checklist
- [ ] `npm run ingest` completes (or fails only for missing env vars)
- [ ] Ports + facilities appear as nodes
- [ ] Paths stored in `supply_paths` and `connections`
- [ ] `/api/paths` returns expected JSON
- [ ] Map renders arcs with status coloring
- [ ] Selecting an amber path shows alternatives

---

Plan complete and saved to `docs/plans/2026-02-01-sentinel-zero-ingestion-paths-plan.md`. Two execution options:

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration  
2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
