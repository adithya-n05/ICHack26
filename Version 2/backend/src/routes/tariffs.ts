import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { fromCountry, toCountry, productCategory } = req.query;

    let query = supabase.from('tariffs').select('*');

    if (fromCountry) {
      query = query.eq('from_country', fromCountry);
    }

    if (toCountry) {
      query = query.eq('to_country', toCountry);
    }

    if (productCategory) {
      query = query.eq('product_category', productCategory);
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
