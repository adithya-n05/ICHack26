import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { supabase } from './lib/supabase';
import { initializeEventEmitter } from './services/eventEmitter';
import { connectRedis, getRedisClient } from './services/redis';
import { notifyRiskAgent, subscribeToRiskUpdates } from './services/event-processor';
import { startJobs } from './jobs';
import companiesRouter from './routes/companies';
import suppliersRouter from './routes/suppliers';
import connectionsRouter from './routes/connections';
import eventsRouter from './routes/events';
import tariffsRouter from './routes/tariffs';
import newsRouter from './routes/news';
import userSupplyChainRouter from './routes/user-supply-chain';
import alternativesRouter from './routes/alternatives';
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

app.get('/health', async (req, res) => {
  try {
    // Simple query to verify connection against an existing table
    const { error } = await supabase.from('companies').select('id').limit(1);
    const redis = getRedisClient();
    res.json({
      status: 'ok',
      db: error ? 'disconnected' : 'connected',
      redis: redis?.isOpen ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.json({
      status: 'ok',
      db: 'disconnected',
      redis: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// Internal endpoint: Notify Risk Agent about new event
// Called by event fetcher services after saving to database
app.post('/internal/events/notify/:eventId', async (req, res) => {
  const { eventId } = req.params;

  try {
    await notifyRiskAgent(eventId);
    res.json({ success: true, message: `Event ${eventId} sent to Risk Agent` });
  } catch (error) {
    console.error('[API] Error notifying Risk Agent:', error);
    res.status(500).json({ success: false, error: 'Failed to notify Risk Agent' });
  }
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize Redis and subscribe to risk updates
const initializeServices = async () => {
  try {
    await connectRedis();
    await subscribeToRiskUpdates(io);
    console.log('[Server] Redis and risk updates subscription initialized');
  } catch (err) {
    console.error('[Server] Failed to initialize Redis:', err);
    // Continue without Redis - app can still function for other purposes
  }
};

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startJobs();
  initializeServices();
});
