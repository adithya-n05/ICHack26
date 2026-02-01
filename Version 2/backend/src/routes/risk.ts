// backend/src/routes/risk.ts
// API routes for Risk Assessment and Mitigation

import { Router } from 'express';
import { getDriver } from '../lib/neo4j';
import {
  calculateCompanyRisk,
  calculatePortRisk,
  calculateCountryRisk,
  getHighRiskEntities,
  getSupplyChainHealth,
} from '../services/riskEngine';
import {
  findAlternativeSuppliers,
  findAlternativeRoutes,
  generateMitigationPlan,
  getQuickMitigations,
} from '../services/mitigationAgent';
import {
  assessRiskML,
  analyzeNewsSentiment,
  findSimilarHistoricalEvents,
  batchAssessRisk,
} from '../services/mlRiskEngine';
import {
  runMonteCarloSimulation,
  runQuickSimulation,
} from '../services/monteCarlo';
import {
  explainRiskScore,
  getGlobalFeatureImportance,
  whatIfAnalysis,
} from '../services/explainability';

const router = Router();

// Check if graph is available
function graphAvailable(): boolean {
  return getDriver() !== null;
}

// GET /api/risk/health - Get overall supply chain health
router.get('/health', async (req, res) => {
  try {
    const health = await getSupplyChainHealth();
    res.json(health);
  } catch (err) {
    console.error('Health check error:', err);
    res.status(500).json({ error: 'Failed to get health status' });
  }
});

// GET /api/risk/high-risk - Get entities above risk threshold
router.get('/high-risk', async (req, res) => {
  if (!graphAvailable()) {
    return res.json([]); // Return empty if no graph
  }

  try {
    const { minScore = 40 } = req.query;
    const entities = await getHighRiskEntities(parseInt(minScore as string));
    res.json(entities);
  } catch (err) {
    console.error('High risk entities error:', err);
    res.status(500).json({ error: 'Failed to get high risk entities' });
  }
});

// GET /api/risk/company/:id - Get risk score for a company
router.get('/company/:id', async (req, res) => {
  if (!graphAvailable()) {
    return res.status(503).json({ error: 'Knowledge graph not configured' });
  }

  try {
    const { id } = req.params;
    const risk = await calculateCompanyRisk(id);
    
    if (!risk) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    res.json(risk);
  } catch (err) {
    console.error('Company risk error:', err);
    res.status(500).json({ error: 'Failed to calculate company risk' });
  }
});

// GET /api/risk/port/:id - Get risk score for a port
router.get('/port/:id', async (req, res) => {
  if (!graphAvailable()) {
    return res.status(503).json({ error: 'Knowledge graph not configured' });
  }

  try {
    const { id } = req.params;
    const risk = await calculatePortRisk(id);
    
    if (!risk) {
      return res.status(404).json({ error: 'Port not found' });
    }
    
    res.json(risk);
  } catch (err) {
    console.error('Port risk error:', err);
    res.status(500).json({ error: 'Failed to calculate port risk' });
  }
});

// GET /api/risk/country/:code - Get risk score for a country
router.get('/country/:code', async (req, res) => {
  if (!graphAvailable()) {
    return res.status(503).json({ error: 'Knowledge graph not configured' });
  }

  try {
    const { code } = req.params;
    const risk = await calculateCountryRisk(code.toUpperCase());
    
    if (!risk) {
      return res.status(404).json({ error: 'Country not found' });
    }
    
    res.json(risk);
  } catch (err) {
    console.error('Country risk error:', err);
    res.status(500).json({ error: 'Failed to calculate country risk' });
  }
});

// GET /api/risk/alternatives/suppliers/:companyId - Find alternative suppliers
router.get('/alternatives/suppliers/:companyId', async (req, res) => {
  if (!graphAvailable()) {
    return res.json([]); // Return empty if no graph
  }

  try {
    const { companyId } = req.params;
    const { product, excludeCountries } = req.query;
    
    const excluded = excludeCountries 
      ? (excludeCountries as string).split(',').map(c => c.trim().toUpperCase())
      : [];
    
    const alternatives = await findAlternativeSuppliers(
      companyId,
      product as string | undefined,
      excluded
    );
    
    res.json(alternatives);
  } catch (err) {
    console.error('Alternative suppliers error:', err);
    res.status(500).json({ error: 'Failed to find alternatives' });
  }
});

