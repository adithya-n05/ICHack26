// backend/src/routes/graph.ts
// API routes for Knowledge Graph operations

import { Router } from 'express';
import { getDriver } from '../lib/neo4j';
import { 
  fullSync, 
  syncEvents,
  getAffectedRoutes,
  getCompanyExposure,
  findAlternativeRoutes,
  getPortCentrality,
  getSupplyChainTree,
  getGraphStats,
  getRouteEvents,
} from '../graph';

const router = Router();

// Check if graph is available
function graphAvailable(): boolean {
  return getDriver() !== null;
}

// GET /api/graph/stats - Get graph statistics
router.get('/stats', async (req, res) => {
  if (!graphAvailable()) {
    return res.status(503).json({ error: 'Knowledge graph not configured' });
  }

  try {
    const stats = await getGraphStats();
    res.json(stats);
  } catch (err) {
    console.error('Graph stats error:', err);
    res.status(500).json({ error: 'Failed to get graph stats' });
  }
});

// POST /api/graph/sync - Trigger full graph sync
router.post('/sync', async (req, res) => {
  if (!graphAvailable()) {
    return res.status(503).json({ error: 'Knowledge graph not configured' });
  }

  try {
    const result = await fullSync();
    res.json({ success: true, synced: result });
  } catch (err) {
    console.error('Graph sync error:', err);
    res.status(500).json({ error: 'Failed to sync graph' });
  }
});

// POST /api/graph/sync/events - Sync only events
router.post('/sync/events', async (req, res) => {
  if (!graphAvailable()) {
    return res.status(503).json({ error: 'Knowledge graph not configured' });
  }

  try {
    const { daysBack = 7 } = req.body;
    const count = await syncEvents(daysBack);
    res.json({ success: true, synced: count });
  } catch (err) {
    console.error('Event sync error:', err);
    res.status(500).json({ error: 'Failed to sync events' });
  }
});

// GET /api/graph/affected-routes - Get routes affected by events
router.get('/affected-routes', async (req, res) => {
  if (!graphAvailable()) {
    return res.status(503).json({ error: 'Knowledge graph not configured' });
  }

  try {
    const { minSeverity = 5 } = req.query;
    const routes = await getAffectedRoutes(parseInt(minSeverity as string));
    res.json(routes);
  } catch (err) {
    console.error('Affected routes error:', err);
    res.status(500).json({ error: 'Failed to get affected routes' });
  }
});

// GET /api/graph/company/:id/exposure - Get company exposure score
router.get('/company/:id/exposure', async (req, res) => {
  if (!graphAvailable()) {
    return res.status(503).json({ error: 'Knowledge graph not configured' });
  }

  try {
    const { id } = req.params;
    const exposure = await getCompanyExposure(id);
    res.json(exposure);
  } catch (err) {
    console.error('Company exposure error:', err);
    res.status(500).json({ error: 'Failed to get company exposure' });
  }
});

// GET /api/graph/company/:id/supply-chain - Get supply chain tree
router.get('/company/:id/supply-chain', async (req, res) => {
  if (!graphAvailable()) {
    return res.status(503).json({ error: 'Knowledge graph not configured' });
  }

  try {
    const { id } = req.params;
    const { depth = 3 } = req.query;
    const tree = await getSupplyChainTree(id, parseInt(depth as string));
    res.json(tree);
  } catch (err) {
    console.error('Supply chain tree error:', err);
    res.status(500).json({ error: 'Failed to get supply chain' });
  }
});

// GET /api/graph/routes/alternatives - Find alternative routes
router.get('/routes/alternatives', async (req, res) => {
  if (!graphAvailable()) {
    return res.status(503).json({ error: 'Knowledge graph not configured' });
  }

  try {
    const { from, to, excludeCountries } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to parameters required' });
    }

    const excluded = excludeCountries 
      ? (excludeCountries as string).split(',') 
      : [];
    
    const alternatives = await findAlternativeRoutes(
      from as string, 
      to as string, 
      excluded
    );
    res.json(alternatives);
  } catch (err) {
    console.error('Alternative routes error:', err);
    res.status(500).json({ error: 'Failed to find alternatives' });
  }
});

// GET /api/graph/ports/centrality - Get port centrality scores
router.get('/ports/centrality', async (req, res) => {
  if (!graphAvailable()) {
    return res.status(503).json({ error: 'Knowledge graph not configured' });
  }

  try {
    const centrality = await getPortCentrality();
    res.json(centrality);
  } catch (err) {
    console.error('Port centrality error:', err);
    res.status(500).json({ error: 'Failed to get port centrality' });
  }
});

// GET /api/graph/route/:id/events - Get events affecting a route
router.get('/route/:id/events', async (req, res) => {
  if (!graphAvailable()) {
    return res.status(503).json({ error: 'Knowledge graph not configured' });
  }

  try {
    const { id } = req.params;
    const events = await getRouteEvents(id);
    res.json(events);
  } catch (err) {
    console.error('Route events error:', err);
    res.status(500).json({ error: 'Failed to get route events' });
  }
});

export default router;
