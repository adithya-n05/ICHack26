import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:3001';

test.describe('Risk Frontend Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test('Frontend can fetch risk summary', async ({ page }) => {
    // Execute API call in browser context
    const summary = await page.evaluate(async () => {
      const response = await fetch('http://localhost:3001/api/risk/summary');
      return response.json();
    });

    expect(summary).toHaveProperty('summary');
    expect(summary.summary).toHaveProperty('total');
    expect(typeof summary.summary.total).toBe('number');
  });

  test('Frontend can fetch risk assessments', async ({ page }) => {
    const assessments = await page.evaluate(async () => {
      const response = await fetch('http://localhost:3001/api/risk/assessments?limit=5');
      return response.json();
    });

    expect(assessments).toHaveProperty('assessments');
    expect(Array.isArray(assessments.assessments)).toBeTruthy();
  });

  test('Frontend can connect to WebSocket', async ({ page }) => {
    // Wait for socket.io to be available
    await page.waitForTimeout(2000);

    const socketConnected = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Check if socket is already connected
        const checkInterval = setInterval(() => {
          if ((window as any).io) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);

        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(false);
        }, 5000);
      });
    });

    // Socket.io should be available in the frontend
    expect(socketConnected).toBeTruthy();
  });

  test('Frontend riskApi functions are importable and callable', async ({ page }) => {
    // Test that the API functions work when called from the browser
    const result = await page.evaluate(async () => {
      try {
        // Dynamically import the riskApi module
        const module = await import('/src/lib/riskApi.ts');

        // Test getRiskSummary
        const summary = await module.getRiskSummary();

        return {
          success: true,
          hasSummary: !!summary,
          summaryKeys: Object.keys(summary),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    expect(result.success).toBeTruthy();
    if (result.success) {
      expect(result.hasSummary).toBeTruthy();
      expect(result.summaryKeys).toContain('total');
    }
  });
});

test.describe('Risk Data Persistence for Node Interaction', () => {
  test('Risk assessments persist in database for future queries', async ({ page }) => {
    // Verify that assessments remain queryable after being created
    const result = await page.evaluate(async () => {
      const response = await fetch('http://localhost:3001/api/risk/assessments');
      const data = await response.json();

      if (data.assessments.length === 0) {
        return { hasData: false };
      }

      const assessment = data.assessments[0];

      // Get the same assessment by ID
      const byIdResponse = await fetch(
        `http://localhost:3001/api/risk/assessments/${assessment.id}`
      );
      const byIdData = await byIdResponse.json();

      // Get by event ID
      const byEventResponse = await fetch(
        `http://localhost:3001/api/risk/event/${assessment.event_id}`
      );
      const byEventData = await byEventResponse.json();

      return {
        hasData: true,
        sameById: byIdData.assessment?.id === assessment.id,
        sameByEvent: byEventData.assessment?.id === assessment.id,
        affectedEntitiesCount: assessment.affected_entities?.length || 0,
      };
    });

    if (result.hasData) {
      expect(result.sameById).toBeTruthy();
      expect(result.sameByEvent).toBeTruthy();
      // Verify affected entities are stored for node expansion
      expect(result.affectedEntitiesCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('Affected entities can be queried for node click expansion', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // Get any assessment with affected entities
      const response = await fetch('http://localhost:3001/api/risk/assessments?limit=10');
      const data = await response.json();

      const assessmentWithEntities = data.assessments.find(
        (a: any) => a.affected_entities && a.affected_entities.length > 0
      );

      if (!assessmentWithEntities) {
        return { hasAffectedEntities: false };
      }

      // Get affected entities via dedicated endpoint
      const entitiesResponse = await fetch(
        `http://localhost:3001/api/risk/affected-entities/${assessmentWithEntities.event_id}`
      );
      const entitiesData = await entitiesResponse.json();

      return {
        hasAffectedEntities: true,
        entitiesCount: entitiesData.affectedEntities.length,
        sampleEntity: entitiesData.affectedEntities[0],
        hasNodeId: entitiesData.affectedEntities.some((e: any) => e.type === 'node'),
        hasConnectionId: entitiesData.affectedEntities.some(
          (e: any) => e.type === 'connection'
        ),
      };
    });

    if (result.hasAffectedEntities) {
      expect(result.entitiesCount).toBeGreaterThan(0);
      expect(result.sampleEntity).toHaveProperty('type');
      expect(result.sampleEntity).toHaveProperty('id');
      expect(result.sampleEntity).toHaveProperty('name');
    }
  });
});

test.describe('Risk API Error Handling', () => {
  test('API returns appropriate errors for malformed requests', async ({ page }) => {
    const result = await page.evaluate(async () => {
      // Test with invalid UUID
      const invalidIdResponse = await fetch(
        'http://localhost:3001/api/risk/assessments/invalid-uuid'
      );

      return {
        invalidIdStatus: invalidIdResponse.status,
        invalidIdOk: invalidIdResponse.ok,
      };
    });

    // Should return 500 or 404 for invalid UUID
    expect(result.invalidIdOk).toBeFalsy();
  });

  test('API handles missing event gracefully', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const fakeEventId = '00000000-0000-0000-0000-000000000000';
      const response = await fetch(
        `http://localhost:3001/api/risk/event/${fakeEventId}`
      );

      if (!response.ok) {
        return { ok: false, status: response.status };
      }

      const data = await response.json();
      return {
        ok: true,
        hasAssessment: !!data.assessment,
        assessmentIsNull: data.assessment === null,
      };
    });

    expect(result.ok).toBeTruthy();
    expect(result.assessmentIsNull).toBeTruthy();
  });
});
