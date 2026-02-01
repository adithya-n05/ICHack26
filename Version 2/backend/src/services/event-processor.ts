import { publishEvent, subscribeToChannel } from './redis';
import { Server as SocketServer } from 'socket.io';

const EVENTS_CHANNEL = 'events:new';
const RISK_UPDATED_CHANNEL = 'risk:updated';

/**
 * Notify the Risk Agent about a new event via Redis pub/sub
 */
export const notifyRiskAgent = async (eventId: string): Promise<void> => {
  console.log(`[Event Processor] Publishing event ${eventId} to Risk Agent`);

  await publishEvent(EVENTS_CHANNEL, {
    event_id: eventId,
    timestamp: new Date().toISOString(),
  });

  console.log(`[Event Processor] Event ${eventId} published to channel ${EVENTS_CHANNEL}`);
};

/**
 * Subscribe to risk updates from the Risk Agent and broadcast to frontend via WebSocket
 */
export const subscribeToRiskUpdates = async (io: SocketServer): Promise<void> => {
  await subscribeToChannel(RISK_UPDATED_CHANNEL, (message) => {
    try {
      const data = JSON.parse(message);
      console.log('[Event Processor] Broadcasting risk update to frontend:', data);

      // Broadcast to all connected clients
      io.emit('risk-updated', data);
    } catch (error) {
      console.error('[Event Processor] Error parsing risk update:', error);
    }
  });

  console.log('[Event Processor] Listening for risk updates from Risk Agent');
};
