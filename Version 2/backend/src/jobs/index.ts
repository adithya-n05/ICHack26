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
      url: news.url,
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
}
