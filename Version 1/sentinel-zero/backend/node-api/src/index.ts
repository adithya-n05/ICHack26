import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { setupWebSocket } from './websocket/index.js';
import { setupRoutes } from './routes/index.js';
import { dataAggregator } from './services/dataAggregator.js';
import { supabaseService } from './services/supabase.js';
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

// Start data pipeline with all services
async function startDataPipeline() {
  console.log('Starting comprehensive data pipeline...');

  // Initialize Supabase (optional - will log warning if not configured)
  try {
    supabaseService.initialize();
    console.log('Supabase initialized');
  } catch (err) {
    console.warn('Supabase initialization skipped:', (err as Error).message);
  }

  // Initialize data aggregator with WebSocket server
  dataAggregator.initialize(wss);

  // Start all data pipelines
  await dataAggregator.startAllPipelines();
}

// Start server
server.listen(PORT, () => {
  console.log(`Sentinel-Zero API server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}/ws`);
  console.log('Data sources: USGS, NOAA, GDELT, ReliefWeb, Perplexity');
  startDataPipeline();
});

export { wss };
