# Sentinel-Zero Phase 0: Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up the foundational project structure, tooling, and shared types for the Sentinel-Zero geopolitical trade shock predictor.

**Architecture:** React + TypeScript frontend with Vite, Node.js + Express + TypeScript backend, Supabase for database, shared types package for consistency across stack.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Express.js, Supabase, ESLint, Prettier

---

## Task 1: Initialize React TypeScript Project

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/src/main.tsx`

**Step 1: Write the failing test**

```bash
ls frontend/package.json
```

**Step 2: Run test to verify it fails**

Run: `ls frontend/package.json`
Expected: `ls: frontend/package.json: No such file or directory`

**Step 3: Write minimal implementation**

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run build`
Expected: Build completes successfully with exit code 0

**Step 5: Commit**

```bash
git add frontend/
git commit -m "chore: init react typescript project"
```

---

## Task 2: Enable TypeScript Strict Mode

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `frontend/tsconfig.json`

**Step 1: Write the failing test**

Create `frontend/src/test-strict.ts`:
```typescript
const fn = (a) => a;  // Should error: Parameter 'a' implicitly has 'any' type
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx tsc --noEmit`
Expected: PASS (no error yet because strict mode is off)

**Step 3: Write minimal implementation**

Edit `frontend/tsconfig.json` to ensure strict is true:
```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx tsc --noEmit`
Expected: Error `Parameter 'a' implicitly has an 'any' type.`

Then clean up:
```bash
rm frontend/src/test-strict.ts
```

**Step 5: Commit**

```bash
git add frontend/tsconfig.json
git commit -m "chore: enable typescript strict mode"
```

---

## Task 3: Install and Configure Tailwind CSS

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Modify: `frontend/src/index.css`

**Step 1: Write the failing test**

Edit `frontend/src/App.tsx` to add:
```tsx
<div className="bg-slate-900 text-white p-4">Tailwind Test</div>
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run dev`
Expected: The div has NO dark background (class not recognized)

**Step 3: Write minimal implementation**

```bash
cd frontend && npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Edit `frontend/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Edit `frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: The div has dark slate-900 background

**Step 5: Commit**

```bash
git add frontend/
git commit -m "chore: add tailwind css"
```

---

## Task 4: Apply Dark Theme Base Styles

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/src/index.css`

**Step 1: Write the failing test**

