# Risk Agent E2E Tests

Comprehensive Playwright tests for the risk agent feature covering API endpoints, database storage, WebSocket updates, and frontend integration.

## Test Suites

### 1. `risk-api.spec.ts` - API Endpoint Tests
Tests all backend risk API endpoints:
- ✅ GET `/api/risk/summary` - Summary statistics
- ✅ GET `/api/risk/assessments` - List assessments with filters (limit, riskCategory)
- ✅ GET `/api/risk/assessments/:id` - Get specific assessment
- ✅ GET `/api/risk/event/:eventId` - Get assessment for event
- ✅ GET `/api/risk/event/:eventId/alternatives` - Get alternative suppliers/routes
- ✅ GET `/api/risk/affected-entities/:eventId` - Get affected entities
- ✅ Data structure validation (risk categories, severity scores, confidence)
- ✅ Error handling (404s, invalid requests)

### 2. `risk-workflow.spec.ts` - Database & Workflow Tests
Tests complete risk agent workflow with Supabase:
- ✅ End-to-end: Event notification → Risk assessment → Database storage
- ✅ Historical queries for timeline features
- ✅ Risk level change tracking over time
- ✅ Filter by risk category
- ✅ Affected entities storage for node expansion

**Requirements:**
- Supabase credentials configured (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- Existing events in database
- Risk agent service running (optional, tests will skip if not available)

### 3. `risk-websocket.spec.ts` - WebSocket Real-time Updates
Tests WebSocket broadcasting of risk updates:
- ✅ WebSocket connection establishment
- ✅ Receive `risk-updated` events
- ✅ Multiple clients receive same updates (broadcast verification)
- ✅ Payload structure validation

**Requirements:**
- Backend server running on port 3001
- Redis running and connected
- Risk agent service running on port 8000

### 4. `risk-frontend.spec.ts` - Frontend Integration
Tests frontend API client and WebSocket hook:
- ✅ riskApi functions callable from browser
- ✅ WebSocket connection in browser context
- ✅ Risk data persistence for node interactions
- ✅ Affected entities queryable for node expansion
- ✅ API error handling in frontend

## Running Tests

### Prerequisites

1. **Start all services:**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm run dev

   # Terminal 2: Redis
   redis-server

   # Terminal 3: Risk Agent
   cd risk-agent
   source .venv/bin/activate
   python src/main.py

   # Terminal 4: Frontend
   cd frontend
   npm run dev
   ```

2. **Configure environment:**
   ```bash
   # Backend .env
   SUPABASE_URL=your_url
   SUPABASE_SERVICE_ROLE_KEY=your_key
   REDIS_URL=redis://localhost:6379

   # Risk Agent .env
   OPENAI_API_KEY=your_key
   SUPABASE_URL=your_url
   SUPABASE_SERVICE_ROLE_KEY=your_key
   REDIS_URL=redis://localhost:6379

   # Frontend .env
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   VITE_API_URL=http://localhost:3001
   ```

### Run All Tests

```bash
cd frontend
npm run test:e2e
```

### Run Specific Test Suite

```bash
# API tests only (no services required except backend)
npm run test:risk api.spec

# Workflow tests (requires Supabase)
npm run test:risk workflow.spec

# WebSocket tests (requires all services)
npm run test:risk websocket.spec

# Frontend tests
npm run test:risk frontend.spec
```

### Run with UI Mode

```bash
npm run test:e2e:ui
```

### Run in Headed Mode (see browser)

```bash
npm run test:e2e:headed
```

## Test Coverage

### What's Tested

1. **API Endpoints** (100% coverage)
   - All 6 risk endpoints
   - Query filters and pagination
   - Error cases (404s, invalid IDs)
   - Response structure validation

2. **Database Storage**
   - Risk assessments persisted to `risk_assessments` table
   - Proper foreign key relationships with `events` table
   - Timestamps for timeline queries
   - Queryable by event_id, risk_category, date range

3. **Data Structures**
   - RiskAssessment schema validation
   - AffectedEntity structure
   - Alternative suppliers/routes
   - Risk reasoning with summary and factors

4. **Real-time Updates**
   - WebSocket connection
   - risk-updated event broadcasting
   - Multiple client support
   - Payload validation

5. **Frontend Integration**
   - API client functions
   - WebSocket hook
   - Error handling

### What Enables Feature Requirements

✅ **Node Expansion on Click:**
- `affected_entities` field stores impacted nodes/connections
- `/api/risk/affected-entities/:eventId` endpoint
- Each entity has `type`, `id`, `name`, and `distanceKm`
- Frontend can query by clicking on map nodes

✅ **Timeline / Historical Views:**
- Multiple assessments stored per event (no unique constraint)
- `created_at` and `updated_at` timestamps
- Queryable with date filters
- Ordered by most recent first
- Track risk level changes over time

✅ **Real-time Updates:**
- WebSocket broadcasts when new assessments created
- Frontend `useRiskUpdates` hook listens and updates UI
- No polling required

## Troubleshooting

### Tests Skipped
Some tests skip if services aren't running:
- Workflow tests require Supabase credentials
- WebSocket tests require Redis and Risk Agent
- Check console output for skip reasons

### WebSocket Timeout
If WebSocket tests timeout:
1. Verify Risk Agent is running: `curl http://localhost:8000/health`
2. Check Redis connection: Backend `/health` endpoint should show `redis: 'connected'`
3. Check backend logs for event processing

### No Test Data
If tests fail due to missing data:
1. Create test events in database
2. Or trigger event fetcher jobs to populate data
3. Run risk assessment manually: `POST /internal/events/notify/:eventId`

## CI/CD Integration

For automated testing, ensure:
1. All services running before tests
2. Test database with seeded data
3. Environment variables configured
4. Increase timeout for risk agent processing (30s+)

Example CI setup:
```yaml
- name: Start services
  run: |
    docker-compose up -d redis postgres
    npm run dev:backend &
    python risk-agent/src/main.py &
    npm run dev:frontend &

- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true
```
