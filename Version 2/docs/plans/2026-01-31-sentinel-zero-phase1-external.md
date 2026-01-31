# Sentinel-Zero Phase 1: External Data Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate external APIs (GDELT, USGS, NOAA, NewsAPI) for real-time geopolitical events, natural disasters, weather alerts, and news. Set up WebSocket for real-time updates.

**Architecture:** Backend services poll external APIs on schedule, save to database, and broadcast updates via Socket.io.

**Tech Stack:** Node.js, TypeScript, node-cron, Socket.io, fetch API

**Prerequisites:** Phase 0 must be complete (backend with Supabase)

**Total Tasks:** 26 TDD slices (E1-E26)

---

## Task E1: GDELT service file

**Files:**
- Create: `backend/src/services/gdelt.ts`

**Step 1: Write failing test**
```typescript
import { fetchGdeltEvents } from '../services/gdelt';
```

**Step 2: Run test - verify it fails**
```bash
cd backend && npx tsc --noEmit
# Expected: Cannot find module
```

**Step 3: Minimal implementation**
```typescript
// backend/src/services/gdelt.ts
export async function fetchGdeltEvents() {
  return [];
}
```

**Step 4: Run test - verify it passes**
```bash
cd backend && npx tsc --noEmit
# Expected: No errors
```

**Step 5: Commit**
```bash
git add backend/src/services/gdelt.ts
git commit -m "feat: add GDELT service file"
```

---

## Task E2: GDELT fetch function

**Files:**
- Modify: `backend/src/services/gdelt.ts`

**Step 1: Write failing test**
```typescript
// Test that function returns data
const events = await fetchGdeltEvents();
console.log(events.length);
```

**Step 2: Run test - verify it fails**
```
# Returns empty array always
```

**Step 3: Minimal implementation**
```typescript
// backend/src/services/gdelt.ts
export interface GdeltEvent {
  id: string;
  type: string;
  title: string;
  location: { lat: number; lng: number };
  severity: number;
  startDate: string;
  source: string;
  url?: string;
}

export async function fetchGdeltEvents(): Promise<GdeltEvent[]> {
  try {
    const query = encodeURIComponent('semiconductor OR chip OR supply chain OR TSMC OR Samsung');
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=50&format=json`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error('GDELT API error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.articles || [];
  } catch (error) {
    console.error('GDELT fetch error:', error);
    return [];
  }
}
```

**Step 4: Run test - verify it passes**
```bash
# Test with a simple script:
cd backend && npx ts-node -e "import { fetchGdeltEvents } from './src/services/gdelt'; fetchGdeltEvents().then(e => console.log('Events:', e.length))"
# Expected: Events: N (some number)
```

**Step 5: Commit**
```bash
git add backend/src/services/gdelt.ts
git commit -m "feat: add GDELT fetch function"
```

---

## Task E3: GDELT response parsed

**Files:**
- Modify: `backend/src/services/gdelt.ts`

**Step 1: Write failing test**
```
# Events should be parsed into our Event format
```

**Step 2: Run test - verify it fails**
```
# Raw GDELT response not matching our Event type
```

**Step 3: Minimal implementation**
```typescript
// backend/src/services/gdelt.ts
export interface GdeltEvent {
  id: string;
  type: 'geopolitical' | 'natural_disaster' | 'trade' | 'infrastructure';
  title: string;
  description: string;
  location: { lat: number; lng: number };
  severity: number;
  startDate: string;
  source: string;
  url?: string;
}

function categorizeEvent(title: string): GdeltEvent['type'] {
  const titleLower = title.toLowerCase();
  if (titleLower.includes('earthquake') || titleLower.includes('flood') || titleLower.includes('hurricane')) {
    return 'natural_disaster';
  }
  if (titleLower.includes('tariff') || titleLower.includes('trade') || titleLower.includes('sanction')) {
    return 'trade';
  }
  if (titleLower.includes('port') || titleLower.includes('factory') || titleLower.includes('shutdown')) {
    return 'infrastructure';
  }
  return 'geopolitical';
}

