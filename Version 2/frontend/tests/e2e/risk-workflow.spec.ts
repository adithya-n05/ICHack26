import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const API_BASE_URL = 'http://localhost:3001';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

test.describe('Risk Agent Workflow', () => {
  let supabase: ReturnType<typeof createClient>;
  let testEventId: string;

  test.beforeAll(async () => {
    // Initialize Supabase client for verification
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  });

  test.skip(
    !SUPABASE_URL || !SUPABASE_ANON_KEY,
    'Skipping workflow tests - Supabase credentials not configured'
  );

  test('End-to-end: Create event → Risk assessment → Database storage', async () => {
    // Step 1: Get an existing event from database
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id')
      .limit(1)
      .single();

    if (eventsError || !events) {
      console.log('No events found in database, skipping test');
      test.skip();
      return;
    }

    testEventId = events.id;

    // Step 2: Get count of risk assessments before notification
    const { count: beforeCount } = await supabase
      .from('risk_assessments')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', testEventId);

    // Step 3: Trigger risk assessment via internal endpoint
    const notifyResponse = await fetch(
      `${API_BASE_URL}/internal/events/notify/${testEventId}`,
      { method: 'POST' }
    );

    expect(notifyResponse.ok).toBeTruthy();
    const notifyData = await notifyResponse.json();
    expect(notifyData.success).toBeTruthy();

    // Step 4: Wait for risk agent to process (with timeout)
    // Poll database for new assessment
    let newAssessment = null;
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    while (attempts < maxAttempts && !newAssessment) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const { data: assessments } = await supabase
        .from('risk_assessments')
        .select('*')
        .eq('event_id', testEventId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (assessments && assessments.length > 0) {
        const { count: afterCount } = await supabase
          .from('risk_assessments')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', testEventId);

        if (afterCount! > (beforeCount || 0)) {
          newAssessment = assessments[0];
          break;
        }
      }

      attempts++;
    }

    // Verify assessment was created
    expect(newAssessment).toBeTruthy();
    if (!newAssessment) {
      console.error('Risk assessment was not created within timeout');
      return;
    }

    // Step 5: Verify assessment structure
    expect(newAssessment).toHaveProperty('id');
    expect(newAssessment.event_id).toBe(testEventId);
    expect(newAssessment).toHaveProperty('risk_category');
    expect(newAssessment).toHaveProperty('severity_score');
    expect(newAssessment).toHaveProperty('confidence');
    expect(newAssessment).toHaveProperty('reasoning');
    expect(newAssessment).toHaveProperty('affected_entities');
    expect(newAssessment).toHaveProperty('alternatives');

    // Verify risk category is valid
    expect(['healthy', 'monitoring', 'at-risk', 'critical', 'disrupted']).toContain(
      newAssessment.risk_category
    );

    // Verify reasoning structure
    expect(newAssessment.reasoning).toHaveProperty('summary');
    expect(newAssessment.reasoning).toHaveProperty('factors');
    expect(Array.isArray(newAssessment.reasoning.factors)).toBeTruthy();

    // Step 6: Verify assessment is accessible via API
    const apiResponse = await fetch(
      `${API_BASE_URL}/api/risk/event/${testEventId}`
    );
    expect(apiResponse.ok).toBeTruthy();

    const apiData = await apiResponse.json();
    expect(apiData.assessment).toBeTruthy();
    expect(apiData.assessment.id).toBe(newAssessment.id);
  });

  test('Risk assessments are queryable by event_id for timeline features', async () => {
    if (!testEventId) {
      // Get any event that has assessments
      const { data: assessments } = await supabase
        .from('risk_assessments')
        .select('event_id')
        .limit(1);

      if (!assessments || assessments.length === 0) {
        console.log('No risk assessments found, skipping test');
        test.skip();
        return;
      }

      testEventId = assessments[0].event_id;
    }

    // Query all assessments for this event ordered by date
    const { data: assessments, error } = await supabase
      .from('risk_assessments')
      .select('*')
      .eq('event_id', testEventId)
      .order('created_at', { ascending: false });

    expect(error).toBeNull();
    expect(Array.isArray(assessments)).toBeTruthy();

    // Verify each assessment has timestamps
    assessments?.forEach((assessment) => {
      expect(assessment.created_at).toBeTruthy();
      expect(assessment.updated_at).toBeTruthy();
      expect(new Date(assessment.created_at).getTime()).toBeGreaterThan(0);
    });

    // Verify ordering (most recent first)
    if (assessments && assessments.length > 1) {
      const dates = assessments.map((a) => new Date(a.created_at).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    }
  });

  test('Risk assessments can be filtered by risk_category', async () => {
    const categories = ['healthy', 'monitoring', 'at-risk', 'critical', 'disrupted'];

    for (const category of categories) {
      const { data: assessments, error } = await supabase
        .from('risk_assessments')
        .select('*')
        .eq('risk_category', category)
        .limit(10);

      expect(error).toBeNull();

      // All returned assessments should match the category
      assessments?.forEach((assessment) => {
        expect(assessment.risk_category).toBe(category);
      });
    }
  });

  test('Risk assessments have affected_entities for node expansion', async () => {
    const { data: assessments, error } = await supabase
      .from('risk_assessments')
      .select('*')
      .limit(10);

    expect(error).toBeNull();
    expect(Array.isArray(assessments)).toBeTruthy();

    // Check structure of affected_entities
    assessments?.forEach((assessment) => {
      expect(Array.isArray(assessment.affected_entities)).toBeTruthy();

      assessment.affected_entities.forEach((entity: any) => {
        expect(entity).toHaveProperty('type');
        expect(entity).toHaveProperty('id');
        expect(entity).toHaveProperty('name');
        expect(['node', 'connection']).toContain(entity.type);
      });
    });
  });

  test('GET /api/risk/event/:eventId/alternatives returns alternatives structure', async () => {
    // Get an event with risk assessment
    const { data: assessments } = await supabase
      .from('risk_assessments')
      .select('event_id')
      .limit(1);

    if (!assessments || assessments.length === 0) {
      console.log('No risk assessments found, skipping test');
      test.skip();
      return;
    }

    const eventId = assessments[0].event_id;
    const response = await fetch(
      `${API_BASE_URL}/api/risk/event/${eventId}/alternatives`
    );
    expect(response.ok).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('alternatives');
    expect(data.alternatives).toHaveProperty('suppliers');
    expect(data.alternatives).toHaveProperty('routes');
    expect(Array.isArray(data.alternatives.suppliers)).toBeTruthy();
    expect(Array.isArray(data.alternatives.routes)).toBeTruthy();

    // Verify alternative structure if any exist
    [...data.alternatives.suppliers, ...data.alternatives.routes].forEach(
      (alt: any) => {
        expect(alt).toHaveProperty('id');
        expect(alt).toHaveProperty('name');
        expect(alt).toHaveProperty('type');
        expect(alt).toHaveProperty('reason');
        expect(alt).toHaveProperty('confidence');
        expect(typeof alt.confidence).toBe('number');
        expect(alt.confidence).toBeGreaterThanOrEqual(0);
        expect(alt.confidence).toBeLessThanOrEqual(1);
      }
    );
  });

  test('GET /api/risk/affected-entities/:eventId returns entities with distance', async () => {
    // Get an event with risk assessment
    const { data: assessments } = await supabase
      .from('risk_assessments')
      .select('event_id, affected_entities')
      .limit(1);

    if (!assessments || assessments.length === 0) {
      console.log('No risk assessments found, skipping test');
      test.skip();
      return;
    }

    const eventId = assessments[0].event_id;
    const response = await fetch(
      `${API_BASE_URL}/api/risk/affected-entities/${eventId}`
    );
    expect(response.ok).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data.affectedEntities)).toBeTruthy();

    // Verify entity structure
    data.affectedEntities.forEach((entity: any) => {
      expect(entity).toHaveProperty('type');
      expect(entity).toHaveProperty('id');
      expect(entity).toHaveProperty('name');
      // distanceKm is optional but should be a number if present
      if (entity.distanceKm !== undefined) {
        expect(typeof entity.distanceKm).toBe('number');
        expect(entity.distanceKm).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

test.describe('Risk Assessment Historical Queries', () => {
  test('Can query assessments by date range for timeline', async () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentAssessments, error } = await supabase
      .from('risk_assessments')
      .select('*')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false });

    expect(error).toBeNull();
    expect(Array.isArray(recentAssessments)).toBeTruthy();

    // All assessments should be from the last 24 hours
    recentAssessments?.forEach((assessment) => {
      const createdAt = new Date(assessment.created_at).getTime();
      const threshold = new Date(oneDayAgo).getTime();
      expect(createdAt).toBeGreaterThanOrEqual(threshold);
    });
  });

  test('Can track risk level changes over time for same event', async () => {
    // Find an event with multiple assessments
    const { data: allAssessments } = await supabase
      .from('risk_assessments')
      .select('event_id');

    if (!allAssessments || allAssessments.length === 0) {
      console.log('No risk assessments found, skipping test');
      test.skip();
      return;
    }

    // Count assessments per event
    const eventCounts = allAssessments.reduce((acc: any, a: any) => {
      acc[a.event_id] = (acc[a.event_id] || 0) + 1;
      return acc;
    }, {});

    // Find an event with multiple assessments
    const multiAssessmentEvent = Object.entries(eventCounts).find(
      ([_, count]) => (count as number) > 1
    );

    if (multiAssessmentEvent) {
      const eventId = multiAssessmentEvent[0];

      // Get timeline of assessments for this event
      const { data: timeline, error } = await supabase
        .from('risk_assessments')
        .select('id, risk_category, severity_score, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      expect(error).toBeNull();
      expect(timeline!.length).toBeGreaterThan(1);

      // Verify we can track changes over time
      console.log(`Event ${eventId} risk timeline:`);
      timeline?.forEach((assessment, idx) => {
        console.log(
          `  ${idx + 1}. ${assessment.created_at}: ${assessment.risk_category} (severity: ${assessment.severity_score})`
        );
      });
    }
  });
});
