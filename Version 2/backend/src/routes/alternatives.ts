import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { material, excludeCountry, excludeRegion } = req.query;

    if (!material) {
      return res.status(400).json({ error: 'Material parameter is required' });
    }

    let query = supabase
      .from('companies')
      .select('*')
      .contains('products', [material]);

    if (excludeCountry) {
      query = query.neq('country', excludeCountry);
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
