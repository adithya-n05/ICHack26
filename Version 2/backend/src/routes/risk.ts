import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * GET /api/risk/assessments
 * Query risk assessments with optional filters
 */
router.get('/assessments', async (req, res) => {
  try {
    const { eventId, riskCategory, limit } = req.query;

    let query = supabase
      .from('risk_assessments')
      .select('*')
      .order('created_at', { ascending: false });

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    if (riskCategory) {
      query = query.eq('risk_category', riskCategory);
    }

    if (limit) {
      query = query.limit(parseInt(limit as string, 10));
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Risk API] Error fetching assessments:', error);
      return res.status(500).json({ error: 'Failed to fetch risk assessments' });
    }

    res.json({ assessments: data || [] });
  } catch (error) {
    console.error('[Risk API] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/risk/assessments/:id
 * Get a specific risk assessment by ID
 */
router.get('/assessments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('risk_assessments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Risk assessment not found' });
      }
      console.error('[Risk API] Error fetching assessment:', error);
      return res.status(500).json({ error: 'Failed to fetch risk assessment' });
    }

    res.json({ assessment: data });
  } catch (error) {
    console.error('[Risk API] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/risk/event/:eventId
 * Get risk assessment for a specific event
 */
router.get('/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    const { data, error } = await supabase
      .from('risk_assessments')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.json({ assessment: null });
      }
      console.error('[Risk API] Error fetching event risk:', error);
      return res.status(500).json({ error: 'Failed to fetch risk assessment' });
    }

    res.json({ assessment: data });
  } catch (error) {
    console.error('[Risk API] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/risk/event/:eventId/alternatives
 * Get alternative suppliers/routes for an event's risk assessment
 */
router.get('/event/:eventId/alternatives', async (req, res) => {
  try {
    const { eventId } = req.params;

    const { data, error } = await supabase
      .from('risk_assessments')
      .select('alternatives')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.json({ alternatives: { suppliers: [], routes: [] } });
      }
      console.error('[Risk API] Error fetching alternatives:', error);
      return res.status(500).json({ error: 'Failed to fetch alternatives' });
    }

    res.json({ alternatives: data?.alternatives || { suppliers: [], routes: [] } });
  } catch (error) {
    console.error('[Risk API] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/risk/summary
 * Get summary statistics of risk assessments
 */
router.get('/summary', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('risk_assessments')
      .select('risk_category');

    if (error) {
      console.error('[Risk API] Error fetching summary:', error);
      return res.status(500).json({ error: 'Failed to fetch risk summary' });
    }

    // Aggregate by category
    const summary = {
      total: 0,
      healthy: 0,
      monitoring: 0,
      'at-risk': 0,
      critical: 0,
      disrupted: 0,
    };

    (data || []).forEach((assessment) => {
      summary.total++;
      const category = assessment.risk_category as keyof Omit<typeof summary, 'total'>;
      if (category in summary) {
        summary[category]++;
      }
    });

    res.json({ summary });
  } catch (error) {
    console.error('[Risk API] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/risk/affected-entities/:eventId
 * Get affected entities for an event's risk assessment
 */
router.get('/affected-entities/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;

    const { data, error } = await supabase
      .from('risk_assessments')
      .select('affected_entities')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.json({ affectedEntities: [] });
      }
      console.error('[Risk API] Error fetching affected entities:', error);
      return res.status(500).json({ error: 'Failed to fetch affected entities' });
    }

    res.json({ affectedEntities: data?.affected_entities || [] });
  } catch (error) {
    console.error('[Risk API] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
