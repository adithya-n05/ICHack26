import { test, expect } from '@playwright/test';

const API_BASE_URL = 'http://localhost:3001';

test.describe('Risk API Endpoints', () => {
  test.beforeAll(async () => {
    // Verify backend is running
    const response = await fetch(`${API_BASE_URL}/health`);
    expect(response.ok).toBeTruthy();
  });

  test('GET /api/risk/summary returns summary statistics', async () => {
    const response = await fetch(`${API_BASE_URL}/api/risk/summary`);
    expect(response.ok).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('summary');
    expect(data.summary).toHaveProperty('total');
    expect(data.summary).toHaveProperty('healthy');
    expect(data.summary).toHaveProperty('monitoring');
    expect(data.summary).toHaveProperty('at-risk');
    expect(data.summary).toHaveProperty('critical');
    expect(data.summary).toHaveProperty('disrupted');

    // Verify counts are numbers
    expect(typeof data.summary.total).toBe('number');
    expect(typeof data.summary.healthy).toBe('number');
  });

  test('GET /api/risk/assessments returns array of assessments', async () => {
    const response = await fetch(`${API_BASE_URL}/api/risk/assessments`);
    expect(response.ok).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('assessments');
    expect(Array.isArray(data.assessments)).toBeTruthy();
  });

  test('GET /api/risk/assessments with limit filter', async () => {
    const response = await fetch(`${API_BASE_URL}/api/risk/assessments?limit=5`);
    expect(response.ok).toBeTruthy();

    const data = await response.json();
    expect(data.assessments.length).toBeLessThanOrEqual(5);
  });

  test('GET /api/risk/assessments with riskCategory filter', async () => {
    const response = await fetch(
      `${API_BASE_URL}/api/risk/assessments?riskCategory=critical`
    );
    expect(response.ok).toBeTruthy();

    const data = await response.json();
    // All returned assessments should have critical category
    data.assessments.forEach((assessment: any) => {
      expect(assessment.risk_category).toBe('critical');
    });
  });

  test('GET /api/risk/assessments/:id returns 404 for non-existent assessment', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await fetch(`${API_BASE_URL}/api/risk/assessments/${fakeId}`);
    expect(response.status).toBe(404);
  });

  test('GET /api/risk/event/:eventId returns null for non-existent event', async () => {
    const fakeEventId = '00000000-0000-0000-0000-000000000000';
    const response = await fetch(`${API_BASE_URL}/api/risk/event/${fakeEventId}`);
    expect(response.ok).toBeTruthy();

    const data = await response.json();
    expect(data.assessment).toBeNull();
  });

  test('GET /api/risk/event/:eventId/alternatives returns empty for non-existent event', async () => {
    const fakeEventId = '00000000-0000-0000-0000-000000000000';
    const response = await fetch(
      `${API_BASE_URL}/api/risk/event/${fakeEventId}/alternatives`
    );
    expect(response.ok).toBeTruthy();

    const data = await response.json();
    expect(data.alternatives).toEqual({ suppliers: [], routes: [] });
  });

  test('GET /api/risk/affected-entities/:eventId returns empty for non-existent event', async () => {
    const fakeEventId = '00000000-0000-0000-0000-000000000000';
    const response = await fetch(
      `${API_BASE_URL}/api/risk/affected-entities/${fakeEventId}`
    );
    expect(response.ok).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data.affectedEntities)).toBeTruthy();
    expect(data.affectedEntities).toEqual([]);
  });
});

test.describe('Risk Assessment Data Structure', () => {
  test('Risk assessment has correct structure when exists', async () => {
    // Get any existing assessment
    const response = await fetch(`${API_BASE_URL}/api/risk/assessments?limit=1`);
    const data = await response.json();

    if (data.assessments.length > 0) {
      const assessment = data.assessments[0];

      // Verify required fields
      expect(assessment).toHaveProperty('id');
      expect(assessment).toHaveProperty('event_id');
      expect(assessment).toHaveProperty('risk_category');
      expect(assessment).toHaveProperty('severity_score');
      expect(assessment).toHaveProperty('confidence');
      expect(assessment).toHaveProperty('reasoning');
      expect(assessment).toHaveProperty('affected_entities');
      expect(assessment).toHaveProperty('alternatives');
      expect(assessment).toHaveProperty('created_at');
      expect(assessment).toHaveProperty('updated_at');

      // Verify risk category is valid
      expect(['healthy', 'monitoring', 'at-risk', 'critical', 'disrupted']).toContain(
        assessment.risk_category
      );

      // Verify severity score is in range
      expect(assessment.severity_score).toBeGreaterThanOrEqual(1);
      expect(assessment.severity_score).toBeLessThanOrEqual(10);

      // Verify confidence is in range
      expect(assessment.confidence).toBeGreaterThanOrEqual(0);
      expect(assessment.confidence).toBeLessThanOrEqual(1);

      // Verify reasoning structure
      expect(assessment.reasoning).toHaveProperty('summary');
      expect(assessment.reasoning).toHaveProperty('factors');
      expect(Array.isArray(assessment.reasoning.factors)).toBeTruthy();

      // Verify affected_entities is array
      expect(Array.isArray(assessment.affected_entities)).toBeTruthy();

      // Verify alternatives structure
      expect(assessment.alternatives).toHaveProperty('suppliers');
      expect(assessment.alternatives).toHaveProperty('routes');
      expect(Array.isArray(assessment.alternatives.suppliers)).toBeTruthy();
      expect(Array.isArray(assessment.alternatives.routes)).toBeTruthy();
    }
  });
});
