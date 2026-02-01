import { fetchGdeltEvents } from '../services/gdelt';
import { fetchEarthquakes } from '../services/usgs';
import { fetchWeatherAlerts } from '../services/noaa';
import { supabase } from '../lib/supabase';

async function saveEvents(events: any[], source: string) {
  for (const event of events) {
    if (event.location?.lat === 0 && event.location?.lng === 0) {
      console.log(`Skipping ${source} event with (0,0) coords:`, event.title);
      continue;
    }

    const { error } = await supabase.from('events').upsert(
      {
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
      },
      { onConflict: 'id' },
    );

    if (error) {
      console.error(`Error saving ${source} event:`, error);
    }
  }
}

async function ingestEvents() {
  console.log('Starting events ingestion...');
  const [gdeltEvents, earthquakes, weatherAlerts] = await Promise.all([
    fetchGdeltEvents(),
    fetchEarthquakes(),
    fetchWeatherAlerts(),
  ]);

  console.log(`Fetched ${gdeltEvents.length} GDELT events`);
  console.log(`Fetched ${earthquakes.length} USGS events`);
  console.log(`Fetched ${weatherAlerts.length} NOAA events`);

  await saveEvents(gdeltEvents, 'GDELT');
  await saveEvents(earthquakes, 'USGS');
  await saveEvents(weatherAlerts, 'NOAA');

  console.log('Events ingestion complete.');
}

ingestEvents()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Events ingestion failed:', error);
    process.exit(1);
  });
