// backend/src/routes/maritime.ts
// API routes for Maritime data

import { Router } from 'express';
import {
  estimatePortCongestion,
  getAllPortCongestion,
  calculateRouteRisk,
  getMaritimeAlerts,
  fetchVesselPositions,
  getAllPorts,
  getAllChokepoints,
  getPortByUnlocode,
} from '../services/maritime';

const router = Router();

// GET /api/maritime/ports - Get all major ports
router.get('/ports', async (req, res) => {
  try {
    const ports = getAllPorts();
    res.json(ports);
  } catch (err) {
    console.error('Get ports error:', err);
    res.status(500).json({ error: 'Failed to get ports' });
  }
});

// GET /api/maritime/ports/:unlocode - Get port by UNLOCODE
router.get('/ports/:unlocode', async (req, res) => {
  try {
    const { unlocode } = req.params;
    const port = getPortByUnlocode(unlocode.toUpperCase());
    
    if (!port) {
      return res.status(404).json({ error: 'Port not found' });
    }
    
    res.json(port);
  } catch (err) {
    console.error('Get port error:', err);
    res.status(500).json({ error: 'Failed to get port' });
  }
});

// GET /api/maritime/congestion - Get all port congestion data
router.get('/congestion', async (req, res) => {
  try {
    const congestion = await getAllPortCongestion();
    res.json(congestion);
  } catch (err) {
    console.error('Get congestion error:', err);
    res.status(500).json({ error: 'Failed to get congestion data' });
  }
});

// GET /api/maritime/congestion/:portId - Get congestion for specific port
router.get('/congestion/:portId', async (req, res) => {
  try {
    const { portId } = req.params;
    const congestion = await estimatePortCongestion(portId);
    
    if (!congestion) {
      return res.status(404).json({ error: 'Port not found' });
    }
    
    res.json(congestion);
  } catch (err) {
    console.error('Get port congestion error:', err);
    res.status(500).json({ error: 'Failed to get congestion' });
  }
});

// GET /api/maritime/route - Calculate route risk
router.get('/route', async (req, res) => {
  try {
    const { origin, destination } = req.query;
    
    if (!origin || !destination) {
      return res.status(400).json({ error: 'origin and destination UNLOCODE required' });
    }
    
    const route = await calculateRouteRisk(
      (origin as string).toUpperCase(),
      (destination as string).toUpperCase()
    );
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found (check UNLOCODEs)' });
    }
    
    res.json(route);
  } catch (err) {
    console.error('Calculate route error:', err);
    res.status(500).json({ error: 'Failed to calculate route' });
  }
});

// GET /api/maritime/alerts - Get active maritime alerts
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await getMaritimeAlerts();
    res.json(alerts);
  } catch (err) {
    console.error('Get alerts error:', err);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// GET /api/maritime/chokepoints - Get all shipping chokepoints
router.get('/chokepoints', async (req, res) => {
  try {
    const chokepoints = getAllChokepoints();
    res.json(chokepoints);
  } catch (err) {
    console.error('Get chokepoints error:', err);
    res.status(500).json({ error: 'Failed to get chokepoints' });
  }
});

// GET /api/maritime/vessels - Get vessel positions
router.get('/vessels', async (req, res) => {
  try {
    const { minLat, maxLat, minLng, maxLng } = req.query;
    
    let boundingBox;
    if (minLat && maxLat && minLng && maxLng) {
      boundingBox = {
        minLat: parseFloat(minLat as string),
        maxLat: parseFloat(maxLat as string),
        minLng: parseFloat(minLng as string),
        maxLng: parseFloat(maxLng as string),
      };
    }
    
    const vessels = await fetchVesselPositions(boundingBox);
    res.json(vessels);
  } catch (err) {
    console.error('Get vessels error:', err);
    res.status(500).json({ error: 'Failed to get vessels' });
  }
});

export default router;