Check body background color in browser dev tools.

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run dev`
Expected: Body has white/default background

**Step 3: Write minimal implementation**

Edit `frontend/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0D0D0D',
        'bg-secondary': '#1A1A1A',
        'bg-tertiary': '#262626',
        'border-color': '#333333',
        'text-primary': '#E0E0E0',
        'text-secondary': '#808080',
        'accent-cyan': '#00FFFF',
        'accent-orange': '#FF6600',
        'accent-red': '#FF0000',
        'accent-green': '#00FF00',
        'accent-amber': '#FFCC00',
        'accent-purple': '#9900FF',
      },
    },
  },
  plugins: [],
}
```

Edit `frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-bg-primary text-text-primary m-0 p-0;
  font-family: 'Inter', system-ui, sans-serif;
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run dev`
Expected: Body has #0D0D0D (near black) background

**Step 5: Commit**

```bash
git add frontend/
git commit -m "style: add dark theme base"
```

---

## Task 5: Configure ESLint

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `frontend/eslint.config.js`
- Modify: `frontend/package.json`

**Step 1: Write the failing test**

```bash
cd frontend && npm run lint
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run lint`
Expected: Script "lint" not found or ESLint not configured

**Step 3: Write minimal implementation**

```bash
cd frontend && npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react-hooks eslint-plugin-react-refresh
```

Vite already creates `eslint.config.js`. Verify `package.json` has:
```json
{
  "scripts": {
    "lint": "eslint ."
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run lint`
Expected: Lint runs (may have warnings, but no crash)

**Step 5: Commit**

```bash
git add frontend/
git commit -m "chore: configure eslint"
```

---

## Task 6: Configure Prettier

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `frontend/.prettierrc`
- Modify: `frontend/package.json`

**Step 1: Write the failing test**

```bash
cd frontend && npx prettier --check src/
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx prettier --check src/`
Expected: Prettier not installed or files not formatted

**Step 3: Write minimal implementation**

```bash
cd frontend && npm install -D prettier
```

Create `frontend/.prettierrc`:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

Add to `frontend/package.json` scripts:
```json
{
  "scripts": {
    "format": "prettier --write src/"
  }
}
```

Run formatter:
```bash
cd frontend && npm run format
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx prettier --check src/`
Expected: All files formatted correctly

**Step 5: Commit**

```bash
git add frontend/
git commit -m "chore: add prettier"
```

---

## Task 7: Initialize Backend Project

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `backend/package.json`
- Create: `backend/src/`

**Step 1: Write the failing test**

```bash
ls backend/package.json
```

**Step 2: Run test to verify it fails**

Run: `ls backend/package.json`
Expected: `ls: backend/package.json: No such file or directory`

**Step 3: Write minimal implementation**

```bash
mkdir -p backend/src
cd backend && npm init -y
```

**Step 4: Run test to verify it passes**

Run: `ls backend/package.json`
Expected: File exists

**Step 5: Commit**

```bash
git add backend/
git commit -m "chore: init backend project"
```

---

## Task 8: Install Express

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `backend/package.json`

**Step 1: Write the failing test**

```bash
cd backend && node -e "require('express')"
```

**Step 2: Run test to verify it fails**

Run: `cd backend && node -e "require('express')"`
Expected: `Error: Cannot find module 'express'`

**Step 3: Write minimal implementation**

```bash
cd backend && npm install express
```

**Step 4: Run test to verify it passes**

Run: `cd backend && node -e "require('express')"`
Expected: No error, exits cleanly

**Step 5: Commit**

```bash
git add backend/
git commit -m "chore: add express"
```

---

## Task 9: Add TypeScript to Backend

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `backend/tsconfig.json`
- Modify: `backend/package.json`

**Step 1: Write the failing test**

```bash
cd backend && npx tsc --version
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx tsc --version`
Expected: TypeScript not found

**Step 3: Write minimal implementation**

```bash
cd backend && npm install -D typescript ts-node @types/node @types/express
```

Create `backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx tsc --version`
Expected: `Version 5.x.x`

**Step 5: Commit**

```bash
git add backend/
git commit -m "chore: add typescript to backend"
```

---

## Task 10: Create Express Server That Starts

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `backend/src/index.ts`
- Modify: `backend/package.json`

**Step 1: Write the failing test**

```bash
curl http://localhost:3001
```

**Step 2: Run test to verify it fails**

Run: `curl http://localhost:3001`
Expected: `curl: (7) Failed to connect to localhost port 3001: Connection refused`

**Step 3: Write minimal implementation**

Create `backend/src/index.ts`:
```typescript
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

Add to `backend/package.json` scripts:
```json
{
  "scripts": {
    "dev": "npx ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

**Step 4: Run test to verify it passes**

Run in one terminal: `cd backend && npm run dev`
Run in another: `curl http://localhost:3001`
Expected: Server responds (even 404 is fine - server is running)

**Step 5: Commit**

```bash
git add backend/
git commit -m "feat: server starts on port 3001"
```

---

## Task 11: Add Health Endpoint

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `backend/src/index.ts`

**Step 1: Write the failing test**

```bash
curl http://localhost:3001/health
```

**Step 2: Run test to verify it fails**

Run: `curl http://localhost:3001/health`
Expected: `Cannot GET /health` or 404

**Step 3: Write minimal implementation**

Edit `backend/src/index.ts`:
```typescript
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Step 4: Run test to verify it passes**

Run: `curl http://localhost:3001/health`
Expected: `{"status":"ok"}`

**Step 5: Commit**

```bash
git add backend/
git commit -m "feat: add health endpoint"
```

---

## Task 12: Enable CORS

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `backend/src/index.ts`
- Modify: `backend/package.json`

**Step 1: Write the failing test**

From browser console on frontend (localhost:5173), run:
```javascript
fetch('http://localhost:3001/health').then(r => r.json()).then(console.log)
```

**Step 2: Run test to verify it fails**

Expected: CORS policy error in browser console

**Step 3: Write minimal implementation**

```bash
cd backend && npm install cors
npm install -D @types/cors
```

Edit `backend/src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Step 4: Run test to verify it passes**

From browser console on frontend, same fetch succeeds without CORS error.

**Step 5: Commit**

```bash
git add backend/
git commit -m "feat: enable cors"
```

---

## Task 13: Add Supabase Client to Backend

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `backend/src/lib/supabase.ts`
- Create: `backend/.env.example`

**Step 1: Write the failing test**

```typescript
import { supabase } from './lib/supabase';
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx ts-node -e "import { supabase } from './src/lib/supabase'"`
Expected: Cannot find module

**Step 3: Write minimal implementation**

```bash
cd backend && npm install @supabase/supabase-js dotenv
```

Create `backend/.env.example`:
```
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Create `backend/.env` (copy from .env.example and fill in real values)

Create `backend/src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
```

Add to `backend/.gitignore`:
```
.env
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx ts-node -e "import { supabase } from './src/lib/supabase'; console.log('Supabase client created')"`
Expected: `Supabase client created`

**Step 5: Commit**

```bash
git add backend/src/lib/supabase.ts backend/.env.example backend/.gitignore
git commit -m "feat: add supabase client"
```

---

## Task 14: Verify Supabase Connection in Health Endpoint

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Modify: `backend/src/index.ts`

**Step 1: Write the failing test**

```bash
curl http://localhost:3001/health
```

**Step 2: Run test to verify it fails**

Run: `curl http://localhost:3001/health`
Expected: Response lacks `db` field

**Step 3: Write minimal implementation**

Edit `backend/src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import { supabase } from './lib/supabase';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    // Simple query to verify connection
    const { error } = await supabase.from('_health_check').select('*').limit(1);
    res.json({
      status: 'ok',
      db: error ? 'disconnected' : 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.json({
      status: 'ok',
      db: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Step 4: Run test to verify it passes**

Run: `curl http://localhost:3001/health`
Expected: `{"status":"ok","db":"connected","timestamp":"..."}`

**Step 5: Commit**

```bash
git add backend/
git commit -m "feat: verify supabase connection in health"
```

---

## Task 15: Add Supabase Client to Frontend

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `frontend/src/lib/supabase.ts`
- Create: `frontend/.env.example`

**Step 1: Write the failing test**

```typescript
import { supabase } from './lib/supabase';
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npm run build`
Expected: Cannot find module './lib/supabase'

**Step 3: Write minimal implementation**

```bash
cd frontend && npm install @supabase/supabase-js
```

Create `frontend/.env.example`:
```
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Create `frontend/.env` (copy from .env.example and fill in real values)

Create `frontend/src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

Add to `frontend/.gitignore`:
```
.env
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npm run build`
Expected: Build passes

**Step 5: Commit**

```bash
git add frontend/src/lib/supabase.ts frontend/.env.example frontend/.gitignore
git commit -m "feat: add supabase to frontend"
```

---

## Task 16: Create Shared Types Package

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `shared/package.json`
- Create: `shared/types/index.ts`

**Step 1: Write the failing test**

```bash
ls shared/types/index.ts
```

**Step 2: Run test to verify it fails**

Run: `ls shared/types/index.ts`
Expected: No such file or directory

**Step 3: Write minimal implementation**

```bash
mkdir -p shared/types
cd shared && npm init -y
```

Create `shared/types/index.ts`:
```typescript
// Shared types for Sentinel-Zero
export {};
```

**Step 4: Run test to verify it passes**

Run: `ls shared/types/index.ts`
Expected: File exists

**Step 5: Commit**

```bash
git add shared/
git commit -m "chore: create shared types package"
```

---

## Task 17: Add GeoPoint Type

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `shared/types/geo.ts`
- Modify: `shared/types/index.ts`

**Step 1: Write the failing test**

```typescript
import { GeoPoint } from './geo';
const p: GeoPoint = { lat: 0, lng: 0 };
```

**Step 2: Run test to verify it fails**

Expected: Cannot find module './geo'

**Step 3: Write minimal implementation**

Create `shared/types/geo.ts`:
```typescript
export interface GeoPoint {
  lat: number;
  lng: number;
}
```

Update `shared/types/index.ts`:
```typescript
export * from './geo';
```

**Step 4: Run test to verify it passes**

Types compile without error.

**Step 5: Commit**

```bash
git add shared/
git commit -m "feat: add GeoPoint type"
```

---

## Task 18: Add Company Type

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `shared/types/company.ts`
- Modify: `shared/types/index.ts`

**Step 1: Write the failing test**

```typescript
import { Company } from './company';
```

**Step 2: Run test to verify it fails**

Expected: Cannot find module './company'

**Step 3: Write minimal implementation**

Create `shared/types/company.ts`:
```typescript
import { GeoPoint } from './geo';

export type CompanyType =
  | 'foundry'
  | 'idm'
  | 'fabless'
  | 'equipment'
  | 'materials'
  | 'ems'
  | 'port'
  | 'airport'
  | 'distribution';

export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  location: GeoPoint;
  city: string;
  country: string;
  industry: string;
  products?: string[];
}
```

Update `shared/types/index.ts`:
```typescript
export * from './geo';
export * from './company';
```

**Step 4: Run test to verify it passes**

Types compile without error.

**Step 5: Commit**

```bash
git add shared/
git commit -m "feat: add Company type"
```

---

## Task 19: Add Supplier Type

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `shared/types/supplier.ts`
- Modify: `shared/types/index.ts`

**Step 1: Write the failing test**

```typescript
import { Supplier } from './supplier';
```

**Step 2: Run test to verify it fails**

Expected: Cannot find module './supplier'

**Step 3: Write minimal implementation**

Create `shared/types/supplier.ts`:
```typescript
import { GeoPoint } from './geo';

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  location: GeoPoint;
  tier: 1 | 2 | 3;
  materials: string[];
}
```

Update `shared/types/index.ts`:
```typescript
export * from './geo';
export * from './company';
export * from './supplier';
```

**Step 4: Run test to verify it passes**

Types compile without error.

**Step 5: Commit**

```bash
git add shared/
git commit -m "feat: add Supplier type"
```

---

## Task 20: Add Material Type

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `shared/types/material.ts`
- Modify: `shared/types/index.ts`

**Step 1: Write the failing test**

```typescript
import { Material } from './material';
```

**Step 2: Run test to verify it fails**

Expected: Cannot find module './material'

**Step 3: Write minimal implementation**

Create `shared/types/material.ts`:
```typescript
export interface Material {
  id: string;
  name: string;
  category: string;
  hsCode?: string;
}
```

Update `shared/types/index.ts`:
```typescript
export * from './geo';
export * from './company';
export * from './supplier';
export * from './material';
```

**Step 4: Run test to verify it passes**

Types compile without error.

**Step 5: Commit**

```bash
git add shared/
git commit -m "feat: add Material type"
```

---

## Task 21: Add Connection Type

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `shared/types/connection.ts`
- Modify: `shared/types/index.ts`

**Step 1: Write the failing test**

```typescript
import { Connection, ConnectionStatus } from './connection';
```

**Step 2: Run test to verify it fails**

Expected: Cannot find module './connection'

**Step 3: Write minimal implementation**

Create `shared/types/connection.ts`:
```typescript
export type ConnectionStatus =
  | 'healthy'
  | 'monitoring'
  | 'at-risk'
  | 'critical'
  | 'disrupted';

export type TransportMode = 'sea' | 'air' | 'land';

export interface Connection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  transportMode: TransportMode;
  status: ConnectionStatus;
  isUserConnection: boolean;
  materials?: string[];
}
```

Update `shared/types/index.ts`:
```typescript
export * from './geo';
export * from './company';
export * from './supplier';
export * from './material';
export * from './connection';
```

**Step 4: Run test to verify it passes**

Types compile without error.

**Step 5: Commit**

```bash
git add shared/
git commit -m "feat: add Connection type"
```

---

## Task 22: Add Event Type

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `shared/types/event.ts`
- Modify: `shared/types/index.ts`

**Step 1: Write the failing test**

```typescript
import { Event, EventType } from './event';
```

**Step 2: Run test to verify it fails**

Expected: Cannot find module './event'

**Step 3: Write minimal implementation**

Create `shared/types/event.ts`:
```typescript
import { GeoPoint } from './geo';

export type EventType =
  | 'natural_disaster'
  | 'weather'
  | 'war'
  | 'geopolitical'
  | 'tariff'
  | 'infrastructure';

export interface Event {
  id: string;
  type: EventType;
  title: string;
  description: string;
  location: GeoPoint;
  severity: number; // 1-10
  startDate: string;
  endDate?: string;
  source: string;
  polygon?: GeoPoint[];
}
```

Update `shared/types/index.ts`:
```typescript
export * from './geo';
export * from './company';
export * from './supplier';
export * from './material';
export * from './connection';
export * from './event';
```

**Step 4: Run test to verify it passes**

Types compile without error.

**Step 5: Commit**

```bash
git add shared/
git commit -m "feat: add Event type"
```

---

## Task 23: Add Tariff Type

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `shared/types/tariff.ts`
- Modify: `shared/types/index.ts`

**Step 1: Write the failing test**

```typescript
import { Tariff } from './tariff';
```

**Step 2: Run test to verify it fails**

Expected: Cannot find module './tariff'

**Step 3: Write minimal implementation**

Create `shared/types/tariff.ts`:
```typescript
export interface Tariff {
  id: string;
  fromCountry: string;
  toCountry: string;
  productCategory: string;
  hsCodes: string[];
  rate: number;
  effectiveDate: string;
  description: string;
  sourceUrl?: string;
}
```

Update `shared/types/index.ts`:
```typescript
export * from './geo';
export * from './company';
export * from './supplier';
export * from './material';
export * from './connection';
export * from './event';
export * from './tariff';
```

**Step 4: Run test to verify it passes**

Types compile without error.

**Step 5: Commit**

```bash
git add shared/
git commit -m "feat: add Tariff type"
```

---

## Task 24: Add NewsItem Type

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `shared/types/news.ts`
- Modify: `shared/types/index.ts`

**Step 1: Write the failing test**

```typescript
import { NewsItem } from './news';
```

**Step 2: Run test to verify it fails**

Expected: Cannot find module './news'

**Step 3: Write minimal implementation**

Create `shared/types/news.ts`:
```typescript
export type NewsCategory =
  | 'geopolitical'
  | 'disaster'
  | 'trade'
  | 'industry'
  | 'infrastructure';

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  category: NewsCategory;
}
```

Update `shared/types/index.ts`:
```typescript
export * from './geo';
export * from './company';
export * from './supplier';
export * from './material';
export * from './connection';
export * from './event';
export * from './tariff';
export * from './news';
```

**Step 4: Run test to verify it passes**

Types compile without error.

**Step 5: Commit**

```bash
git add shared/
git commit -m "feat: add NewsItem type"
```

---

## Task 25: Add UserSupplyChain Type

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `shared/types/user-supply-chain.ts`
- Modify: `shared/types/index.ts`

**Step 1: Write the failing test**

```typescript
import { UserSupplyChain } from './user-supply-chain';
```

**Step 2: Run test to verify it fails**

Expected: Cannot find module './user-supply-chain'

**Step 3: Write minimal implementation**

Create `shared/types/user-supply-chain.ts`:
```typescript
import { GeoPoint } from './geo';
import { Supplier } from './supplier';
import { Material } from './material';
import { Connection } from './connection';

export interface UserCompany {
  name: string;
  location: GeoPoint;
  role: 'designer' | 'manufacturer' | 'assembler' | 'distributor';
}

export interface UserSupplyChain {
  id?: string;
  company: UserCompany;
  suppliers: Supplier[];
  materials: Material[];
  connections: Connection[];
  createdAt?: string;
  updatedAt?: string;
}
```

Update `shared/types/index.ts`:
```typescript
export * from './geo';
export * from './company';
export * from './supplier';
export * from './material';
export * from './connection';
export * from './event';
export * from './tariff';
export * from './news';
export * from './user-supply-chain';
```

**Step 4: Run test to verify it passes**

Types compile without error.

**Step 5: Commit**

```bash
git add shared/
git commit -m "feat: add UserSupplyChain type"
```

---

## Task 26: Add TypeScript Configuration to Shared Package

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Create: `shared/tsconfig.json`

**Step 1: Write the failing test**

```bash
cd shared && npx tsc --noEmit
```

**Step 2: Run test to verify it fails**

Expected: No tsconfig.json found

**Step 3: Write minimal implementation**

```bash
cd shared && npm install -D typescript
```

Create `shared/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "declaration": true,
    "declarationDir": "./dist",
    "outDir": "./dist",
    "rootDir": "./types",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["types/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Run test to verify it passes**

Run: `cd shared && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add shared/
git commit -m "chore: add typescript config to shared"
```

---

## Task 27: Verify All Types Export Correctly

**Step 0: Pull Context7 docs**
```
# Use Context7 to fetch relevant docs for this task
```

**Files:**
- Verify: `shared/types/index.ts`

**Step 1: Write the failing test**

Create a test file `shared/test-exports.ts`:
```typescript
import {
  GeoPoint,
  Company,
  CompanyType,
  Supplier,
  Material,
  Connection,
  ConnectionStatus,
  TransportMode,
  Event,
  EventType,
  Tariff,
  NewsItem,
  NewsCategory,
  UserSupplyChain,
  UserCompany,
} from './types';

// Type assertions to verify all exports work
const point: GeoPoint = { lat: 0, lng: 0 };
const status: ConnectionStatus = 'healthy';
const mode: TransportMode = 'sea';
const eventType: EventType = 'war';
const newsCategory: NewsCategory = 'geopolitical';

console.log('All types exported correctly!');
```

**Step 2: Run test to verify it fails**

Run: `cd shared && npx tsc test-exports.ts --noEmit`
Expected: Any missing exports would cause errors

**Step 3: Write minimal implementation**

If any errors, fix the exports in `shared/types/index.ts`.

**Step 4: Run test to verify it passes**

Run: `cd shared && npx tsc test-exports.ts --noEmit`
Expected: No errors

Clean up:
```bash
rm shared/test-exports.ts
```

**Step 5: Commit**

```bash
git add shared/
git commit -m "feat: verify all types export correctly"
```

---

## Phase 0 Complete

**Summary:** Phase 0 establishes the foundational infrastructure:

- ✅ Frontend: React + TypeScript + Vite + Tailwind (dark theme)
- ✅ Backend: Node.js + Express + TypeScript + Supabase
- ✅ Shared: Complete type definitions for all domain entities
- ✅ Tooling: ESLint, Prettier configured

**Next:** Phase 1 workstreams can now run in parallel:
1. Map Visualization
2. UI Components
3. API Endpoints
4. External Data Integration
5. Data Seeding

---

Plan complete and saved to `docs/plans/2026-01-31-sentinel-zero-phase0.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
