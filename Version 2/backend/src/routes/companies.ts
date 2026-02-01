import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { type, country } = req.query;

    let query = supabase.from('companies').select('*');

    if (type) {
      query = query.eq('type', type);
    }

    if (country) {
      query = query.eq('country', country);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Transform to include location object for frontend compatibility
    const transformed = (data || []).map((company: any) => ({
      ...company,
      location: { lat: company.lat, lng: company.lng },
    }));

    res.json(transformed);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Transform to include location object
    res.json({
      ...data,
      location: { lat: data.lat, lng: data.lng },
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