// GET /api/risk/alternatives/routes - Find alternative routes
router.get('/alternatives/routes', async (req, res) => {
  if (!graphAvailable()) {
    return res.json([]); // Return empty if no graph
  }

  try {
    const { from, to, excludeCountries, maxHops = 5 } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to parameters required' });
    }
    
    const excluded = excludeCountries 
      ? (excludeCountries as string).split(',').map(c => c.trim().toUpperCase())
      : [];
    
    const routes = await findAlternativeRoutes(
      from as string,
      to as string,
      excluded,
      parseInt(maxHops as string)
    );
    
    res.json(routes);
  } catch (err) {
    console.error('Alternative routes error:', err);
    res.status(500).json({ error: 'Failed to find alternative routes' });
  }
});

// GET /api/risk/mitigation/:entityType/:entityId - Generate mitigation plan
router.get('/mitigation/:entityType/:entityId', async (req, res) => {
  if (!graphAvailable()) {
    return res.status(503).json({ error: 'Knowledge graph not configured' });
  }

  try {
    const { entityType, entityId } = req.params;
    
    if (entityType !== 'company' && entityType !== 'port') {
      return res.status(400).json({ error: 'entityType must be company or port' });
    }
    
    const plan = await generateMitigationPlan(entityId, entityType);
    
    if (!plan) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    res.json(plan);
  } catch (err) {
    console.error('Mitigation plan error:', err);
    res.status(500).json({ error: 'Failed to generate mitigation plan' });
  }
});

// POST /api/risk/quick-mitigations - Get quick mitigations for multiple entities
router.post('/quick-mitigations', async (req, res) => {
  if (!graphAvailable()) {
    return res.json([]); // Return empty if no graph
  }

  try {
    const { entityIds } = req.body;
    
    if (!Array.isArray(entityIds)) {
      return res.status(400).json({ error: 'entityIds must be an array' });
    }
    
    const mitigations = await getQuickMitigations(entityIds);
    res.json(mitigations);
  } catch (err) {
    console.error('Quick mitigations error:', err);
    res.status(500).json({ error: 'Failed to get mitigations' });
  }
});

// ============================================================================
// ML-ENHANCED ENDPOINTS
// ============================================================================

// GET /api/risk/ml/:entityType/:entityId - ML-based risk assessment
router.get('/ml/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    if (!['company', 'port', 'country'].includes(entityType)) {
      return res.status(400).json({ error: 'entityType must be company, port, or country' });
    }
    
    const assessment = await assessRiskML(
      entityId,
      entityType as 'company' | 'port' | 'country'
    );
    
    res.json(assessment);
  } catch (err) {
    console.error('ML risk assessment error:', err);
    res.status(500).json({ error: 'Failed to perform ML risk assessment' });
  }
});

// POST /api/risk/ml/batch - Batch ML risk assessment
router.post('/ml/batch', async (req, res) => {
  try {
    const { entities } = req.body;
    
    if (!Array.isArray(entities)) {
      return res.status(400).json({ error: 'entities must be an array' });
    }
    
    // Validate entity format
    for (const entity of entities) {
      if (!entity.id || !['company', 'port', 'country'].includes(entity.type)) {
        return res.status(400).json({ 
          error: 'Each entity must have id and type (company, port, or country)' 
        });
      }
    }
    
    const assessments = await batchAssessRisk(entities);
    res.json(assessments);
  } catch (err) {
    console.error('Batch ML risk assessment error:', err);
    res.status(500).json({ error: 'Failed to perform batch ML assessment' });
  }
});

