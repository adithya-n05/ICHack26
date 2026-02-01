// backend/src/jobs/index.ts
import cron from 'node-cron';
import { fetchGdeltEvents } from '../services/gdelt';
import { fetchEarthquakes } from '../services/usgs';
import { fetchWeatherAlerts } from '../services/noaa';
import { fetchNews } from '../services/newsapi';
import { broadcastNewEvent, broadcastNewNews } from '../services/eventEmitter';
import { supabase } from '../lib/supabase';
import { getDriver } from '../lib/neo4j';
import { syncEvents, fullSync } from '../graph/sync';
import { checkAndBroadcastAlerts } from '../services/alertService';
import { updateAllConnectionRisks } from '../services/connectionRisk';

async function saveEvents(events: any[], source: string) {
  for (const event of events) {
    // Skip events with invalid (0,0) coordinates
    if (event.location.lat === 0 && event.location.lng === 0) {
      console.log(`Skipping ${source} event with (0,0) coords:`, event.title);
      continue;
    }

    // Upsert to avoid duplicates
    const { error } = await supabase.from('events').upsert({
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

    if (error) {
      console.error(`Error saving ${source} event:`, error);
    } else {
      // Broadcast to connected clients
      broadcastNewEvent(event);
    }
  }
}

async function saveNews(newsItems: any[]) {
  for (const news of newsItems) {
    const { error } = await supabase.from('news').upsert({
      id: news.id,
      title: news.title,
      description: news.description,
      source: news.source,
      source_url: news.url,
      published_at: news.publishedAt,
      category: news.category,
    }, { onConflict: 'id' });

    if (error) {
      console.error('Error saving news:', error);
    } else {
      broadcastNewNews(news);
    }
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

  // Sync events to knowledge graph every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    if (getDriver()) {
      console.log('Syncing events to knowledge graph...');
      await syncEvents();
      console.log('Knowledge graph events synced');
      
      // Check for risk alerts after sync
      await checkAndBroadcastAlerts();
    }
  });

  // Check risk alerts every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    if (getDriver()) {
      await checkAndBroadcastAlerts();
    }
  });

  // Update connection risk statuses every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    console.log('Running connection risk update job...');
    await updateAllConnectionRisks();
  });

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

    // Sync to knowledge graph if configured
    if (getDriver()) {
      console.log('Initial knowledge graph sync...');
      // Full sync on startup to populate all nodes (companies, ports, countries) first
      await fullSync();
    }

    console.log('Initial data fetch complete');
  }, 5000); // Wait 5 seconds for server to fully start
}
