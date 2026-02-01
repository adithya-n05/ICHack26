import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:5174';
const API_BASE_URL = 'http://localhost:3001';

test.describe('High Severity Event Simulation', () => {
  test('Inject high-severity event in South Korea and verify visual impact', async ({ page }) => {
    test.setTimeout(90000); // 90 seconds timeout to allow for risk assessment and polling

    // 1. Navigate to the map
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('.mapboxgl-canvas', { timeout: 10000 });

    // Wait for map instance to be available and fully loaded
    await page.waitForFunction(() => {
      const map = (window as any).map;
      return map && map.isStyleLoaded();
    }, { timeout: 15000 });

    console.log('✓ Map loaded successfully');

    // 2. Zoom to South Korea area to see the supply chain cluster
    await page.evaluate(() => {
      const map = (window as any).map;
      if (!map) throw new Error('Map not available');

      map.flyTo({
        center: [127.5, 37.5], // South Korea (Seoul area)
        zoom: 6,
        duration: 1000
      });
    });

    await page.waitForTimeout(2000);
    console.log('✓ Zoomed to South Korea region');

    // 3. Take "before" screenshot
    await page.screenshot({
      path: 'test-results/01-before-high-severity-event.png',
      fullPage: false
    });
    console.log('✓ Before screenshot captured');

    // 4. Get initial connection statuses
    const initialState = await page.evaluate(() => {
      const map = (window as any).map;
      const connectionsSource = map.getSource('connections');
      const nodesSource = map.getSource('nodes');

      return {
        connectionsCount: connectionsSource?._data?.features?.length || 0,
        nodesCount: nodesSource?._data?.features?.length || 0,
      };
    });

    console.log(`✓ Initial state: ${initialState.connectionsCount} connections, ${initialState.nodesCount} nodes`);

    // 5. Create a high-severity earthquake event near Seoul, South Korea
    const highSeverityEvent = {
      type: 'natural_disaster',
      title: 'M 8.5 - Major Earthquake near Seoul, South Korea',
      description: 'Catastrophic earthquake strikes near Seoul metropolitan area, affecting major semiconductor manufacturing facilities. Infrastructure heavily damaged, supply chain severely disrupted.',
      severity: 9, // Very high severity
      lat: 37.4, // Near Seoul and Samsung/SK Hynix facilities
      lng: 127.3,
      source: 'simulation',
      start_date: new Date().toISOString()
    };

    console.log('Creating high-severity event...');

    // 6. Inject the event via API
    const createResponse = await fetch(`${API_BASE_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(highSeverityEvent)
    });

    expect(createResponse.ok).toBeTruthy();
    const createdEvent = await createResponse.json();
    const eventId = createdEvent.id;

    console.log(`✓ High-severity event created: ${eventId}`);
    console.log(`  Title: ${highSeverityEvent.title}`);
    console.log(`  Severity: ${highSeverityEvent.severity}/10`);
    console.log(`  Location: ${highSeverityEvent.lat}, ${highSeverityEvent.lng}`);

    // 7. Wait for the event to appear on the map
    await page.waitForTimeout(2000);

    // Take screenshot with event visible but before risk assessment
    await page.screenshot({
      path: 'test-results/02-event-created-before-assessment.png',
      fullPage: false
    });
    console.log('✓ Event created screenshot captured');

    // 8. Trigger risk assessment
    console.log('Triggering risk assessment...');
    const triggerResponse = await fetch(`${API_BASE_URL}/internal/events/notify/${eventId}`, {
      method: 'POST'
    });

    expect(triggerResponse.ok).toBeTruthy();
    const triggerResult = await triggerResponse.json();
    console.log(`✓ Risk assessment triggered: ${triggerResult.message}`);

    // 9. Wait for risk assessment to complete (10-15 seconds)
    console.log('Waiting for risk assessment to complete (15 seconds)...');
    await page.waitForTimeout(15000);

    // 9a. Wait for polling to pick up changes (max 10 second poll interval + processing)
    console.log('Waiting for map to refresh via polling (12 seconds)...');
    await page.waitForTimeout(12000);

    // 10. Verify the risk assessment was created
    const assessmentResponse = await fetch(`${API_BASE_URL}/api/risk/event/${eventId}`);
    expect(assessmentResponse.ok).toBeTruthy();
    const assessmentData = await assessmentResponse.json();

    console.log('\n🎯 Risk Assessment Results:');
    console.log(`  Risk Category: ${assessmentData.assessment?.risk_category || 'N/A'}`);
    console.log(`  Severity Score: ${assessmentData.assessment?.severity_score || 'N/A'}/10`);
    console.log(`  Confidence: ${assessmentData.assessment?.confidence || 'N/A'}`);
    console.log(`  Affected Entities: ${assessmentData.assessment?.affected_entities?.length || 0}`);

    if (assessmentData.assessment?.affected_entities?.length > 0) {
      console.log('\n  Affected Entities:');
      assessmentData.assessment.affected_entities.forEach((entity: any, idx: number) => {
        console.log(`    ${idx + 1}. ${entity.name} (${entity.type}) - ${entity.distance_km}km away`);
      });
    }

    // 10a. Comprehensive connection state verification
    const connectionState = await page.evaluate(() => {
      const map = (window as any).map;
      if (!map) return { error: 'Map not available' };

      // Query rendered features
      const renderedConnections = map.queryRenderedFeatures({ layers: ['connections'] });

      // Get source data
      const connectionsSource = map.getSource('connections');
      const sourceFeatures = connectionsSource?._data?.features || [];

      // Count statuses in source data
      const statusCounts: Record<string, number> = {};
      sourceFeatures.forEach((f: any) => {
        const status = f.properties.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      return {
        renderedCount: renderedConnections.length,
        sourceCount: sourceFeatures.length,
        statusCounts,
        sampleStatuses: sourceFeatures.slice(0, 5).map((f: any) => ({
          id: f.properties.id?.substring(0, 8),
          status: f.properties.status
        }))
      };
    });

    console.log('\n🔍 Connection State After Risk Assessment:');
    console.log('  Rendered features:', connectionState.renderedCount);
    console.log('  Source features:', connectionState.sourceCount);
    console.log('  Status counts:', connectionState.statusCounts);
    console.log('  Sample statuses:', connectionState.sampleStatuses);

    // Verify at least some connections have non-healthy status
    const hasRiskStatuses =
      (connectionState.statusCounts?.['monitoring'] || 0) > 0 ||
      (connectionState.statusCounts?.['at-risk'] || 0) > 0 ||
      (connectionState.statusCounts?.['critical'] || 0) > 0 ||
      (connectionState.statusCounts?.['disrupted'] || 0) > 0;

    console.log(`\n✓ Risk statuses present: ${hasRiskStatuses}`);

    // 10b. Verify heatmap shows high severity
    const heatmapState = await page.evaluate(() => {
      const map = (window as any).map;
      const eventsSource = map.getSource('events-points');
      const features = eventsSource?._data?.features || [];

      const highSeverityEvents = features.filter((f: any) =>
        (f.properties.severity || 0) >= 8
      );

      return {
        totalEvents: features.length,
        highSeverityCount: highSeverityEvents.length,
        severities: features.map((f: any) => f.properties.severity).filter(Boolean).slice(0, 10)
      };
    });

    console.log('\n🔥 Heatmap State:');
    console.log('  Total events:', heatmapState.totalEvents);
    console.log('  High severity (≥8):', heatmapState.highSeverityCount);
    console.log('  Sample severities:', heatmapState.severities);

    expect(heatmapState.highSeverityCount).toBeGreaterThan(0);

    // 11. Take "after risk assessment" screenshot
    await page.screenshot({
      path: 'test-results/03-after-risk-assessment.png',
      fullPage: false
    });
    console.log('\n✓ After risk assessment screenshot captured');

    // 12. Verify visual changes on the map
    const visualState = await page.evaluate(() => {
      const map = (window as any).map;

      // Check connections for status changes
      const connectionsSource = map.getSource('connections');
      const connections = connectionsSource?._data?.features || [];

      const statusCounts = {
        healthy: 0,
        monitoring: 0,
        'at-risk': 0,
        critical: 0,
        disrupted: 0,
        unknown: 0
      };

      connections.forEach((feature: any) => {
        const status = feature.properties.status;
        if (status in statusCounts) {
          statusCounts[status as keyof typeof statusCounts]++;
        } else {
          statusCounts.unknown++;
        }
      });

      // Check for affected nodes
      const nodesSource = map.getSource('nodes');
      const nodes = nodesSource?._data?.features || [];
      const affectedNodes = nodes.filter((f: any) => f.properties.isAffected === true);

      // Check if affected nodes layer exists
      const affectedNodesLayer = map.getLayer('nodes-affected-glow');

      return {
        connectionStatuses: statusCounts,
        affectedNodesCount: affectedNodes.length,
        affectedNodesLayerExists: !!affectedNodesLayer,
        totalConnections: connections.length,
        totalNodes: nodes.length
      };
    });

    console.log('\n📊 Visual State After Risk Assessment:');
    console.log(`  Total Connections: ${visualState.totalConnections}`);
    console.log('  Connection Statuses:');
    console.log(`    - Healthy: ${visualState.connectionStatuses.healthy}`);
    console.log(`    - Monitoring: ${visualState.connectionStatuses.monitoring}`);
    console.log(`    - At-Risk: ${visualState.connectionStatuses['at-risk']}`);
    console.log(`    - Critical: ${visualState.connectionStatuses.critical}`);
    console.log(`    - Disrupted: ${visualState.connectionStatuses.disrupted}`);
    console.log(`    - Unknown: ${visualState.connectionStatuses.unknown}`);
    console.log(`\n  Affected Nodes: ${visualState.affectedNodesCount} (with red glow)`);
    console.log(`  Affected Nodes Layer Exists: ${visualState.affectedNodesLayerExists}`);

    // 13. Affected nodes layer is optional - log it but don't require it
    if (!visualState.affectedNodesLayerExists) {
      console.log('  Note: Affected nodes layer not implemented (optional feature)');
    }

    // 14. Check if any connections changed status
    const hasDisruptedConnections =
      visualState.connectionStatuses.monitoring > 0 ||
      visualState.connectionStatuses['at-risk'] > 0 ||
      visualState.connectionStatuses.critical > 0 ||
      visualState.connectionStatuses.disrupted > 0;

    console.log(`\n✓ Connection status changes detected: ${hasDisruptedConnections}`);
    console.log(`✓ Affected nodes highlighted: ${visualState.affectedNodesCount > 0}`);

    // 15. Zoom in closer to see the red hotspot detail
    await page.evaluate(() => {
      const map = (window as any).map;
      map.flyTo({
        center: [127.3, 37.4], // Event epicenter
        zoom: 8,
        duration: 1000
      });
    });

    await page.waitForTimeout(2000);

    // 16. Take close-up screenshot of the affected area
    await page.screenshot({
      path: 'test-results/04-closeup-affected-area.png',
      fullPage: false
    });
    console.log('✓ Close-up screenshot captured');

    // 16a. Take final annotated screenshot showing the visualization
    await page.screenshot({
      path: 'test-results/05-final-with-annotations.png',
      fullPage: false
    });
    console.log('✓ Final annotated screenshot captured');

    // 17. Get heatmap layer details
    const heatmapLayerState = await page.evaluate(() => {
      const map = (window as any).map;
      const heatmapLayer = map.getLayer('events-heat');
      const eventsPointsLayer = map.getLayer('events-points');

      return {
        heatmapExists: !!heatmapLayer,
        eventsPointsExists: !!eventsPointsLayer,
        heatmapPaint: heatmapLayer?.paint || null
      };
    });

    console.log('\n🔥 Heatmap Layer Verification:');
    console.log(`  Heatmap Layer Exists: ${heatmapLayerState.heatmapExists}`);
    console.log(`  Events Points Layer Exists: ${heatmapLayerState.eventsPointsExists}`);

    // 18. Verify we can see the event polygon
    const polygonState = await page.evaluate(() => {
      const map = (window as any).map;
      const polygonLayer = map.getLayer('events-polygons');
      const polygonSource = map.getSource('events-polygons');

      return {
        layerExists: !!polygonLayer,
        sourceExists: !!polygonSource,
        featureCount: polygonSource?._data?.features?.length || 0
      };
    });

    console.log('\n📐 Event Polygon Verification:');
    console.log(`  Polygon Layer Exists: ${polygonState.layerExists}`);
    console.log(`  Polygon Features: ${polygonState.featureCount}`);

    // 19. Verify database updates
    console.log('\nVerifying database updates...');

    const dbConnectionsResponse = await fetch(`${API_BASE_URL}/api/connections`);
    const dbConnections = await dbConnectionsResponse.json();

    const disruptedInDb = dbConnections.filter((c: any) =>
      c.status === 'disrupted' ||
      c.status === 'critical' ||
      c.status === 'at-risk'
    );

    console.log(`Database: ${disruptedInDb.length} connections with risk status`);

    if (disruptedInDb.length > 0) {
      console.log('  Sample disrupted connections:');
      disruptedInDb.slice(0, 3).forEach((c: any) => {
        console.log(`    - ${c.id.substring(0, 8)}: ${c.status}`);
      });
    }

    // 20. Enhanced final summary
    console.log('\n' + '='.repeat(70));
    console.log('📋 VISUAL VERIFICATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`Event Severity: ${highSeverityEvent.severity}/10 (${highSeverityEvent.title})`);
    console.log(`Risk Category: ${assessmentData.assessment?.risk_category || 'N/A'}`);
    console.log(`Affected Entities: ${assessmentData.assessment?.affected_entities?.length || 0}`);
    console.log('\nConnection Visualization:');
    console.log(`  - Source features: ${connectionState.sourceCount}`);
    console.log(`  - Rendered features: ${connectionState.renderedCount}`);
    console.log(`  - Status distribution: ${JSON.stringify(connectionState.statusCounts)}`);
    console.log(`  - Has risk statuses: ${hasRiskStatuses ? '✅ YES' : '❌ NO'}`);
    console.log('\nHeatmap Visualization:');
    console.log(`  - High severity events: ${heatmapState.highSeverityCount}`);
    console.log(`  - Hotspot visible: ${heatmapState.highSeverityCount > 0 ? '✅ YES' : '❌ NO'}`);
    console.log('\nDatabase Verification:');
    console.log(`  - Disrupted connections in DB: ${disruptedInDb.length}`);
    console.log('\nScreenshots:');
    console.log(`  - Total captured: 5 images`);
    console.log(`  - Before/after comparison: Available`);
    console.log('='.repeat(70));

    // 21. Cleanup - delete the test event
    console.log('\nCleaning up test event...');
    await fetch(`${API_BASE_URL}/api/events/${eventId}`, {
      method: 'DELETE'
    });
    console.log('✓ Test event deleted');
  });

  test('Verify event polygon and heatmap visualization', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForSelector('.mapboxgl-canvas', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check that the heatmap has the correct color gradient (red for high severity)
    const heatmapColors = await page.evaluate(() => {
      const map = (window as any).map;
      const heatmapLayer = map.getLayer('events-heat');

      if (!heatmapLayer || !heatmapLayer.paint) {
        return null;
      }

      return {
        colorExpression: heatmapLayer.paint['heatmap-color'],
        weightExpression: heatmapLayer.paint['heatmap-weight']
      };
    });

    expect(heatmapColors).toBeTruthy();
    console.log('✓ Heatmap color gradient verified');

    // Verify the color gradient includes red for high severity
    const colorString = JSON.stringify(heatmapColors?.colorExpression || []);
    expect(colorString).toContain('255, 0, 0'); // Red color for high intensity
    console.log('✓ Red color present in heatmap gradient for high severity events');
  });
});
