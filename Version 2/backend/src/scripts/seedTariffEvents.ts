import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

import { buildMockTariffEvents } from '../data/mockTariffEvents';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedTariffEvents() {
  const events = buildMockTariffEvents();

  const { error } = await supabase.from('events').upsert(events, { onConflict: 'id' });
  if (error) {
    console.error('Tariff event upsert error:', error.message);
    process.exit(1);
  }

  console.log(`Upserted ${events.length} tariff events.`);
}

seedTariffEvents()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Tariff event seed failed:', err);
    process.exit(1);
  });
