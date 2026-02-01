import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { type, severity, active, minLat, maxLat, minLng, maxLng } = req.query;

    let query = supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: false })
      // Filter out events with invalid (0,0) coordinates
      .not('lat', 'eq', 0)
      .not('lng', 'eq', 0);

    if (type) {
      query = query.eq('type', type);
    }

    if (severity) {
      query = query.gte('severity', parseInt(severity as string));
    }

    if (active === 'true') {
      query = query.is('end_date', null);
    }

    if (minLat && maxLat && minLng && maxLng) {
      query = query
        .gte('lat', parseFloat(minLat as string))
        .lte('lat', parseFloat(maxLat as string))
        .gte('lng', parseFloat(minLng as string))
        .lte('lng', parseFloat(maxLng as string));
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Transform to include location object for frontend compatibility
    const transformed = (data || []).map((event: any) => ({
      ...event,
      location: { lat: event.lat, lng: event.lng },
      startDate: event.start_date,
      endDate: event.end_date,
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
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Transform to include location object
    res.json({
      ...data,
      location: { lat: data.lat, lng: data.lng },
      startDate: data.start_date,
      endDate: data.end_date,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
