import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { limit = 50, category } = req.query;

    // Validate limit to prevent NaN or negative values
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit as string) || 50));

    let query = supabase
      .from('news')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(parsedLimit);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Transform DB fields to camelCase for frontend
    const transformed = (data || []).map(item => ({
      id: item.id,
      title: item.title,
      description: item.description || item.summary || '',
      summary: item.summary || item.description || '',
      url: item.source_url,
      source: item.source,
      category: item.category,
      publishedAt: item.published_at,
      createdAt: item.created_at,
    }));

    res.json(transformed);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
