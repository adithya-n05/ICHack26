import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const companyId =
      (typeof req.query.company_id === 'string' && req.query.company_id) ||
      (typeof req.query.companyId === 'string' && req.query.companyId);

    if (!companyId) {
      return res.status(400).json({ error: 'company_id is required' });
    }

    const { data: paths, error } = await supabase
      .from('supply_paths')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const path = paths?.[0];
    if (!path) {
      return res.status(404).json({ error: 'Path not found' });
    }

    const { data: edges, error: edgesError } = await supabase
      .from('connections')
      .select('*')
      .eq('path_id', path.id)
      .order('sequence', { ascending: true });

    if (edgesError) {
      return res.status(500).json({ error: edgesError.message });
    }

    const transformedEdges = (edges || []).map((conn: any) => ({
      id: conn.id,
      fromNodeId: conn.from_node_id,
      toNodeId: conn.to_node_id,
      transportMode: conn.transport_mode,
      status: conn.status,
      isUserConnection: conn.is_user_connection,
      materials: conn.materials,
      description: conn.description,
      leadTimeDays: conn.lead_time_days,
      pathId: conn.path_id,
      sequence: conn.sequence,
      costScore: conn.cost_score,
      riskScore: conn.risk_score,
      tariffCost: conn.tariff_cost,
      productCategory: conn.product_category,
      isPathEdge: conn.is_path_edge,
      // Keep snake_case versions for backward compatibility
      from_node_id: conn.from_node_id,
      to_node_id: conn.to_node_id,
      transport_mode: conn.transport_mode,
      is_user_connection: conn.is_user_connection,
      lead_time_days: conn.lead_time_days,
      path_id: conn.path_id,
      cost_score: conn.cost_score,
      risk_score: conn.risk_score,
      tariff_cost: conn.tariff_cost,
      product_category: conn.product_category,
      is_path_edge: conn.is_path_edge,
    }));

    res.json({
      path: {
        id: path.id,
        companyId: path.company_id,
        productCategory: path.product_category,
        status: path.status,
        createdAt: path.created_at,
        updatedAt: path.updated_at,
        // snake_case compatibility
        company_id: path.company_id,
        product_category: path.product_category,
        created_at: path.created_at,
        updated_at: path.updated_at,
      },
      edges: transformedEdges,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
