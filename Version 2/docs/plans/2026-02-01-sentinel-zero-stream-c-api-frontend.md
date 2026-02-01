# Stream C — API + Frontend Rendering

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expose inferred paths via API and render arcs in the frontend with state coloring and alternative hints.

**Architecture:** Add `/api/paths` endpoint to return a path + edges, build a `usePaths` hook, and render path arcs on the map with amber+ alternative hints.

**Tech Stack:** Express, Supabase, React + deck.gl.

---

### Task C1: API endpoint for paths

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

### Task C2: Frontend path rendering

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

### Task C3: Alternative supplier hints on amber+

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
