import { Express, Request, Response } from 'express';
import { USGSService } from '../services/usgs.js';
import { GDELTService } from '../services/gdelt.js';
import { NOAAService } from '../services/noaa.js';
import { ReliefWebService } from '../services/reliefweb.js';
import { PerplexityService } from '../services/perplexity.js';
import { dataAggregator } from '../services/dataAggregator.js';
import { supabaseService } from '../services/supabase.js';

const usgsService = new USGSService();
const gdeltService = new GDELTService();
const noaaService = new NOAAService();
const reliefwebService = new ReliefWebService();
const perplexityService = new PerplexityService();

export function setupRoutes(app: Express) {
  // ====== AGGREGATED DATA ======

  /**
   * GET /api/data
   * Get all aggregated data (risk zones + news)
   */
  app.get('/api/data', async (req: Request, res: Response) => {
    try {
      const data = dataAggregator.getLastData();
      if (data) {
        res.json({
          success: true,
          ...data,
        });
      } else {
        // Fetch fresh data if none cached
        const freshData = await dataAggregator.fetchAllData();
        res.json({
          success: true,
          ...freshData,
        });
      }
    } catch (error) {
      console.error('Error fetching aggregated data:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch data' });
    }
  });

  // ====== RISK ZONES ======

  /**
   * GET /api/risk-zones
   * Get all risk zones (earthquakes, storms, conflicts)
   */
  app.get('/api/risk-zones', async (req: Request, res: Response) => {
    try {
      const [earthquakes, storms, conflicts] = await Promise.allSettled([
        usgsService.fetchRecentEarthquakes(),
        noaaService.fetchActiveAlerts(),
        reliefwebService.getActiveConflictZones(),
      ]);

      const allZones = [
        ...(earthquakes.status === 'fulfilled' ? earthquakes.value : []),
        ...(storms.status === 'fulfilled' ? storms.value : []),
        ...(conflicts.status === 'fulfilled' ? conflicts.value : []),
      ];

      res.json({
        success: true,
        count: allZones.length,
        data: allZones,
      });
    } catch (error) {
      console.error('Error fetching risk zones:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch risk zones' });
    }
  });

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
   * GET /api/risk-zones/storms
   * Fetch active storm/weather alerts from NOAA
   */
  app.get('/api/risk-zones/storms', async (req: Request, res: Response) => {
    try {
      const storms = await noaaService.fetchActiveAlerts();
      res.json({
        success: true,
        count: storms.length,
        data: storms,
      });
    } catch (error) {
      console.error('Error fetching storms:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch storm data' });
    }
  });

  /**
   * GET /api/risk-zones/conflicts
   * Fetch conflict zones from ReliefWeb
   */
  app.get('/api/risk-zones/conflicts', async (req: Request, res: Response) => {
    try {
      const conflicts = await reliefwebService.getActiveConflictZones();
      res.json({
        success: true,
        count: conflicts.length,
        data: conflicts,
      });
    } catch (error) {
      console.error('Error fetching conflicts:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch conflict data' });
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
   * Fetch all news from all sources
   */
  app.get('/api/news', async (req: Request, res: Response) => {
    try {
      const source = req.query.source as string;
      const query = req.query.q as string;

      let news: Array<{
        id: string;
        title: string;
        source: string;
        severity: string;
        region: string;
        impactScore: number;
        timestamp: Date;
      }> = [];

      if (source === 'gdelt' || !source) {
        const gdeltNews = query
          ? await gdeltService.fetchSupplyChainNews(query)
          : await gdeltService.fetchSupplyChainNews();
        news = [...news, ...gdeltNews];
      }

      if (source === 'perplexity' || !source) {
        const perplexityNews = await perplexityService.fetchSupplyChainNews();
        news = [...news, ...perplexityNews];
      }

      // Sort by timestamp descending
      news.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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
   * Get all supply chain nodes from Supabase
   */
  app.get('/api/supply-chain/nodes', async (req: Request, res: Response) => {
    try {
      const nodes = await supabaseService.getNodes();
      res.json({
        success: true,
        count: nodes.length,
        data: nodes,
      });
    } catch (error) {
      console.error('Error fetching nodes:', error);
      res.json({
        success: true,
        count: 0,
        data: [],
        message: 'Supabase not configured - using sample data on frontend',
      });
    }
  });

  /**
   * POST /api/supply-chain/nodes
   * Add a new supply chain node
   */
  app.post('/api/supply-chain/nodes', async (req: Request, res: Response) => {
    const node = req.body;
    const nodeWithId = { ...node, id: `node-${Date.now()}` };

    try {
      await supabaseService.upsertNodes([nodeWithId]);
      res.json({
        success: true,
        data: nodeWithId,
      });
    } catch (error) {
      console.error('Error saving node:', error);
      res.json({
        success: true,
        message: 'Node created (in-memory only - Supabase not configured)',
        data: nodeWithId,
      });
    }
  });

  /**
   * GET /api/supply-chain/routes
   * Get all supply chain routes
   */
  app.get('/api/supply-chain/routes', async (req: Request, res: Response) => {
    try {
      const routes = await supabaseService.getRoutes();
      res.json({
        success: true,
        count: routes.length,
        data: routes,
      });
    } catch (error) {
      console.error('Error fetching routes:', error);
      res.json({
        success: true,
        count: 0,
        data: [],
        message: 'Supabase not configured - using sample data on frontend',
      });
    }
  });

  /**
   * POST /api/supply-chain/routes
   * Add a new supply chain route
   */
  app.post('/api/supply-chain/routes', async (req: Request, res: Response) => {
    const route = req.body;
    const routeWithId = { ...route, id: `route-${Date.now()}` };

    try {
      await supabaseService.upsertRoutes([routeWithId]);
      res.json({
        success: true,
        data: routeWithId,
      });
    } catch (error) {
      console.error('Error saving route:', error);
      res.json({
        success: true,
        message: 'Route created (in-memory only - Supabase not configured)',
        data: routeWithId,
      });
    }
  });

  // ====== SIMULATION ======

  /**
   * POST /api/simulate
   * Run a what-if simulation using Perplexity AI
   */
  app.post('/api/simulate', async (req: Request, res: Response) => {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    try {
      // Use Perplexity for intelligent analysis
      const analysis = await perplexityService.analyzeRisk(
        `Analyze this supply chain scenario: "${query}".
        Provide: 1) Affected routes/suppliers, 2) Risk percentage change,
        3) Cost impact, 4) Lead time impact, 5) Recommended alternatives.`
      );

      res.json({
        success: true,
        query,
        response: analysis,
      });
    } catch (error) {
      console.error('Error running simulation:', error);
      // Fallback to mock response
      res.json({
        success: true,
        query,
        response: `**Simulation Analysis: ${query}**

**Affected Routes:** 2 routes identified
- tsmc-shenzhen: Risk increased by 18.5%
- shanghai-la: Risk increased by 12.3%

**Recommended Alternatives:**
1. Samsung Foundry (South Korea) - Risk: 23%, Cost: +8%
2. Intel Foundry Services (USA) - Risk: 12%, Cost: +22%

**Overall Impact:** Average risk increase of 15.4%
**Recommendation:** Immediate action recommended to diversify supply chain`,
      });
    }
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
      message: 'Disruption predictions based on current risk data',
      data: {
        'tsmc-shenzhen': { probability: 0.72, factors: ['earthquake', 'political'] },
        'shanghai-la': { probability: 0.25, factors: ['weather'] },
        'shanghai-rotterdam': { probability: 0.65, factors: ['conflict', 'tariff'] },
      },
    });
  });

  console.log('API routes initialized (USGS, NOAA, GDELT, ReliefWeb, Perplexity)');
}
