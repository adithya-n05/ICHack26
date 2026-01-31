import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_supply_chains')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || null);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