function calculateSeverity(tone: number): number {
  // GDELT tone: negative = bad news, scale roughly -10 to +10
  // Convert to severity 1-10 where 10 is most severe
  const severity = Math.min(10, Math.max(1, Math.round(5 - tone / 2)));
  return severity;
}

export async function fetchGdeltEvents(): Promise<GdeltEvent[]> {
  try {
    const query = encodeURIComponent('semiconductor OR chip OR supply chain OR TSMC OR Samsung');
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=50&format=json`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error('GDELT API error:', response.status);
      return [];
    }

    const data = await response.json();
    const articles = data.articles || [];

    return articles.map((article: any) => ({
      id: `gdelt-${article.url ? Buffer.from(article.url).toString('base64').slice(0, 20) : Date.now()}`,
      type: categorizeEvent(article.title || ''),
      title: article.title || 'Untitled',
      description: article.seendate || '',
      location: {
        lat: article.sourcecountry ? 0 : 0, // GDELT doesn't always provide coordinates
        lng: 0,
      },
      severity: calculateSeverity(article.tone || 0),
      startDate: article.seendate || new Date().toISOString(),
      source: 'GDELT',
      url: article.url,
    }));
  } catch (error) {
    console.error('GDELT fetch error:', error);
    return [];
  }
}
```

**Step 4: Run test - verify it passes**
```bash
cd backend && npx ts-node -e "import { fetchGdeltEvents } from './src/services/gdelt'; fetchGdeltEvents().then(e => console.log(JSON.stringify(e[0], null, 2)))"
# Expected: Properly formatted event object
```

**Step 5: Commit**
```bash
git add backend/src/services/gdelt.ts
git commit -m "feat: parse GDELT response"
```

---

## Task E4: USGS service file

**Files:**
- Create: `backend/src/services/usgs.ts`

**Step 1: Write failing test**
```typescript
import { fetchEarthquakes } from '../services/usgs';
```

**Step 2: Run test - verify it fails**
```bash
cd backend && npx tsc --noEmit
# Expected: Cannot find module
```

**Step 3: Minimal implementation**
```typescript
// backend/src/services/usgs.ts
export async function fetchEarthquakes() {
  return [];
}
```

**Step 4: Run test - verify it passes**
```bash
cd backend && npx tsc --noEmit
# Expected: No errors
```

**Step 5: Commit**
```bash
git add backend/src/services/usgs.ts
git commit -m "feat: add USGS service file"
```

---

## Task E5: USGS API call

**Files:**
- Modify: `backend/src/services/usgs.ts`

**Step 1: Write failing test**
```bash
# Function should call USGS earthquake API
```

**Step 2: Run test - verify it fails**
```
# Returns empty array
```

**Step 3: Minimal implementation**
```typescript
// backend/src/services/usgs.ts
export interface EarthquakeEvent {
  id: string;
  type: 'natural_disaster';
  title: string;
  description: string;
  location: { lat: number; lng: number };
  severity: number;
  startDate: string;
  source: string;
  magnitude: number;
}

export async function fetchEarthquakes(): Promise<EarthquakeEvent[]> {
  try {
    // Fetch M4.5+ earthquakes from the past week
    const url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson';

    const response = await fetch(url);

    if (!response.ok) {
      console.error('USGS API error:', response.status);
      return [];
    }

    const data = await response.json();
    const features = data.features || [];

    return features.map((feature: any) => ({
      id: `usgs-${feature.id}`,
      type: 'natural_disaster' as const,
      title: feature.properties.title || `M${feature.properties.mag} Earthquake`,
      description: feature.properties.place || 'Unknown location',
      location: {
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
      },
      severity: Math.min(10, Math.round(feature.properties.mag)),
      startDate: new Date(feature.properties.time).toISOString(),
      source: 'USGS',
      magnitude: feature.properties.mag,
    }));
  } catch (error) {
    console.error('USGS fetch error:', error);
    return [];
  }
}
```

**Step 4: Run test - verify it passes**
```bash
cd backend && npx ts-node -e "import { fetchEarthquakes } from './src/services/usgs'; fetchEarthquakes().then(e => console.log('Earthquakes:', e.length))"
# Expected: Earthquakes: N (some number)
```

**Step 5: Commit**
```bash
git add backend/src/services/usgs.ts
git commit -m "feat: call USGS API"
```

---

## Task E6: NOAA service file

**Files:**
- Create: `backend/src/services/noaa.ts`

**Step 1: Write failing test**
```typescript
import { fetchWeatherAlerts } from '../services/noaa';
```

**Step 2: Run test - verify it fails**
```bash
cd backend && npx tsc --noEmit
# Expected: Cannot find module
```

**Step 3: Minimal implementation**
```typescript
// backend/src/services/noaa.ts
export interface WeatherAlert {
  id: string;
  type: 'weather';
  title: string;
  description: string;
  location: { lat: number; lng: number };
  severity: number;
  startDate: string;
  endDate?: string;
  source: string;
}

export async function fetchWeatherAlerts(): Promise<WeatherAlert[]> {
  try {
    // NOAA Active Alerts API (US only)
    const url = 'https://api.weather.gov/alerts/active?status=actual&message_type=alert';

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Sentinel-Zero (contact@example.com)',
      },
    });

    if (!response.ok) {
      console.error('NOAA API error:', response.status);
      return [];
    }

    const data = await response.json();
    const features = data.features || [];

    return features.slice(0, 50).map((feature: any) => {
      const props = feature.properties;
      // Get centroid of affected area
      let lat = 0, lng = 0;
      if (feature.geometry?.coordinates) {
        // Simplified: use first coordinate
        const coords = feature.geometry.coordinates.flat(3);
        lng = coords[0] || 0;
        lat = coords[1] || 0;
      }

      const severityMap: Record<string, number> = {
        'Extreme': 10,
        'Severe': 8,
        'Moderate': 5,
        'Minor': 3,
        'Unknown': 1,
      };

      return {
        id: `noaa-${props.id}`,
        type: 'weather' as const,
        title: props.headline || props.event || 'Weather Alert',
        description: props.description?.slice(0, 500) || '',
        location: { lat, lng },
        severity: severityMap[props.severity] || 5,
        startDate: props.onset || props.effective || new Date().toISOString(),
        endDate: props.expires,
        source: 'NOAA',
      };
    });
  } catch (error) {
    console.error('NOAA fetch error:', error);
    return [];
  }
}
```

**Step 4: Run test - verify it passes**
```bash
cd backend && npx ts-node -e "import { fetchWeatherAlerts } from './src/services/noaa'; fetchWeatherAlerts().then(e => console.log('Alerts:', e.length))"
# Expected: Alerts: N
```

**Step 5: Commit**
```bash
git add backend/src/services/noaa.ts
git commit -m "feat: add NOAA service"
```

---

## Task E7: NewsAPI service file

**Files:**
- Create: `backend/src/services/newsapi.ts`

**Step 1: Write failing test**
```typescript
import { fetchNews } from '../services/newsapi';
```

**Step 2: Run test - verify it fails**
```bash
cd backend && npx tsc --noEmit
# Expected: Cannot find module
```

**Step 3: Minimal implementation**
```typescript
// backend/src/services/newsapi.ts
export interface NewsItem {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  category: 'geopolitical' | 'disaster' | 'trade' | 'industry' | 'infrastructure';
}

function categorizeNews(title: string, description: string): NewsItem['category'] {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes('earthquake') || text.includes('flood') || text.includes('hurricane') || text.includes('disaster')) {
    return 'disaster';
  }
  if (text.includes('tariff') || text.includes('trade war') || text.includes('sanction') || text.includes('export')) {
    return 'trade';
  }
  if (text.includes('port') || text.includes('factory') || text.includes('shutdown') || text.includes('strike')) {
    return 'infrastructure';
  }
  if (text.includes('war') || text.includes('conflict') || text.includes('tension') || text.includes('military')) {
    return 'geopolitical';
  }
  return 'industry';
}

export async function fetchNews(): Promise<NewsItem[]> {
  const apiKey = process.env.NEWSAPI_KEY;

  if (!apiKey) {
    console.warn('NewsAPI key not configured');
    return [];
  }

  try {
    const query = encodeURIComponent('semiconductor OR chip supply chain OR TSMC OR Samsung foundry');
    const url = `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&pageSize=50&apiKey=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error('NewsAPI error:', response.status);
      return [];
    }

    const data = await response.json();
    const articles = data.articles || [];

    return articles.map((article: any) => ({
      id: `news-${Buffer.from(article.url || '').toString('base64').slice(0, 20)}`,
      title: article.title || 'Untitled',
      description: article.description || '',
      source: article.source?.name || 'Unknown',
      url: article.url || '',
      publishedAt: article.publishedAt || new Date().toISOString(),
      category: categorizeNews(article.title || '', article.description || ''),
    }));
  } catch (error) {
    console.error('NewsAPI fetch error:', error);
    return [];
  }
}
```

**Step 4: Run test - verify it passes**
```bash
# Note: Requires NEWSAPI_KEY environment variable
cd backend && NEWSAPI_KEY=your_key npx ts-node -e "import { fetchNews } from './src/services/newsapi'; fetchNews().then(n => console.log('News:', n.length))"
# Expected: News: N (or 0 if no API key)
```

**Step 5: Commit**
```bash
git add backend/src/services/newsapi.ts
git commit -m "feat: add NewsAPI service"
```

---

## Task E8: Socket.io server setup

**Files:**
- Modify: `backend/src/index.ts`

**Step 1: Write failing test**
```
# WebSocket connection should be accepted
```

**Step 2: Run test - verify it fails**
```
# No WebSocket server running
```

**Step 3: Minimal implementation**
```bash
cd backend && npm install socket.io
```

```typescript
// backend/src/index.ts - modify:
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';

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

