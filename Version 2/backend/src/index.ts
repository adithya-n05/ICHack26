import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { supabase } from './lib/supabase';
import { initNeo4j } from './lib/neo4j';
import { initializeSchema } from './graph/schema';
import { initializeEventEmitter } from './services/eventEmitter';
import { initializeAlertService } from './services/alertService';
import { startJobs } from './jobs';
import companiesRouter from './routes/companies';
import suppliersRouter from './routes/suppliers';
import connectionsRouter from './routes/connections';
import eventsRouter from './routes/events';
import tariffsRouter from './routes/tariffs';
import newsRouter from './routes/news';
import userSupplyChainRouter from './routes/user-supply-chain';
import alternativesRouter from './routes/alternatives';
import graphRouter from './routes/graph';
import riskRouter from './routes/risk';
import maritimeRouter from './routes/maritime';
import normalizeRouter from './routes/normalize';
import reroutingRouter from './routes/rerouting';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server from Express app
const server = createServer(app);

// Create Socket.io server
const io = new SocketServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Export io for use in other modules
export { io };

// Initialize event emitter with socket server
initializeEventEmitter(io);

// Initialize alert service with socket server
initializeAlertService(io);

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/companies', companiesRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/connections', connectionsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/tariffs', tariffsRouter);
app.use('/api/news', newsRouter);
app.use('/api/user-supply-chain', userSupplyChainRouter);
app.use('/api/alternatives', alternativesRouter);
app.use('/api/graph', graphRouter);
app.use('/api/risk', riskRouter);
app.use('/api/maritime', maritimeRouter);
app.use('/api/normalize', normalizeRouter);
app.use('/api/rerouting', reroutingRouter);

app.get('/health', async (req, res) => {
  try {
    // Simple query to verify connection against an existing table
    const { error } = await supabase.from('companies').select('id').limit(1);
    res.json({
      status: 'ok',
      db: error ? 'disconnected' : 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.json({
      status: 'ok',
      db: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// Error handling middleware (must be last)
app.use(errorHandler);

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initialize Neo4j Knowledge Graph (optional - runs without if not configured)
  try {
    const driver = initNeo4j();
    if (driver) {
      await initializeSchema();
      console.log('Knowledge graph ready');
    }
  } catch (err) {
    console.warn('Knowledge graph initialization skipped:', err);
  }
  
  startJobs();
});
