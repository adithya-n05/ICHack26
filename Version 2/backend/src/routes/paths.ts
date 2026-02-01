import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const companyId = req.query.company_id;
    if (!companyId || typeof companyId !== 'string') {
      return res.status(400).json({ error: 'company_id is required' });
    }

    const { data: paths, error: pathError } = await supabase
      .from('supply_paths')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (pathError) {
      return res.status(500).json({ error: pathError.message });
    }

    const path = paths?.[0];
    if (!path) {
      return res.json({ path: null, edges: [] });
    }

    const { data: edges, error: edgesError } = await supabase
      .from('connections')
      .select('*')
      .eq('path_id', path.id)
      .order('sequence', { ascending: true });

    if (edgesError) {
      return res.status(500).json({ error: edgesError.message });
    }

    const transformedPath = {
      id: path.id,
      companyId: path.company_id,
      productCategory: path.product_category,
      status: path.status,
      createdAt: path.created_at,
      updatedAt: path.updated_at,
      company_id: path.company_id,
      product_category: path.product_category,
      created_at: path.created_at,
      updated_at: path.updated_at,
    };

    const transformedEdges = (edges || []).map((edge: any) => ({
      id: edge.id,
      fromNodeId: edge.from_node_id,
      toNodeId: edge.to_node_id,
      sequence: edge.sequence,
      costScore: edge.cost_score,
      riskScore: edge.risk_score,
      tariffCost: edge.tariff_cost,
      productCategory: edge.product_category,
      status: edge.status,
      isPathEdge: edge.is_path_edge,
      transportMode: edge.transport_mode,
      leadTimeDays: edge.lead_time_days,
      from_node_id: edge.from_node_id,
      to_node_id: edge.to_node_id,
      cost_score: edge.cost_score,
      risk_score: edge.risk_score,
      tariff_cost: edge.tariff_cost,
      product_category: edge.product_category,
      is_path_edge: edge.is_path_edge,
      transport_mode: edge.transport_mode,
      lead_time_days: edge.lead_time_days,
    }));

    return res.json({ path: transformedPath, edges: transformedEdges });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
