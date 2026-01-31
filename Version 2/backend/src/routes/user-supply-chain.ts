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

router.post('/', async (req, res) => {
  try {
    const { company, suppliers, materials, connections } = req.body;

    if (!company || !company.name) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    await supabase.from('user_supply_chains').delete().neq('id', '');

    const { data, error } = await supabase
      .from('user_supply_chains')
      .insert({
        company_name: company.name,
        company_city: company.location?.city,
        company_country: company.location?.country,
        suppliers: suppliers || [],
        materials: materials || [],
        connections: connections || [],
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ success: true, id: data.id });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', async (req, res) => {
  try {
    const { company, suppliers, materials, connections } = req.body;

    const { data: existing } = await supabase
      .from('user_supply_chains')
      .select('id')
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'No supply chain found. Use POST to create.' });
    }

    const { data, error } = await supabase
      .from('user_supply_chains')
      .update({
        company_name: company?.name,
        company_city: company?.location?.city,
        company_country: company?.location?.country,
        suppliers: suppliers,
        materials: materials,
        connections: connections,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const { error } = await supabase
      .from('user_supply_chains')
      .delete()
      .neq('id', '');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, message: 'Supply chain deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
