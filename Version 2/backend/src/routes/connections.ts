import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { status, fromNodeId, toNodeId, isUserConnection } = req.query;

    let query = supabase.from('connections').select('*');

    if (status) {
      query = query.eq('status', status);
    }

    if (fromNodeId) {
      query = query.eq('from_node_id', fromNodeId);
    }

    if (toNodeId) {
      query = query.eq('to_node_id', toNodeId);
    }

    if (isUserConnection !== undefined) {
      query = query.eq('is_user_connection', isUserConnection === 'true');
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Transform DB fields to camelCase for frontend
    const transformed = (data || []).map((conn: any) => ({
      id: conn.id,
      fromNodeId: conn.from_node_id,
      toNodeId: conn.to_node_id,
      transportMode: conn.transport_mode,
      status: conn.status,
      isUserConnection: conn.is_user_connection,
      materials: conn.materials,
      description: conn.description,
      leadTimeDays: conn.lead_time_days,
      // Keep snake_case versions for backward compatibility
      from_node_id: conn.from_node_id,
      to_node_id: conn.to_node_id,
      transport_mode: conn.transport_mode,
      is_user_connection: conn.is_user_connection,
      lead_time_days: conn.lead_time_days,
    }));

    res.json(transformed);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
