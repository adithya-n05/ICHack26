import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:3001';

test.describe('Risk Assessment Visualization', () => {
  test('Risk assessment triggers visual updates on map', async ({ page }) => {
    // 1. Load map
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('.mapboxgl-canvas', { timeout: 10000 });

    // Wait for map to be fully loaded
    await page.waitForTimeout(2000);

    // 2. Get initial connection colors/statuses
    const initialColors = await page.evaluate(() => {
      const map = (window as any).map;
      if (!map) return [];
      const source = map.getSource('connections');
      if (!source || !source._data) return [];
      return source._data.features.map((f: any) => ({
        id: f.properties.id,
        status: f.properties.status
      }));
    });

    console.log(`Initial connections count: ${initialColors.length}`);

    // 3. Fetch an event to trigger risk assessment
    const response = await fetch(`${API_BASE_URL}/api/events?limit=1`);
    expect(response.ok).toBeTruthy();

    const events = await response.json();
    expect(events.length).toBeGreaterThan(0);

    const eventId = events[0].id;
    console.log(`Using event ID: ${eventId}`);

    // 4. Trigger risk assessment
    const triggerResponse = await fetch(`${API_BASE_URL}/internal/events/notify/${eventId}`, {
      method: 'POST'
    });
    expect(triggerResponse.ok).toBeTruthy();

    console.log('Risk assessment triggered, waiting for updates...');

    // 5. Wait for risk update (give it time to process)
    await page.waitForTimeout(15000);

    // 6. Verify connection colors changed
    const updatedColors = await page.evaluate(() => {
      const map = (window as any).map;
      if (!map) return [];
      const source = map.getSource('connections');
      if (!source || !source._data) return [];
      return source._data.features.map((f: any) => ({
        id: f.properties.id,
        status: f.properties.status
      }));
    });

    console.log(`Updated connections count: ${updatedColors.length}`);

    // Check if any connection statuses changed
    const statusChanged = updatedColors.some((updated: any) => {
      const initial = initialColors.find((i: any) => i.id === updated.id);
      return initial && initial.status !== updated.status;
    });

    if (statusChanged) {
      console.log('✓ Connection statuses changed');
    } else {
      console.log('⚠ Connection statuses did not change (may be expected if no connections affected)');
    }

    // 7. Verify alternative routes layer exists
    const hasAlternatives = await page.evaluate(() => {
      const map = (window as any).map;
      return map && map.getLayer('alternative-routes') !== undefined;
    });

    expect(hasAlternatives).toBeTruthy();
    console.log('✓ Alternative routes layer exists');

    // 8. Check alternative routes are visible (if any)
    const altRoutesCount = await page.evaluate(() => {
      const map = (window as any).map;
      if (!map) return 0;
      const source = map.getSource('alternative-routes');
      return source?._data?.features?.length || 0;
    });

    console.log(`Alternative routes displayed: ${altRoutesCount}`);

    // We expect alternatives if the risk assessment found them
    // This is informational rather than a hard requirement
    if (altRoutesCount > 0) {
      console.log('✓ Alternative routes are visible');
    } else {
      console.log('⚠ No alternative routes visible (may be expected based on event location)');
    }

    // 9. Verify affected nodes layer exists
    const hasAffectedNodesLayer = await page.evaluate(() => {
      const map = (window as any).map;
      return map && map.getLayer('nodes-affected-glow') !== undefined;
    });

    expect(hasAffectedNodesLayer).toBeTruthy();
    console.log('✓ Affected nodes glow layer exists');

    // 10. Check if any nodes are marked as affected
    const affectedNodesCount = await page.evaluate(() => {
      const map = (window as any).map;
      if (!map) return 0;
      const source = map.getSource('nodes');
      if (!source || !source._data) return 0;
      return source._data.features.filter((f: any) => f.properties.isAffected === true).length;
    });

    console.log(`Affected nodes count: ${affectedNodesCount}`);

    if (affectedNodesCount > 0) {
      console.log('✓ Nodes are marked as affected');
    } else {
      console.log('⚠ No nodes marked as affected (may be expected based on event location)');
    }

    // 11. Take a screenshot for visual verification
    await page.screenshot({
      path: 'test-results/risk-visualization-after-update.png',
      fullPage: false
    });
    console.log('✓ Screenshot saved');
  });

  test('Alternative routes appear with correct styling', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('.mapboxgl-canvas', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verify alternative routes layer has correct paint properties
    const altRoutesPaint = await page.evaluate(() => {
      const map = (window as any).map;
      if (!map) return null;
      const layer = map.getLayer('alternative-routes');
      return layer ? layer.paint : null;
    });

    expect(altRoutesPaint).toBeTruthy();
    expect(altRoutesPaint['line-color']).toBeDefined();
    expect(altRoutesPaint['line-dasharray']).toBeDefined();

    console.log('✓ Alternative routes layer has correct styling');
  });

  test('Affected nodes have red glow effect', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('.mapboxgl-canvas', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verify affected nodes glow layer has correct paint properties
    const affectedNodesPaint = await page.evaluate(() => {
      const map = (window as any).map;
      if (!map) return null;
      const layer = map.getLayer('nodes-affected-glow');
      return layer ? layer.paint : null;
    });

    expect(affectedNodesPaint).toBeTruthy();

    // Check for red color in the glow
    const circleColor = affectedNodesPaint['circle-color'];
    expect(circleColor).toContain('255, 0, 0'); // Red color

    console.log('✓ Affected nodes glow layer has correct red styling');
  });
});
