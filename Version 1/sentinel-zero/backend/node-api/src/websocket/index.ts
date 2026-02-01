import { WebSocketServer, WebSocket } from 'ws';

interface Client {
  ws: WebSocket;
  subscriptions: Set<string>;
}

const clients = new Map<WebSocket, Client>();

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket client connected');

    // Initialize client
    clients.set(ws, {
      ws,
      subscriptions: new Set(['risk_zones', 'news', 'vessels']),
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'CONNECTED',
      message: 'Connected to Sentinel-Zero real-time feed',
      timestamp: new Date().toISOString(),
    }));

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
      clients.delete(ws);
    });
  });

  console.log('WebSocket server initialized');
}

function handleMessage(ws: WebSocket, message: any) {
  const client = clients.get(ws);
  if (!client) return;

  switch (message.type) {
    case 'SUBSCRIBE':
      if (message.channel) {
        client.subscriptions.add(message.channel);
        ws.send(JSON.stringify({
          type: 'SUBSCRIBED',
          channel: message.channel,
        }));
      }
      break;

    case 'UNSUBSCRIBE':
      if (message.channel) {
        client.subscriptions.delete(message.channel);
        ws.send(JSON.stringify({
          type: 'UNSUBSCRIBED',
          channel: message.channel,
        }));
      }
      break;

    case 'SIMULATE':
      // Forward simulation request to Python service
      handleSimulationRequest(ws, message.query);
      break;

    case 'PING':
      ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      break;

    default:
      console.log('Unknown message type:', message.type);
  }
}

async function handleSimulationRequest(ws: WebSocket, query: string) {
  // Acknowledge receipt
  ws.send(JSON.stringify({
    type: 'SIMULATION_STARTED',
    query,
    timestamp: new Date().toISOString(),
  }));

  // TODO: Forward to Python LangGraph agent
  // For now, send a mock response
  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'SIMULATION_RESULT',
      query,
      result: {
        summary: `Analysis for: "${query}"`,
        affectedRoutes: ['tsmc-shenzhen', 'shanghai-la'],
        recommendations: [
          'Consider Samsung Foundry as alternative supplier',
          'Route through Singapore hub to avoid Taiwan Strait',
        ],
        riskIncrease: 25,
        costImpact: '+15%',
      },
      timestamp: new Date().toISOString(),
    }));
  }, 2000);
}

export function broadcast(type: string, data: any, channel?: string) {
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });

  clients.forEach((client) => {
    if (client.ws.readyState === 1) {
      if (!channel || client.subscriptions.has(channel)) {
        client.ws.send(message);
      }
    }
  });
}
