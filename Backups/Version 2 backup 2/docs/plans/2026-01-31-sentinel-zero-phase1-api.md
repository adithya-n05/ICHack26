# Sentinel-Zero Phase 1: API Endpoints Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build all REST API endpoints for companies, suppliers, connections, events, tariffs, and user supply chain.

**Architecture:** Express.js routes with Supabase/PostgreSQL database queries. RESTful JSON API design.

**Tech Stack:** Node.js, Express.js, TypeScript, Supabase

**Prerequisites:** Phase 0 must be complete (backend initialized with Supabase client configured)

**Total Tasks:** 29 TDD slices (A1-A29)

---

## Task A1: Companies route file

**Files:**
- Create: `backend/src/routes/companies.ts`
- Modify: `backend/src/index.ts`

**Step 1: Write failing test**
```bash
curl http://localhost:3001/api/companies
```

**Step 2: Run test - verify it fails**
```
Expected: 404 Not Found
```

**Step 3: Minimal implementation**
```typescript
// backend/src/routes/companies.ts
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json([]);
});

export default router;
```

```typescript
// backend/src/index.ts - add:
import companiesRouter from './routes/companies';
app.use('/api/companies', companiesRouter);
```

**Step 4: Run test - verify it passes**
```bash
curl http://localhost:3001/api/companies
# Expected: []
```

**Step 5: Commit**
```bash
git add backend/src/routes/companies.ts backend/src/index.ts
git commit -m "feat: add companies router"
```

---

## Task A2: GET /api/companies returns array

**Files:**
- Verify: `backend/src/routes/companies.ts`

**Step 1: Write failing test**
```bash
curl http://localhost:3001/api/companies | jq 'type'
```

**Step 2: Run test - verify it fails**
```
# If not array, test fails
```

**Step 3: Minimal implementation**
```typescript
// Already returns [] which is an array
```

**Step 4: Run test - verify it passes**
```bash
curl http://localhost:3001/api/companies | jq 'type'
# Expected: "array"
```

**Step 5: Commit**
```bash
git add backend/src/routes/companies.ts
git commit -m "feat: companies returns array"
```

---

## Task A3: Companies from Supabase

**Files:**
- Modify: `backend/src/routes/companies.ts`

**Step 1: Write failing test**
```bash
# Check if companies are fetched from database
curl http://localhost:3001/api/companies
```

**Step 2: Run test - verify it fails**
```
# Returns hardcoded empty array
```