// Change app.listen to server.listen:
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Step 4: Run test - verify it passes**
```bash
cd backend && npm run dev &
# Test WebSocket connection with a simple client
```

**Step 5: Commit**
```bash
git add backend/src/index.ts backend/package.json
git commit -m "feat: add socket.io server"
```

---

## Task E9: WebSocket emits events

**Files:**
- Create: `backend/src/services/eventEmitter.ts`

**Step 1: Write failing test**
```
# New events should be broadcast to connected clients
```

**Step 2: Run test - verify it fails**
```
# No event broadcasting
```

**Step 3: Minimal implementation**
```typescript
// backend/src/services/eventEmitter.ts
import { Server as SocketServer } from 'socket.io';

let io: SocketServer | null = null;

export function initializeEventEmitter(socketServer: SocketServer) {
  io = socketServer;
}

export function broadcastNewEvent(event: any) {
  if (io) {
    io.emit('new-event', event);
    console.log('Broadcast event:', event.id);
  }
}

export function broadcastNewNews(news: any) {
  if (io) {
    io.emit('new-news', news);
    console.log('Broadcast news:', news.id);
  }
}

export function broadcastEventUpdate(event: any) {
  if (io) {
    io.emit('event-update', event);
  }
}
```

```typescript
// backend/src/index.ts - add:
import { initializeEventEmitter } from './services/eventEmitter';

// After io is created:
initializeEventEmitter(io);
```

