import { Express, Request, Response } from 'express';
import { USGSService } from '../services/usgs.js';
import { GDELTService } from '../services/gdelt.js';

const usgsService = new USGSService();
const gdeltService = new GDELTService();

export function setupRoutes(app: Express) {
  // ====== RISK ZONES ======

  /**
   * GET /api/risk-zones/earthquakes
   * Fetch recent earthquake data from USGS
   */
  app.get('/api/risk-zones/earthquakes', async (req: Request, res: Response) => {
    try {
      const minMagnitude = parseFloat(req.query.minMagnitude as string) || 4.0;
      const days = parseInt(req.query.days as string) || 7;

      const earthquakes = await usgsService.fetchRecentEarthquakes(minMagnitude, days);
      res.json({
        success: true,
        count: earthquakes.length,
        data: earthquakes,
      });
    } catch (error) {
      console.error('Error fetching earthquakes:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch earthquake data' });
    }
  });

  /**
   * GET /api/risk-zones/near
   * Fetch earthquakes near a specific location
   */
  app.get('/api/risk-zones/near', async (req: Request, res: Response) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      const radius = parseFloat(req.query.radius as string) || 500;

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ success: false, error: 'Invalid coordinates' });
      }

      const earthquakes = await usgsService.fetchNearLocation(lat, lng, radius);
      res.json({
        success: true,
        count: earthquakes.length,
        data: earthquakes,
      });
    } catch (error) {
      console.error('Error fetching nearby earthquakes:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch earthquake data' });
    }
  });

  // ====== NEWS ======

  /**
   * GET /api/news
   * Fetch supply chain related news from GDELT
   */
  app.get('/api/news', async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      const news = query
        ? await gdeltService.fetchSupplyChainNews(query)
        : await gdeltService.fetchSupplyChainNews();

      res.json({
        success: true,
        count: news.length,
        data: news,
      });
    } catch (error) {
      console.error('Error fetching news:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch news' });
    }
  });

  /**
   * GET /api/news/region/:region
   * Fetch news for a specific region
   */
  app.get('/api/news/region/:region', async (req: Request, res: Response) => {
    try {
      const { region } = req.params;
      const news = await gdeltService.fetchRegionNews(region);

      res.json({
        success: true,
        count: news.length,
        region,
        data: news,
      });
    } catch (error) {
      console.error('Error fetching region news:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch news' });
    }
  });

  // ====== SUPPLY CHAIN ======

  /**
   * GET /api/supply-chain/nodes
   * Get all supply chain nodes (returns mock data for now)
   */
  app.get('/api/supply-chain/nodes', (req: Request, res: Response) => {
    // TODO: Connect to database
    res.json({
      success: true,
      message: 'Connect to Supabase for persistent data',
      data: [],
    });
  });

  /**
   * POST /api/supply-chain/nodes
   * Add a new supply chain node
   */
  app.post('/api/supply-chain/nodes', (req: Request, res: Response) => {
    const node = req.body;
    // TODO: Save to database
    console.log('New node:', node);
    res.json({
      success: true,
      message: 'Node created (in-memory only)',
      data: { ...node, id: `node-${Date.now()}` },
    });
  });

  /**
   * GET /api/supply-chain/routes
   * Get all supply chain routes
   */
  app.get('/api/supply-chain/routes', (req: Request, res: Response) => {
    // TODO: Connect to database
    res.json({
      success: true,
      message: 'Connect to Supabase for persistent data',
      data: [],
    });
  });

  /**
   * POST /api/supply-chain/routes
   * Add a new supply chain route
   */
  app.post('/api/supply-chain/routes', (req: Request, res: Response) => {
    const route = req.body;
    // TODO: Save to database
    console.log('New route:', route);
    res.json({
      success: true,
      message: 'Route created (in-memory only)',
      data: { ...route, id: `route-${Date.now()}` },
    });
  });

  // ====== SIMULATION ======

  /**
   * POST /api/simulate
   * Run a what-if simulation (forwards to Python agent)
   */
  app.post('/api/simulate', async (req: Request, res: Response) => {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    // TODO: Forward to Python LangGraph agent
    // For now, return mock response
    res.json({
      success: true,
      query,
      result: {
        summary: `Simulation analysis for: "${query}"`,
        affectedRoutes: ['tsmc-shenzhen', 'shanghai-la'],
        recommendations: [
          { supplier: 'Samsung Foundry', reason: 'Lower risk, +8% cost' },
          { supplier: 'Intel Foundry', reason: 'US-based, +22% cost' },
        ],
        riskChange: '+25%',
        costImpact: '+15%',
        leadTimeImpact: '+7 days',
      },
    });
  });

  // ====== PREDICTIONS ======

  /**
   * GET /api/predictions/disruption
   * Get disruption probability for routes
   */
  app.get('/api/predictions/disruption', (req: Request, res: Response) => {
    // TODO: Connect to Python prediction service
    res.json({
      success: true,
      message: 'Connect to Python prediction service',
      data: {
        'tsmc-shenzhen': { probability: 0.72, factors: ['earthquake', 'political'] },
        'shanghai-la': { probability: 0.25, factors: ['weather'] },
        'shanghai-rotterdam': { probability: 0.65, factors: ['conflict', 'tariff'] },
      },
    });
  });

  console.log('API routes initialized');
}
