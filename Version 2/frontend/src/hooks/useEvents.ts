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
    // Fetch initial events
    fetch(`${API_URL}/api/events`)
      .then((res) => res.json())
      .then((data) => {
        setEvents(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    // Listen for real-time updates
    socket.on('new-event', (event: Event) => {
      setEvents((prev) => [event, ...prev]);
    });

    socket.on('event-update', (updatedEvent: Event) => {
      setEvents((prev) =>
        prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
      );
    });

    return () => {
      socket.off('new-event');
      socket.off('event-update');
    };
  }, []);

  return { events, loading, error };
}