**Step 3: Minimal implementation**
```typescript
// backend/src/routes/companies.ts
import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

**Step 4: Run test - verify it passes**
```bash
curl http://localhost:3001/api/companies
# Expected: Array (empty if no data seeded yet)
```

**Step 5: Commit**
```bash
git add backend/src/routes/companies.ts
git commit -m "feat: query companies from supabase"
```

---

## Task A4: GET /api/companies/:id

**Files:**
- Modify: `backend/src/routes/companies.ts`

**Step 1: Write failing test**
```bash
curl http://localhost:3001/api/companies/test-id
```

**Step 2: Run test - verify it fails**
```
Expected: 404 (route doesn't exist)
```

**Step 3: Minimal implementation**
```typescript
// Add to backend/src/routes/companies.ts:
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Step 4: Run test - verify it passes**
```bash
curl http://localhost:3001/api/companies/test-id
# Expected: 404 with error message (no company with that ID)
```

**Step 5: Commit**
```bash
git add backend/src/routes/companies.ts
git commit -m "feat: add company by ID endpoint"
```

---

## Task A5: Companies filter by type

**Files:**
- Modify: `backend/src/routes/companies.ts`

**Step 1: Write failing test**
```bash
curl "http://localhost:3001/api/companies?type=foundry"
```

**Step 2: Run test - verify it fails**
```
# Returns all companies, not filtered
```

**Step 3: Minimal implementation**
```typescript
// Modify GET / route:
router.get('/', async (req, res) => {
  try {
    const { type, country } = req.query;

    let query = supabase.from('companies').select('*');

    if (type) {
      query = query.eq('type', type);
    }

    if (country) {
      query = query.eq('country', country);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Step 4: Run test - verify it passes**
```bash
curl "http://localhost:3001/api/companies?type=foundry"
# Expected: Filtered array
```

**Step 5: Commit**
```bash
git add backend/src/routes/companies.ts
git commit -m "feat: filter companies by type"
```

---

## Task A6: Suppliers route file

**Files:**
- Create: `backend/src/routes/suppliers.ts`
- Modify: `backend/src/index.ts`

**Step 1: Write failing test**
```bash
curl http://localhost:3001/api/suppliers
```

**Step 2: Run test - verify it fails**
```
Expected: 404 Not Found
```

**Step 3: Minimal implementation**
```typescript
// backend/src/routes/suppliers.ts
import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

```typescript
// backend/src/index.ts - add:
import suppliersRouter from './routes/suppliers';
app.use('/api/suppliers', suppliersRouter);
```

**Step 4: Run test - verify it passes**
```bash
curl http://localhost:3001/api/suppliers
# Expected: []
```

**Step 5: Commit**
```bash
git add backend/src/routes/suppliers.ts backend/src/index.ts
git commit -m "feat: add suppliers endpoint"
```

---

## Task A7: Suppliers filter by company

**Files:**
- Modify: `backend/src/routes/suppliers.ts`

**Step 1: Write failing test**
```bash
curl "http://localhost:3001/api/suppliers?companyId=test-id"
```

**Step 2: Run test - verify it fails**
```
# Returns all suppliers, not filtered
```

**Step 3: Minimal implementation**
```typescript
// Modify GET / route:
router.get('/', async (req, res) => {
  try {
    const { companyId, tier } = req.query;

    let query = supabase.from('suppliers').select('*');

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    if (tier) {
      query = query.eq('tier', tier);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Step 4: Run test - verify it passes**
```bash
curl "http://localhost:3001/api/suppliers?companyId=test-id"
# Expected: Filtered array
```

**Step 5: Commit**
```bash
git add backend/src/routes/suppliers.ts
git commit -m "feat: filter suppliers by company"
```

---

## Task A8: GET /api/suppliers/:id

**Files:**
- Modify: `backend/src/routes/suppliers.ts`

**Step 1: Write failing test**
```bash
curl http://localhost:3001/api/suppliers/test-id
```

**Step 2: Run test - verify it fails**
```
Expected: 404
```

**Step 3: Minimal implementation**
```typescript
// Add to backend/src/routes/suppliers.ts:
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Step 4: Run test - verify it passes**
```bash
curl http://localhost:3001/api/suppliers/test-id
# Expected: 404 with error message
```

**Step 5: Commit**
```bash
git add backend/src/routes/suppliers.ts
git commit -m "feat: add supplier by ID endpoint"
```

---

## Task A9: Connections route file

**Files:**
- Create: `backend/src/routes/connections.ts`
- Modify: `backend/src/index.ts`

**Step 1: Write failing test**
```bash
curl http://localhost:3001/api/connections
```

**Step 2: Run test - verify it fails**
```
Expected: 404
```

**Step 3: Minimal implementation**
```typescript
// backend/src/routes/connections.ts
import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('connections')
      .select('*');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

```typescript
// backend/src/index.ts - add:
import connectionsRouter from './routes/connections';
app.use('/api/connections', connectionsRouter);
```

**Step 4: Run test - verify it passes**
```bash
curl http://localhost:3001/api/connections
# Expected: []
```

**Step 5: Commit**
```bash
git add backend/src/routes/connections.ts backend/src/index.ts
git commit -m "feat: add connections endpoint"
```

---

## Task A10: Connections filter by status

**Files:**
- Modify: `backend/src/routes/connections.ts`

**Step 1: Write failing test**
```bash
curl "http://localhost:3001/api/connections?status=at-risk"
```

**Step 2: Run test - verify it fails**
```
# Returns all connections
```

**Step 3: Minimal implementation**
```typescript
// Modify GET / route:
router.get('/', async (req, res) => {
  try {
    const { status, fromNodeId, toNodeId, isUserConnection } = req.query;

    let query = supabase.from('connections').select('*');

    if (status) {
      query = query.eq('status', status);
    }

    if (fromNodeId) {
      query = query.eq('from_node_id', fromNodeId);
    }

    if (toNodeId) {
      query = query.eq('to_node_id', toNodeId);
    }

    if (isUserConnection !== undefined) {
      query = query.eq('is_user_connection', isUserConnection === 'true');
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Step 4: Run test - verify it passes**
```bash
curl "http://localhost:3001/api/connections?status=at-risk"
# Expected: Filtered array
```

**Step 5: Commit**
```bash
git add backend/src/routes/connections.ts
git commit -m "feat: filter connections by status"
```

---

## Task A11: Events route file

**Files:**
- Create: `backend/src/routes/events.ts`
- Modify: `backend/src/index.ts`

**Step 1: Write failing test**
```bash
curl http://localhost:3001/api/events
```

**Step 2: Run test - verify it fails**
```
Expected: 404
```

**Step 3: Minimal implementation**
```typescript
// backend/src/routes/events.ts
import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

```typescript
// backend/src/index.ts - add:
import eventsRouter from './routes/events';
app.use('/api/events', eventsRouter);
```

**Step 4: Run test - verify it passes**
```bash
curl http://localhost:3001/api/events
# Expected: []
```

**Step 5: Commit**
```bash
git add backend/src/routes/events.ts backend/src/index.ts
git commit -m "feat: add events endpoint"
```

---

## Task A12: Events filter by type

**Files:**
- Modify: `backend/src/routes/events.ts`

**Step 1: Write failing test**
```bash
curl "http://localhost:3001/api/events?type=natural_disaster"
```

**Step 2: Run test - verify it fails**
```
# Returns all events
```

**Step 3: Minimal implementation**
```typescript
// Modify GET / route:
router.get('/', async (req, res) => {
  try {
    const { type, severity, active } = req.query;

    let query = supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    if (severity) {
      query = query.gte('severity', parseInt(severity as string));
    }

    if (active === 'true') {
      query = query.is('end_date', null);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Step 4: Run test - verify it passes**
```bash
curl "http://localhost:3001/api/events?type=natural_disaster"
# Expected: Filtered array
```

**Step 5: Commit**
```bash
git add backend/src/routes/events.ts
git commit -m "feat: filter events by type"
```

---

## Task A13: Events filter by region (bounding box)

**Files:**
- Modify: `backend/src/routes/events.ts`

**Step 1: Write failing test**
```bash
curl "http://localhost:3001/api/events?minLat=20&maxLat=30&minLng=100&maxLng=130"
```

**Step 2: Run test - verify it fails**
```
# Returns all events, not filtered by location
```

**Step 3: Minimal implementation**
```typescript
// Modify GET / route to add bounding box filter:
router.get('/', async (req, res) => {
  try {
    const { type, severity, active, minLat, maxLat, minLng, maxLng } = req.query;

    let query = supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    if (severity) {
      query = query.gte('severity', parseInt(severity as string));
    }

    if (active === 'true') {
      query = query.is('end_date', null);
    }

    // Bounding box filter (assuming location stored as lat/lng columns)
    if (minLat && maxLat && minLng && maxLng) {
      query = query
        .gte('lat', parseFloat(minLat as string))
        .lte('lat', parseFloat(maxLat as string))
        .gte('lng', parseFloat(minLng as string))
        .lte('lng', parseFloat(maxLng as string));
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Step 4: Run test - verify it passes**
```bash
curl "http://localhost:3001/api/events?minLat=20&maxLat=30&minLng=100&maxLng=130"
# Expected: Events within bounding box
```

**Step 5: Commit**
```bash
git add backend/src/routes/events.ts
git commit -m "feat: filter events by region"
```

---

## Task A14: GET /api/events/:id

**Files:**
- Modify: `backend/src/routes/events.ts`

**Step 1: Write failing test**
```bash
curl http://localhost:3001/api/events/test-id
```

**Step 2: Run test - verify it fails**
```
Expected: 404
```

**Step 3: Minimal implementation**
```typescript
// Add to backend/src/routes/events.ts:
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Step 4: Run test - verify it passes**
```bash
curl http://localhost:3001/api/events/test-id
# Expected: 404 with error message
```

**Step 5: Commit**
```bash
git add backend/src/routes/events.ts
git commit -m "feat: add event by ID endpoint"
```

---

## Task A15: Tariffs route file

**Files:**
- Create: `backend/src/routes/tariffs.ts`
- Modify: `backend/src/index.ts`

**Step 1: Write failing test**
```bash
curl http://localhost:3001/api/tariffs
```

**Step 2: Run test - verify it fails**
```
Expected: 404
```

**Step 3: Minimal implementation**
```typescript
// backend/src/routes/tariffs.ts
import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tariffs')
      .select('*');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

```typescript
// backend/src/index.ts - add:
import tariffsRouter from './routes/tariffs';
app.use('/api/tariffs', tariffsRouter);
```

**Step 4: Run test - verify it passes**
```bash
curl http://localhost:3001/api/tariffs
# Expected: []
```

**Step 5: Commit**
```bash
git add backend/src/routes/tariffs.ts backend/src/index.ts
git commit -m "feat: add tariffs endpoint"
```

---

## Task A16: Tariffs filter by country pair

**Files:**
- Modify: `backend/src/routes/tariffs.ts`

**Step 1: Write failing test**
```bash
curl "http://localhost:3001/api/tariffs?fromCountry=CN&toCountry=US"
```

**Step 2: Run test - verify it fails**
```
# Returns all tariffs
```

**Step 3: Minimal implementation**
```typescript
// Modify GET / route:
router.get('/', async (req, res) => {
  try {
    const { fromCountry, toCountry, productCategory } = req.query;

    let query = supabase.from('tariffs').select('*');

    if (fromCountry) {
      query = query.eq('from_country', fromCountry);
    }

    if (toCountry) {
      query = query.eq('to_country', toCountry);
    }

    if (productCategory) {
      query = query.eq('product_category', productCategory);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Step 4: Run test - verify it passes**
```bash
curl "http://localhost:3001/api/tariffs?fromCountry=CN&toCountry=US"
# Expected: Filtered array
```

**Step 5: Commit**
```bash
git add backend/src/routes/tariffs.ts
git commit -m "feat: filter tariffs by countries"
```

---

## Task A17: News route file

**Files:**
- Create: `backend/src/routes/news.ts`
- Modify: `backend/src/index.ts`

**Step 1: Write failing test**
```bash
curl http://localhost:3001/api/news
```

**Step 2: Run test - verify it fails**
```
Expected: 404
```

**Step 3: Minimal implementation**
```typescript
// backend/src/routes/news.ts
import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { limit = 50, category } = req.query;

    let query = supabase
      .from('news')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

```typescript
// backend/src/index.ts - add:
import newsRouter from './routes/news';
app.use('/api/news', newsRouter);
```

**Step 4: Run test - verify it passes**
```bash
curl http://localhost:3001/api/news
# Expected: []
```

**Step 5: Commit**
```bash
git add backend/src/routes/news.ts backend/src/index.ts
git commit -m "feat: add news endpoint"
```

---

## Task A18: User supply chain route file

**Files:**
- Create: `backend/src/routes/user-supply-chain.ts`
- Modify: `backend/src/index.ts`

**Step 1: Write failing test**
```bash
curl http://localhost:3001/api/user-supply-chain
```

**Step 2: Run test - verify it fails**
```
Expected: 404
```

**Step 3: Minimal implementation**
```typescript
// backend/src/routes/user-supply-chain.ts
import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_supply_chains')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      return res.status(500).json({ error: error.message });
    }

    res.json(data || null);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

```typescript
// backend/src/index.ts - add:
import userSupplyChainRouter from './routes/user-supply-chain';
app.use('/api/user-supply-chain', userSupplyChainRouter);
```

**Step 4: Run test - verify it passes**
```bash
curl http://localhost:3001/api/user-supply-chain
# Expected: null (no data yet)
```

**Step 5: Commit**
```bash
git add backend/src/routes/user-supply-chain.ts backend/src/index.ts
git commit -m "feat: add user supply chain endpoint"
```

---

## Task A19: POST /api/user-supply-chain

**Files:**
- Modify: `backend/src/routes/user-supply-chain.ts`

**Step 1: Write failing test**
```bash
curl -X POST http://localhost:3001/api/user-supply-chain \
  -H "Content-Type: application/json" \
  -d '{"company": {"name": "Test"}, "suppliers": []}'
```

**Step 2: Run test - verify it fails**
```
Expected: 404 or error (POST not implemented)
```

**Step 3: Minimal implementation**
```typescript
// Add to backend/src/routes/user-supply-chain.ts:
router.post('/', async (req, res) => {
  try {
    const { company, suppliers, materials, connections } = req.body;

    // Validate required fields
    if (!company || !company.name) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    // Delete existing user supply chain (single user system)
    await supabase.from('user_supply_chains').delete().neq('id', '');

    // Insert new supply chain
    const { data, error } = await supabase
      .from('user_supply_chains')
      .insert({
        company_name: company.name,
        company_city: company.location?.city,
        company_country: company.location?.country,
        suppliers: suppliers || [],
        materials: materials || [],
        connections: connections || [],
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ success: true, id: data.id });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Step 4: Run test - verify it passes**
```bash
curl -X POST http://localhost:3001/api/user-supply-chain \
  -H "Content-Type: application/json" \
  -d '{"company": {"name": "Test"}, "suppliers": []}'
# Expected: {"success": true, "id": "..."}
```

**Step 5: Commit**
```bash
git add backend/src/routes/user-supply-chain.ts
git commit -m "feat: add user supply chain POST endpoint"
```

---

## Task A20: PUT /api/user-supply-chain

**Files:**
- Modify: `backend/src/routes/user-supply-chain.ts`

**Step 1: Write failing test**
```bash
curl -X PUT http://localhost:3001/api/user-supply-chain \
  -H "Content-Type: application/json" \
  -d '{"company": {"name": "Updated"}, "suppliers": []}'
```

**Step 2: Run test - verify it fails**
```
Expected: 404 (PUT not implemented)
```

**Step 3: Minimal implementation**
```typescript
// Add to backend/src/routes/user-supply-chain.ts:
router.put('/', async (req, res) => {
  try {
    const { company, suppliers, materials, connections } = req.body;

    // Get existing record
    const { data: existing } = await supabase
      .from('user_supply_chains')
      .select('id')
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'No supply chain found. Use POST to create.' });
    }

    // Update
    const { data, error } = await supabase
      .from('user_supply_chains')
      .update({
        company_name: company?.name,
        company_city: company?.location?.city,
        company_country: company?.location?.country,
        suppliers: suppliers,
        materials: materials,
        connections: connections,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Step 4: Run test - verify it passes**
```bash
curl -X PUT http://localhost:3001/api/user-supply-chain \
  -H "Content-Type: application/json" \
  -d '{"company": {"name": "Updated"}, "suppliers": []}'
# Expected: {"success": true, "data": {...}}
```

**Step 5: Commit**
```bash
git add backend/src/routes/user-supply-chain.ts
git commit -m "feat: add user supply chain PUT endpoint"
```

---

## Task A21: DELETE /api/user-supply-chain

**Files:**
- Modify: `backend/src/routes/user-supply-chain.ts`

**Step 1: Write failing test**
```bash
curl -X DELETE http://localhost:3001/api/user-supply-chain
```

**Step 2: Run test - verify it fails**
```
Expected: 404 (DELETE not implemented)
```

**Step 3: Minimal implementation**
```typescript
// Add to backend/src/routes/user-supply-chain.ts:
router.delete('/', async (req, res) => {
  try {
    const { error } = await supabase
      .from('user_supply_chains')
      .delete()
      .neq('id', '');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: 'Supply chain deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Step 4: Run test - verify it passes**
```bash
curl -X DELETE http://localhost:3001/api/user-supply-chain
# Expected: {"success": true, "message": "Supply chain deleted"}
```

**Step 5: Commit**
```bash
git add backend/src/routes/user-supply-chain.ts
git commit -m "feat: add user supply chain DELETE endpoint"
```

---

## Task A22: Alternatives route file

**Files:**
- Create: `backend/src/routes/alternatives.ts`
- Modify: `backend/src/index.ts`

**Step 1: Write failing test**
```bash
curl "http://localhost:3001/api/alternatives?material=chips"
```

**Step 2: Run test - verify it fails**
```
Expected: 404
```

**Step 3: Minimal implementation**
```typescript
// backend/src/routes/alternatives.ts
import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { material, excludeCountry, excludeRegion } = req.query;

    if (!material) {
      return res.status(400).json({ error: 'Material parameter is required' });
    }

    let query = supabase
      .from('companies')
      .select('*')
      .contains('products', [material]);

    if (excludeCountry) {
      query = query.neq('country', excludeCountry);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

```typescript
// backend/src/index.ts - add:
import alternativesRouter from './routes/alternatives';
app.use('/api/alternatives', alternativesRouter);
```

**Step 4: Run test - verify it passes**
```bash
curl "http://localhost:3001/api/alternatives?material=chips"
# Expected: Array of alternative suppliers
```

**Step 5: Commit**
```bash
git add backend/src/routes/alternatives.ts backend/src/index.ts
git commit -m "feat: add alternatives endpoint"
```

---

## Task A23-A29: Validation and Error Handling

**Files:**
- Create: `backend/src/middleware/errorHandler.ts`
- Modify: `backend/src/index.ts`

**Step 1: Write failing test**
```bash
# Test error handling for invalid requests
curl -X POST http://localhost:3001/api/user-supply-chain \
  -H "Content-Type: application/json" \
  -d 'invalid json'
```

**Step 2: Run test - verify it fails**
```
Expected: Crashes or returns unparseable error
```

**Step 3: Minimal implementation**
```typescript
// backend/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err.message);

  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  res.status(500).json({ error: 'Internal server error' });
}
```

```typescript
// backend/src/index.ts - add at end:
import { errorHandler } from './middleware/errorHandler';
app.use(errorHandler);
```

**Step 4: Run test - verify it passes**
```bash
curl -X POST http://localhost:3001/api/user-supply-chain \
  -H "Content-Type: application/json" \
  -d 'invalid json'
# Expected: {"error": "Invalid JSON"}
```

**Step 5: Commit**
```bash
git add backend/src/middleware/errorHandler.ts backend/src/index.ts
git commit -m "feat: add error handling middleware"
```

---

## Verification Checklist

Before considering this workstream complete:

- [ ] `GET /api/companies` returns array
- [ ] `GET /api/companies/:id` returns company or 404
- [ ] `GET /api/companies?type=foundry` filters correctly
- [ ] `GET /api/suppliers` returns array
- [ ] `GET /api/suppliers?companyId=x` filters correctly
- [ ] `GET /api/connections` returns array
- [ ] `GET /api/connections?status=at-risk` filters correctly
- [ ] `GET /api/events` returns array
- [ ] `GET /api/events?type=natural_disaster` filters correctly
- [ ] `GET /api/tariffs` returns array
- [ ] `GET /api/tariffs?fromCountry=CN&toCountry=US` filters correctly
- [ ] `GET /api/news` returns array
- [ ] `GET /api/user-supply-chain` returns data or null
- [ ] `POST /api/user-supply-chain` creates supply chain
- [ ] `PUT /api/user-supply-chain` updates supply chain
- [ ] `DELETE /api/user-supply-chain` deletes supply chain
- [ ] `GET /api/alternatives?material=x` returns alternatives
- [ ] Error handling returns JSON errors
- [ ] Server starts: `cd backend && npm run dev`

---

## Dependencies

This workstream can run in parallel with:
- Phase 1 Map Visualization
- Phase 1 UI Components
- Phase 1 External Data Integration
- Phase 1 Data Seeding

No cross-dependencies within Phase 1.
