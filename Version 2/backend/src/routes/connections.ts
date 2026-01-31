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

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
