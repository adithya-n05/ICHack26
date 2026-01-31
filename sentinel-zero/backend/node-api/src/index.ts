import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { setupWebSocket } from './websocket/index.js';
import { setupRoutes } from './routes/index.js';
import { USGSService } from './services/usgs.js';
import { GDELTService } from './services/gdelt.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Set up routes
setupRoutes(app);

// Create HTTP server
const server = createServer(app);

// Set up WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });
setupWebSocket(wss);

// Initialize data services
const usgsService = new USGSService();
const gdeltService = new GDELTService();

// Start periodic data fetching
async function startDataPipeline() {
  console.log('Starting data pipeline...');

  // Fetch earthquake data every 5 minutes
  setInterval(async () => {
    try {
      const earthquakes = await usgsService.fetchRecentEarthquakes();
      console.log(`Fetched ${earthquakes.length} earthquakes`);
      // Broadcast to connected clients
      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'RISK_ZONES_UPDATE',
            data: earthquakes,
          }));
        }
      });
    } catch (err) {
      console.error('Error fetching earthquakes:', err);
    }
  }, 5 * 60 * 1000);

  // Initial fetch
  try {
    const earthquakes = await usgsService.fetchRecentEarthquakes();
    console.log(`Initial earthquake fetch: ${earthquakes.length} events`);
  } catch (err) {
    console.error('Initial earthquake fetch failed:', err);
  }
}

// Start server
server.listen(PORT, () => {
  console.log(`Sentinel-Zero API server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}/ws`);
  startDataPipeline();
});

export { wss };
