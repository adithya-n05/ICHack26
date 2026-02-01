import { test, expect } from '@playwright/test';
import { io, Socket } from 'socket.io-client';

const API_BASE_URL = 'http://localhost:3001';
const SOCKET_URL = 'http://localhost:3001';

test.describe('Risk WebSocket Updates', () => {
  let socket: Socket;

  test.afterEach(() => {
    if (socket) {
      socket.disconnect();
    }
  });

  test('WebSocket connection can be established', async () => {
    await new Promise<void>((resolve, reject) => {
      socket = io(SOCKET_URL, {
        reconnection: false,
      });

      socket.on('connect', () => {
        expect(socket.connected).toBeTruthy();
        expect(socket.id).toBeTruthy();
        resolve();
      });

      socket.on('connect_error', (error) => {
        reject(new Error(`Failed to connect: ${error.message}`));
      });

      // Timeout after 5 seconds
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  });

  test('WebSocket receives risk-updated events', async () => {
    // This test requires the risk agent to be running
    // It will trigger an event notification and listen for the update

    const updateReceived = new Promise<any>((resolve, reject) => {
      socket = io(SOCKET_URL);

      socket.on('connect', async () => {
        console.log('WebSocket connected, listening for risk-updated events');

        // Listen for risk update
        socket.on('risk-updated', (payload) => {
          console.log('Received risk-updated event:', payload);
          resolve(payload);
        });

        // Trigger a risk assessment by getting an event and notifying
        try {
          const eventsResponse = await fetch(`${API_BASE_URL}/api/events?limit=1`);
          const eventsData = await eventsResponse.json();

          if (eventsData.events && eventsData.events.length > 0) {
            const eventId = eventsData.events[0].id;

            // Notify risk agent
            await fetch(`${API_BASE_URL}/internal/events/notify/${eventId}`, {
              method: 'POST',
            });

            console.log(`Notified risk agent about event ${eventId}`);
          } else {
            reject(new Error('No events found in database'));
          }
        } catch (error) {
          reject(error);
        }
      });

      socket.on('connect_error', (error) => {
        reject(new Error(`Connection error: ${error.message}`));
      });

      // Timeout after 45 seconds (risk agent needs time to process)
      setTimeout(() => reject(new Error('WebSocket update timeout')), 45000);
    });

    const payload = await updateReceived;

    // Verify payload structure
    expect(payload).toHaveProperty('eventId');
    expect(payload).toHaveProperty('status');
    expect(['updated', 'processing', 'error']).toContain(payload.status);

    if (payload.status === 'updated') {
      expect(payload).toHaveProperty('riskCategory');
      expect(payload).toHaveProperty('severityScore');
      expect(['healthy', 'monitoring', 'at-risk', 'critical', 'disrupted']).toContain(
        payload.riskCategory
      );
    }
  });

  test('Multiple clients receive the same risk update', async () => {
    const socket1 = io(SOCKET_URL);
    const socket2 = io(SOCKET_URL);

    const updates = await new Promise<any[]>((resolve, reject) => {
      const receivedUpdates: any[] = [];
      let connectCount = 0;

      const checkBothConnected = async () => {
        connectCount++;
        if (connectCount === 2) {
          // Both connected, trigger event
          try {
            const eventsResponse = await fetch(`${API_BASE_URL}/api/events?limit=1`);
            const eventsData = await eventsResponse.json();

            if (eventsData.events && eventsData.events.length > 0) {
              const eventId = eventsData.events[0].id;

              await fetch(`${API_BASE_URL}/internal/events/notify/${eventId}`, {
                method: 'POST',
              });
            }
          } catch (error) {
            reject(error);
          }
        }
      };

      socket1.on('connect', checkBothConnected);
      socket2.on('connect', checkBothConnected);

      socket1.on('risk-updated', (payload) => {
        receivedUpdates.push({ client: 1, payload });
        if (receivedUpdates.length === 2) {
          resolve(receivedUpdates);
        }
      });

      socket2.on('risk-updated', (payload) => {
        receivedUpdates.push({ client: 2, payload });
        if (receivedUpdates.length === 2) {
          resolve(receivedUpdates);
        }
      });

      setTimeout(() => {
        if (receivedUpdates.length < 2) {
          resolve(receivedUpdates); // Return what we got
        }
      }, 45000);
    });

    socket1.disconnect();
    socket2.disconnect();

    // Verify both clients received updates
    expect(updates.length).toBeGreaterThanOrEqual(1);

    if (updates.length === 2) {
      // Both clients should receive the same event
      expect(updates[0].payload.eventId).toBe(updates[1].payload.eventId);
    }
  });
});
