import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

const transformConnection = (conn: any) => ({
  id: conn.id,
  fromNodeId: conn.from_node_id,
  toNodeId: conn.to_node_id,
  transportMode: conn.transport_mode,
  status: conn.status,
  isUserConnection: conn.is_user_connection,
  materials: conn.materials,
  description: conn.description,
  leadTimeDays: conn.lead_time_days,
  from_node_id: conn.from_node_id,
  to_node_id: conn.to_node_id,
  transport_mode: conn.transport_mode,
  is_user_connection: conn.is_user_connection,
  lead_time_days: conn.lead_time_days,
});

router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_connections')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json((data || []).map(transformConnection));
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      from_node_id,
      to_node_id,
      transport_mode,
      status,
      materials,
      description,
      lead_time_days,
    } = req.body || {};

    if (!from_node_id || !to_node_id) {
      return res.status(400).json({ error: 'from_node_id and to_node_id are required' });
    }

    const payload = {
      from_node_id,
      to_node_id,
      transport_mode: transport_mode ?? 'land',
      status: status ?? 'healthy',
      materials: materials ?? [],
      description: description ?? null,
      lead_time_days: lead_time_days ?? null,
      is_user_connection: true,
    };

    const { data, error } = await supabase
      .from('user_connections')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(transformConnection(data));
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    const { error } = await supabase
      .from('user_connections')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