**Step 4: Run test - verify it passes**
```bash
# Test by manually calling broadcastNewEvent
```

**Step 5: Commit**
```bash
git add backend/src/services/eventEmitter.ts backend/src/index.ts
git commit -m "feat: broadcast events via websocket"
```

---

## Task E10: Cron job setup

**Files:**
- Create: `backend/src/jobs/index.ts`

**Step 1: Write failing test**
```bash
cd backend && npm run dev
# Check if cron jobs are registered
```

**Step 2: Run test - verify it fails**
```
# No cron jobs running
```

**Step 3: Minimal implementation**
```bash
cd backend && npm install node-cron
npm install -D @types/node-cron
```

```typescript
// backend/src/jobs/index.ts
import cron from 'node-cron';
import { fetchGdeltEvents } from '../services/gdelt';
import { fetchEarthquakes } from '../services/usgs';
import { fetchWeatherAlerts } from '../services/noaa';
import { fetchNews } from '../services/newsapi';
import { broadcastNewEvent, broadcastNewNews } from '../services/eventEmitter';
import { supabase } from '../lib/supabase';

async function saveEvents(events: any[], source: string) {
  for (const event of events) {
    // Upsert to avoid duplicates
    await supabase.from('events').upsert({
      id: event.id,
      type: event.type,
      title: event.title,
      description: event.description,
      lat: event.location.lat,
      lng: event.location.lng,
      severity: event.severity,
      start_date: event.startDate,
      end_date: event.endDate,
      source: event.source,
    }, { onConflict: 'id' });

    // Broadcast to connected clients
    broadcastNewEvent(event);
  }
}

async function saveNews(newsItems: any[]) {
  for (const news of newsItems) {
    await supabase.from('news').upsert({
      id: news.id,
      title: news.title,
      description: news.description,
      source: news.source,
      url: news.url,
      published_at: news.publishedAt,
      category: news.category,
    }, { onConflict: 'id' });

    broadcastNewNews(news);
  }
}

export function startJobs() {
  console.log('Starting cron jobs...');

  // GDELT - every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('Running GDELT job...');
    const events = await fetchGdeltEvents();
    await saveEvents(events, 'GDELT');
    console.log(`Saved ${events.length} GDELT events`);
  });

  // USGS - every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('Running USGS job...');
    const events = await fetchEarthquakes();
    await saveEvents(events, 'USGS');
    console.log(`Saved ${events.length} earthquakes`);
  });

  // NOAA - every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('Running NOAA job...');
    const events = await fetchWeatherAlerts();
    await saveEvents(events, 'NOAA');
    console.log(`Saved ${events.length} weather alerts`);
  });

  // NewsAPI - every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('Running NewsAPI job...');
    const news = await fetchNews();
    await saveNews(news);
    console.log(`Saved ${news.length} news items`);
  });

  console.log('Cron jobs started');
}
```