// POST /api/risk/analyze-text - Analyze arbitrary text for risk sentiment
router.post('/analyze-text', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }
    
    const sentiment = await analyzeNewsSentiment(text);
    
    // Convert sentiment to risk interpretation
    const riskLevel = sentiment.score < -0.5 ? 'critical' 
                    : sentiment.score < -0.2 ? 'high'
                    : sentiment.score < 0.2 ? 'moderate'
                    : sentiment.score < 0.5 ? 'low'
                    : 'minimal';
    
    res.json({
      sentiment,
      riskLevel,
      riskScore: Math.round((1 - sentiment.score) * 5 * 10) / 10, // 0-10 scale
    });
  } catch (err) {
    console.error('Text analysis error:', err);
    res.status(500).json({ error: 'Failed to analyze text' });
  }
});

// POST /api/risk/similar-events - Find similar historical events
router.post('/similar-events', async (req, res) => {
  try {
    const { title, description, limit = 5 } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }
    
    const similar = await findSimilarHistoricalEvents({ title, description }, limit);
    res.json(similar);
  } catch (err) {
    console.error('Similar events error:', err);
    res.status(500).json({ error: 'Failed to find similar events' });
  }
});

// ============================================================================
// MONTE CARLO SIMULATION ENDPOINTS
// ============================================================================

// POST /api/risk/simulation - Run full Monte Carlo simulation
router.post('/simulation', async (req, res) => {
  try {
    const { 
      companyId, 
      routeOrigin, 
      routeDestination,
      supplyChainNodes,
      iterations = 10000,
      timeHorizonDays = 90,
      confidenceLevel = 0.95,
      includeBlackSwans = true,
    } = req.body;
    
    const result = await runMonteCarloSimulation(
      { companyId, routeOrigin, routeDestination, supplyChainNodes },
      { iterations, timeHorizonDays, confidenceLevel, includeBlackSwans }
    );
    
    res.json(result);
  } catch (err) {
    console.error('Monte Carlo simulation error:', err);
    res.status(500).json({ error: 'Failed to run simulation' });
  }
});

// POST /api/risk/simulation/quick - Run quick simulation (fewer iterations)
router.post('/simulation/quick', async (req, res) => {
  try {
    const { companyId, routeOrigin, routeDestination } = req.body;
    
    const result = await runQuickSimulation({ companyId, routeOrigin, routeDestination });
    res.json(result);
  } catch (err) {
    console.error('Quick simulation error:', err);
    res.status(500).json({ error: 'Failed to run quick simulation' });
  }
});

// ============================================================================
// EXPLAINABILITY ENDPOINTS (SHAP-like)
// ============================================================================

// GET /api/risk/explain/:entityType/:entityId - Explain risk score
router.get('/explain/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { riskScore } = req.query;
    
    if (!['company', 'port', 'country'].includes(entityType)) {
      return res.status(400).json({ error: 'entityType must be company, port, or country' });
    }
    
    const score = riskScore ? parseFloat(riskScore as string) : 5;
    
    const explanation = await explainRiskScore(
      entityId,
      entityType as 'company' | 'port' | 'country',
      score
    );
    
    res.json(explanation);
  } catch (err) {
    console.error('Explain risk error:', err);
    res.status(500).json({ error: 'Failed to explain risk' });
  }
});

// GET /api/risk/features/importance - Get global feature importance
router.get('/features/importance', async (req, res) => {
  try {
    const importance = getGlobalFeatureImportance();
    res.json(importance);
  } catch (err) {
    console.error('Feature importance error:', err);
    res.status(500).json({ error: 'Failed to get feature importance' });
  }
});

// POST /api/risk/what-if - Run what-if analysis
router.post('/what-if', async (req, res) => {
  try {
    const { entityId, entityType, currentRisk, featureChanges } = req.body;
    
    if (!entityId || !entityType || currentRisk === undefined || !featureChanges) {
      return res.status(400).json({ 
        error: 'entityId, entityType, currentRisk, and featureChanges required' 
      });
    }
    
    const result = await whatIfAnalysis(
      entityId,
      entityType,
      currentRisk,
      featureChanges
    );
    
    res.json(result);
  } catch (err) {
    console.error('What-if analysis error:', err);
    res.status(500).json({ error: 'Failed to run what-if analysis' });
  }
});

export default router;
