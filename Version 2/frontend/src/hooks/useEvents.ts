// frontend/src/hooks/useEvents.ts
import { useState, useEffect } from 'react';
import { socket } from '../lib/socket';

interface Event {
  id: string;
  type: string;
  title: string;
  description: string;
  location: { lat: number; lng: number };
  severity: number;
  startDate: string;
  source: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Fetch initial events
    fetch(`${API_URL}/api/events`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setEvents(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    // Named handlers for proper cleanup
    const handleNewEvent = (event: Event) => {
      if (isMounted) {
        setEvents((prev) => [event, ...prev]);
      }
    };

    const handleEventUpdate = (updatedEvent: Event) => {
      if (isMounted) {
        setEvents((prev) =>
          prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
        );
      }
    };

    // Listen for real-time updates
    socket.on('new-event', handleNewEvent);
    socket.on('event-update', handleEventUpdate);

    return () => {
      isMounted = false;
      socket.off('new-event', handleNewEvent);
      socket.off('event-update', handleEventUpdate);
    };
  }, []);

  return { events, loading, error };
}
