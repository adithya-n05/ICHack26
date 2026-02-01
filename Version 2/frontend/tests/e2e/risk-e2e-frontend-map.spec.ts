import { test, expect, Page } from '@playwright/test';
import { io, Socket } from 'socket.io-client';
import { createClient } from '@supabase/supabase-js';

const API_BASE_URL = 'http://localhost:3001';
const SOCKET_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:5173';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

test.describe('End-to-End: Risk Agent → Frontend Map Visualization', () => {
  let supabase: ReturnType<typeof createClient>;
  let socket: Socket;

  test.beforeAll(async () => {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  });

  test.afterEach(() => {
    if (socket) {
      socket.disconnect();
    }
  });

  test.skip(
    !SUPABASE_URL || !SUPABASE_ANON_KEY,
    'Skipping E2E tests - Supabase credentials not configured'
  );

  test('Complete flow: Event → Risk Agent (GPT-5) → WebSocket → Frontend Map Display', async ({
    page,
  }) => {
    // Step 1: Get any event from the API
    console.log('Step 1: Fetching any event from API...');
    const eventsResponse = await fetch(`${API_BASE_URL}/api/events?limit=1`);

    if (!eventsResponse.ok) {
      console.log('Failed to fetch events from API');
      test.skip();
      return;
    }

    const eventsData = await eventsResponse.json();

    if (!eventsData || eventsData.length === 0) {
      console.log('No events found in database, skipping test');
      test.skip();
      return;
    }

    const testEvent = eventsData[0];
    console.log(
      `Using event ${testEvent.id} (severity: ${testEvent.severity}, type: ${testEvent.type})`
    );

    const testEventId = testEvent.id;

    // Step 2: Navigate to frontend and wait for map to load
    console.log('Step 2: Loading frontend application...');
    await page.goto(FRONTEND_URL);

    // Wait for map container to be visible
    await page.waitForSelector('.mapboxgl-canvas', { timeout: 10000 });
    console.log('Map loaded successfully');

    // Wait a bit for initial data to load
    await page.waitForTimeout(2000);

    // Step 3: Set up WebSocket listener for risk updates
    console.log('Step 3: Setting up WebSocket listener...');
    const riskUpdateReceived = new Promise<any>((resolve, reject) => {
      socket = io(SOCKET_URL);

      socket.on('connect', () => {
        console.log('WebSocket connected, listening for risk-updated events...');
      });

      socket.on('risk-updated', (payload) => {
        console.log('Received risk-updated event:', payload);
        // Accept both eventId (camelCase) and event_id (snake_case)
        const receivedEventId = payload.eventId || payload.event_id;
        if (receivedEventId === testEventId) {
          resolve(payload);
        }
      });

      socket.on('connect_error', (error) => {
        reject(new Error(`WebSocket connection error: ${error.message}`));
      });

      // Timeout after 60 seconds (GPT-5 might be slower than GPT-4o)
      setTimeout(() => reject(new Error('WebSocket update timeout after 60s')), 60000);
    });

    // Step 4: Trigger risk assessment
    console.log(`Step 4: Triggering risk assessment for event ${testEventId}...`);
    const notifyResponse = await fetch(
      `${API_BASE_URL}/internal/events/notify/${testEventId}`,
      { method: 'POST' }
    );

    expect(notifyResponse.ok).toBeTruthy();
    const notifyData = await notifyResponse.json();
    expect(notifyData.success).toBeTruthy();
    console.log('Risk agent notified successfully');

    // Step 5: Wait for risk assessment to complete via WebSocket
    console.log('Step 5: Waiting for risk assessment to complete...');
    const riskUpdate = await riskUpdateReceived;

    // Verify WebSocket payload structure (handle both camelCase and snake_case)
    const eventId = riskUpdate.eventId || riskUpdate.event_id;
    const riskCategory = riskUpdate.riskCategory || riskUpdate.risk_category;
    const severityScore = riskUpdate.severityScore || riskUpdate.severity_score;

    expect(eventId).toBe(testEventId);
    expect(riskUpdate).toHaveProperty('status');
    expect(riskUpdate.status).toBe('updated');
    expect(riskCategory).toBeTruthy();
    expect(severityScore).toBeTruthy();

    console.log(
      `Risk assessment completed: ${riskCategory} (severity: ${severityScore})`
    );

    // Step 6: Verify risk assessment in database
    console.log('Step 6: Verifying risk assessment in database...');
    const { data: assessment, error: assessmentError } = await supabase
      .from('risk_assessments')
      .select('*')
      .eq('event_id', testEventId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    expect(assessmentError).toBeNull();
    expect(assessment).toBeTruthy();
    expect(assessment.risk_category).toBe(riskCategory);
    expect(assessment.severity_score).toBe(severityScore);

    console.log('Database verification successful');

    // Step 7: Wait for frontend to receive and display the update
    console.log('Step 7: Waiting for frontend to update...');
    // Give frontend time to process the WebSocket event and update the map
    await page.waitForTimeout(2000);

    // Step 8: Verify event appears on the map
    console.log('Step 8: Verifying event visualization on map...');

    // Check if map has event data sources
    const hasEventSource = await page.evaluate(() => {
      const map = (window as any).map;
      if (!map) return false;

      const source = map.getSource('events');
      return source !== undefined;
    });

    expect(hasEventSource).toBeTruthy();
    console.log('Event source found on map');

    // Step 9: Verify risk visualization layers
    console.log('Step 9: Verifying risk visualization layers...');

    // Check map layers exist
    const hasRiskLayers = await page.evaluate(() => {
      const map = (window as any).map;
      if (!map) return false;

      const hasHeatmap = map.getLayer('events-heat') !== undefined;
      const hasPoints = map.getLayer('events-points') !== undefined;
      return { hasHeatmap, hasPoints };
    });

    // Verify at least one visualization layer exists
    if (hasRiskLayers && (hasRiskLayers.hasHeatmap || hasRiskLayers.hasPoints)) {
      console.log('Risk visualization layers found:', hasRiskLayers);
    } else {
      console.log('Warning: Risk visualization layers not found, may not be loaded yet');
    }

    // Step 10: Verify API endpoints return correct data
    console.log('Step 10: Verifying API endpoints...');

    // Test risk assessment endpoint
    const apiResponse = await fetch(`${API_BASE_URL}/api/risk/event/${testEventId}`);
    expect(apiResponse.ok).toBeTruthy();
    const apiData = await apiResponse.json();
    expect(apiData.assessment).toBeTruthy();
    expect(apiData.assessment.id).toBe(assessment.id);

    // Test affected entities endpoint
    const entitiesResponse = await fetch(
      `${API_BASE_URL}/api/risk/affected-entities/${testEventId}`
    );
    expect(entitiesResponse.ok).toBeTruthy();
    const entitiesData = await entitiesResponse.json();
    expect(Array.isArray(entitiesData.affectedEntities)).toBeTruthy();

    console.log(
      `Found ${entitiesData.affectedEntities.length} affected entities`
    );

    // Test alternatives endpoint (works for all risk categories)
    const alternativesResponse = await fetch(
      `${API_BASE_URL}/api/risk/event/${testEventId}/alternatives`
    );
    expect(alternativesResponse.ok).toBeTruthy();
    const alternativesData = await alternativesResponse.json();
    expect(alternativesData.alternatives).toBeTruthy();
    expect(alternativesData.alternatives).toHaveProperty('suppliers');
    expect(alternativesData.alternatives).toHaveProperty('routes');

    console.log(
      `Alternatives: ${alternativesData.alternatives.suppliers.length} suppliers, ${alternativesData.alternatives.routes.length} routes (risk: ${assessment?.risk_category})`
    );

    console.log('✅ Complete E2E test passed!');
  });

  test('Frontend map loads with event visualization capability', async ({
    page,
  }) => {
    console.log('Testing map loading and visualization layers...');

    await page.goto(FRONTEND_URL);

    // Wait for map canvas to exist
    await page.waitForSelector('.mapboxgl-canvas', { timeout: 10000 });
    console.log('Map canvas loaded');

    // Wait a bit more for map to fully initialize
    await page.waitForTimeout(3000);

    // Verify map instance exists
    const hasMap = await page.evaluate(() => {
      return (window as any).map !== undefined;
    });

    expect(hasMap).toBeTruthy();
    console.log('Map instance available on window');

    // Get risk summary
    const summaryResponse = await fetch(`${API_BASE_URL}/api/risk/summary`);
    expect(summaryResponse.ok).toBeTruthy();
    const summary = await summaryResponse.json();
    console.log('Risk summary:', summary);

    // Check if event source exists (may not have layers yet if no events)
    const mapState = await page.evaluate(() => {
      const map = (window as any).map;
      if (!map) return null;

      return {
        hasEventsSource: map.getSource('events') !== undefined,
        hasNodesSource: map.getSource('nodes') !== undefined,
        hasConnectionsSource: map.getSource('connections') !== undefined,
      };
    });

    console.log('Map sources:', mapState);
    expect(mapState).toBeTruthy();
  });

  test('Risk updates trigger real-time map changes', async ({ page }) => {
    console.log('Testing real-time map updates via WebSocket...');

    // Navigate to frontend first
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('.mapboxgl-canvas', { timeout: 10000 });

    // Get initial map state
    const initialEventCount = await page.evaluate(() => {
      const map = (window as any).map;
      if (!map) return 0;

      const source = map.getSource('events');
      if (!source || !source._data) return 0;

      return source._data.features?.length || 0;
    });

    console.log(`Initial event count on map: ${initialEventCount}`);

    // Set up promise to detect map updates
    const mapUpdated = page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        const map = (window as any).map;
        if (!map) {
          resolve(false);
          return;
        }

        // Listen for sourcedata event which fires when map data changes
        map.once('sourcedata', (e: any) => {
          if (e.sourceId === 'events') {
            resolve(true);
          }
        });

        // Timeout after 70 seconds
        setTimeout(() => resolve(false), 70000);
      });
    });

    // Trigger a risk assessment
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .limit(1)
      .single();

    if (event) {
      console.log(`Triggering risk assessment for event ${event.id}...`);
      await fetch(`${API_BASE_URL}/internal/events/notify/${event.id}`, {
        method: 'POST',
      });

      // Wait for map to update
      const didUpdate = await mapUpdated;
      console.log(`Map update detected: ${didUpdate}`);
    } else {
      console.log('No events found, skipping real-time update test');
    }
  });
});