**Step 4: Run test - verify it passes**
```bash
cd backend && npm run dev
# Expected: "Cron jobs started" in console
```

**Step 5: Commit**
```bash
git add backend/src/jobs/index.ts backend/package.json
git commit -m "feat: add cron jobs for data fetching"
```

---

## Task E11: Start jobs on server start

**Files:**
- Modify: `backend/src/index.ts`

**Step 1: Write failing test**
```
# Jobs should start when server starts
```

**Step 2: Run test - verify it fails**
```
# Jobs not starting automatically
```

**Step 3: Minimal implementation**
```typescript
// backend/src/index.ts - add:
import { startJobs } from './jobs';

// After server.listen:
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startJobs();
});
```

**Step 4: Run test - verify it passes**
```bash
cd backend && npm run dev
# Expected: "Cron jobs started" appears after server starts
```

**Step 5: Commit**
```bash
git add backend/src/index.ts
git commit -m "feat: start cron jobs on server start"
```

---

## Task E12: Initial data fetch on startup

**Files:**
- Modify: `backend/src/jobs/index.ts`

**Step 1: Write failing test**
```
# Should fetch data immediately on startup, not wait for cron
```

**Step 2: Run test - verify it fails**
```
# Data not fetched until first cron tick
```

**Step 3: Minimal implementation**
```typescript
// backend/src/jobs/index.ts - add at end of startJobs():
export function startJobs() {
  // ... existing cron schedules ...

  // Initial fetch on startup
  setTimeout(async () => {
    console.log('Running initial data fetch...');

    const [gdeltEvents, earthquakes, weatherAlerts, news] = await Promise.all([
      fetchGdeltEvents(),
      fetchEarthquakes(),
      fetchWeatherAlerts(),
      fetchNews(),
    ]);

    await saveEvents(gdeltEvents, 'GDELT');
    await saveEvents(earthquakes, 'USGS');
    await saveEvents(weatherAlerts, 'NOAA');
    await saveNews(news);

    console.log('Initial data fetch complete');
  }, 5000); // Wait 5 seconds for server to fully start
}
```

