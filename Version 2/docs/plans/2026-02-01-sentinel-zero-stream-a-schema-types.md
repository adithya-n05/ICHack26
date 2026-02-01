# Stream A — Schema + Shared Types

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend Supabase schema for taxonomy/paths and add shared TypeScript types.

**Architecture:** Add columns to `companies` and `connections`, create `supply_paths`, then define shared taxonomy/path types for backend + frontend use.

**Tech Stack:** Supabase SQL, TypeScript.

---

### Task A1: Extend Supabase schema for taxonomy + paths

**Files:**
- Modify: `Version 2/backend/supabase-schema.sql`

**Step 1: Write the failing test**
```
# No automated SQL test. Validate after applying in Supabase.
```

**Step 2: Run test to verify it fails**
```
# Not applicable. Proceed to SQL update.
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

### Task A2: Add shared types for taxonomy and paths

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
