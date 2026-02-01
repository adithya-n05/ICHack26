// backend/src/routes/rerouting.ts
// Graph-based intelligent rerouting API routes

import { Router } from 'express';
import {
  findReroutingAlternatives,
  analyzeRouteResilience,
  getChokepointRisks,
  ReroutingOptions,
} from '../services/rerouting';

const router = Router();

/**
 * POST /api/rerouting/find
 * Find optimal rerouting alternatives
 * 
 * Body:
 * {
 *   from: string,          // Origin port (name or UNLOCODE)
 *   to: string,            // Destination port (name or UNLOCODE)
 *   options?: {
 *     optimizeFor: 'risk' | 'time' | 'cost' | 'balanced',
 *     maxHops: number,
 *     excludeCountries: string[],
 *     excludePorts: string[],
 *     maxRiskThreshold: number
 *   }
 * }
 */
router.post('/find', async (req, res) => {
  try {
    const { from, to, options } = req.body;
    
    if (!from || !to) {
      return res.status(400).json({ 
        error: 'Both "from" and "to" parameters are required' 
      });
    }
    
    const reroutingOptions: Partial<ReroutingOptions> = {
      optimizeFor: options?.optimizeFor || 'balanced',
      maxHops: options?.maxHops || 6,
      excludeCountries: options?.excludeCountries || [],
      excludePorts: options?.excludePorts || [],
      excludeChokepoints: options?.excludeChokepoints || [],
      maxRiskThreshold: options?.maxRiskThreshold || 0.8,
      timeWeight: options?.timeWeight || 0.3,
      costWeight: options?.costWeight || 0.3,
      riskWeight: options?.riskWeight || 0.4,
    };
    
    const result = await findReroutingAlternatives(from, to, reroutingOptions);
    
    res.json({
      from,
      to,
      options: reroutingOptions,
      ...result,
    });
  } catch (err) {
    console.error('Rerouting error:', err);
    res.status(500).json({ error: 'Failed to find rerouting alternatives' });
  }
});

/**
 * POST /api/rerouting/analyze
 * Analyze resilience of a given route
 * 
 * Body:
 * {
 *   route: string[]  // Array of port UNLOCODEs
 * }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { route } = req.body;
    
    if (!Array.isArray(route) || route.length < 2) {
      return res.status(400).json({ 
        error: 'Route must be an array of at least 2 port codes' 
      });
    }
    
    const analysis = await analyzeRouteResilience(route);
    
    res.json({
      route,
      ...analysis,
    });
  } catch (err) {
    console.error('Route analysis error:', err);
    res.status(500).json({ error: 'Failed to analyze route' });
  }
});

/**
 * GET /api/rerouting/chokepoints
 * Get list of critical maritime chokepoints with risk levels
 */
router.get('/chokepoints', (req, res) => {
  try {
    const chokepoints = getChokepointRisks();
    res.json({
      count: chokepoints.length,
      chokepoints,
    });
  } catch (err) {
    console.error('Chokepoints error:', err);
    res.status(500).json({ error: 'Failed to get chokepoint data' });
  }
});

/**
 * GET /api/rerouting/quick
 * Quick rerouting query for common routes
 */
router.get('/quick', async (req, res) => {
  try {
    const { from, to, avoid } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({ 
        error: 'Both "from" and "to" parameters are required' 
      });
    }
    
    const excludeCountries = avoid 
      ? (avoid as string).split(',').map(s => s.trim())
      : [];
    
    const result = await findReroutingAlternatives(
      from as string, 
      to as string, 
      {
        optimizeFor: 'balanced',
        excludeCountries,
        maxHops: 5,
      }
    );
    
    // Return simplified response
    res.json({
      from,
      to,
      avoided: excludeCountries,
      bestRoute: result.alternatives.length > 0 ? {
        path: result.alternatives[0].path.map(p => p.name),
        distance: result.alternatives[0].totalDistance,
        time: result.alternatives[0].estimatedTime,
        risk: Math.round(result.alternatives[0].riskScore * 100),
      } : null,
      alternativeCount: result.alternatives.length,
      recommendation: result.recommendation,
    });
  } catch (err) {
    console.error('Quick rerouting error:', err);
    res.status(500).json({ error: 'Failed to find quick route' });
  }
});

/**
 * POST /api/rerouting/compare
 * Compare multiple routing options
 * 
 * Body:
 * {
 *   from: string,
 *   to: string,
 *   scenarios: Array<{ name: string, excludeCountries: string[], optimizeFor: string }>
 * }
 */
router.post('/compare', async (req, res) => {
  try {
    const { from, to, scenarios } = req.body;
    
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to are required' });
    }
    
    if (!Array.isArray(scenarios) || scenarios.length === 0) {
      return res.status(400).json({ error: 'scenarios array is required' });
    }
    
    const results = await Promise.all(
      scenarios.map(async (scenario: any) => {
        const result = await findReroutingAlternatives(from, to, {
          optimizeFor: scenario.optimizeFor || 'balanced',
          excludeCountries: scenario.excludeCountries || [],
          excludePorts: scenario.excludePorts || [],
        });
        
        return {
          scenarioName: scenario.name,
          bestRoute: result.alternatives.length > 0 ? {
            path: result.alternatives[0].path.map(p => p.name),
            distance: result.alternatives[0].totalDistance,
            time: result.alternatives[0].estimatedTime,
            cost: result.alternatives[0].estimatedCost,
            risk: result.alternatives[0].riskScore,
            reliability: result.alternatives[0].reliability,
          } : null,
          alternativesFound: result.alternatives.length,
        };
      })
    );
    
    // Determine best scenario
    const validResults = results.filter(r => r.bestRoute !== null);
    let bestScenario = null;
    
    if (validResults.length > 0) {
      // Find lowest combined score (normalized)
      bestScenario = validResults.reduce((best, current) => {
        if (!current.bestRoute) return best;
        if (!best.bestRoute) return current;
        
        const currentScore = 
          current.bestRoute.risk * 0.4 + 
          (current.bestRoute.time / 1000) * 0.3 + 
          (current.bestRoute.cost / 1000) * 0.3;
        
        const bestScore = 
          best.bestRoute.risk * 0.4 + 
          (best.bestRoute.time / 1000) * 0.3 + 
          (best.bestRoute.cost / 1000) * 0.3;
        
        return currentScore < bestScore ? current : best;
      });
    }
    
    res.json({
      from,
      to,
      scenarios: results,
      recommendation: bestScenario 
        ? `Recommended: "${bestScenario.scenarioName}" scenario` 
        : 'No viable routes found for comparison',
    });
  } catch (err) {
    console.error('Route comparison error:', err);
    res.status(500).json({ error: 'Failed to compare routes' });
  }
});

export default router;
