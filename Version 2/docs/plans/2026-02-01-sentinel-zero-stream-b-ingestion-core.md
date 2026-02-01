# Stream B — Ingestion Core

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build ingestion helpers (Overpass, ports parser, normalization) and path scoring + LLM proposal utilities.

**Architecture:** Parse ports, query facilities, normalize/dedupe nodes, then score LLM‑proposed paths using math.

**Tech Stack:** Node.js + TypeScript, Overpass API, OpenAI API.

---

### Task B1: Overpass query builder for facilities

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

### Task B2: Ports index parser

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

### Task B3: Node normalization + dedupe

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

### Task B4: Path scoring + LLM proposer

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