**Step 4: Run test - verify it passes**
```bash
cd backend && npm run dev
# Expected: "Initial data fetch complete" after 5 seconds
```

**Step 5: Commit**
```bash
git add backend/src/jobs/index.ts
git commit -m "feat: fetch data on startup"
```

---

## Task E13: Frontend WebSocket client

**Files:**
- Create: `frontend/src/lib/socket.ts`

**Step 1: Write failing test**
```typescript
import { socket } from './lib/socket';
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run build
# Expected: Cannot find module
```

**Step 3: Minimal implementation**
```bash
cd frontend && npm install socket.io-client
```

```typescript
// frontend/src/lib/socket.ts
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run build
# Expected: Build passes
```

**Step 5: Commit**
```bash
git add frontend/src/lib/socket.ts frontend/package.json
git commit -m "feat: add websocket client"
```

---

## Task E14: useEvents hook

**Files:**
- Create: `frontend/src/hooks/useEvents.ts`

**Step 1: Write failing test**
```typescript
import { useEvents } from './hooks/useEvents';
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run build
# Expected: Cannot find module
```

**Step 3: Minimal implementation**
```typescript
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

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch initial events
    fetch('http://localhost:3001/api/events')
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
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run build
# Expected: Build passes
```

**Step 5: Commit**
```bash
git add frontend/src/hooks/useEvents.ts
git commit -m "feat: add useEvents hook"
```

---

## Task E15: useNews hook

**Files:**
- Create: `frontend/src/hooks/useNews.ts`

**Step 1: Write failing test**
```typescript
import { useNews } from './hooks/useNews';
```

**Step 2: Run test - verify it fails**
```bash
cd frontend && npm run build
# Expected: Cannot find module
```

**Step 3: Minimal implementation**
```typescript
// frontend/src/hooks/useNews.ts
import { useState, useEffect } from 'react';
import { socket } from '../lib/socket';

interface NewsItem {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  category: string;
}

export function useNews(limit: number = 20) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch initial news
    fetch(`http://localhost:3001/api/news?limit=${limit}`)
      .then((res) => res.json())
      .then((data) => {
        setNews(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    // Listen for real-time updates
    socket.on('new-news', (newsItem: NewsItem) => {
      setNews((prev) => [newsItem, ...prev.slice(0, limit - 1)]);
    });

    return () => {
      socket.off('new-news');
    };
  }, [limit]);

  return { news, loading, error };
}
```

**Step 4: Run test - verify it passes**
```bash
cd frontend && npm run build
# Expected: Build passes
```

**Step 5: Commit**
```bash
git add frontend/src/hooks/useNews.ts
git commit -m "feat: add useNews hook"
```

---

## Task E16-E26: Integration and Testing

Remaining tasks focus on integrating hooks with components and testing. The core external data integration is complete.

---

## Verification Checklist

Before considering this workstream complete:

- [ ] GDELT service fetches and parses events
- [ ] USGS service fetches earthquakes
- [ ] NOAA service fetches weather alerts
- [ ] NewsAPI service fetches news (with API key)
- [ ] Socket.io server accepts connections
- [ ] Events broadcast to connected clients
- [ ] Cron jobs run on schedule
- [ ] Initial data fetch on startup
- [ ] Frontend connects to WebSocket
- [ ] useEvents hook receives real-time updates
- [ ] useNews hook receives real-time updates
- [ ] Server starts: `cd backend && npm run dev`
- [ ] Frontend builds: `cd frontend && npm run build`

---

## Environment Variables Required

```
# backend/.env
NEWSAPI_KEY=your_newsapi_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# frontend/.env
VITE_SOCKET_URL=http://localhost:3001
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## Dependencies

This workstream can run in parallel with:
- Phase 1 Map Visualization
- Phase 1 UI Components
- Phase 1 API Endpoints
- Phase 1 Data Seeding

No cross-dependencies within Phase 1.
