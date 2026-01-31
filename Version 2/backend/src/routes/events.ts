import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { type, severity, active } = req.query;

    let query = supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    if (severity) {
      query = query.gte('severity', parseInt(severity as string));
    }

    if (active === 'true') {
      query = query.is('end_date', null);
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
