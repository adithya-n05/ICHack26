import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Starting database seed...');

  const seedDir = path.join(__dirname, '../../../../data/seed');

  // Read seed files
  const companiesPath = path.join(seedDir, 'companies.json');
  const portsPath = path.join(seedDir, 'ports.json');
  const connectionsPath = path.join(seedDir, 'connections.json');
  const tariffsPath = path.join(seedDir, 'tariffs.json');

  // Load data
  const companiesRaw = JSON.parse(fs.readFileSync(companiesPath, 'utf-8'));
  const portsRaw = JSON.parse(fs.readFileSync(portsPath, 'utf-8'));
  const connections = JSON.parse(fs.readFileSync(connectionsPath, 'utf-8'));
  const tariffs = JSON.parse(fs.readFileSync(tariffsPath, 'utf-8'));

  // Flatten location objects to lat/lng columns for database
  const flattenLocation = (item: any) => {
    if (item.location && typeof item.location === 'object') {
      const { location, ...rest } = item;
      return {
        ...rest,
        lat: location.lat,
        lng: location.lng,
      };
    }
    return item;
  };

  const companies = companiesRaw.map(flattenLocation);
  const ports = portsRaw.map(flattenLocation);

  console.log(`Loaded ${companies.length} companies`);
  console.log(`Loaded ${ports.length} ports`);
  console.log(`Loaded ${connections.length} connections`);
  console.log(`Loaded ${tariffs.length} tariffs`);

  // Seed companies (includes nodes like companies and ports)
  const allNodes = [...companies, ...ports];
  console.log(`\nSeeding ${allNodes.length} nodes (companies + ports)...`);

  for (const node of allNodes) {
    const { error } = await supabase
      .from('companies')
      .upsert(node, { onConflict: 'id' });

    if (error) {
      console.error(`Error seeding node ${node.id}:`, error.message);
    } else {
      console.log(`  ✓ ${node.name}`);
    }
  }

  // Seed connections
  console.log(`\nSeeding ${connections.length} connections...`);

  for (const conn of connections) {
    const { error } = await supabase
      .from('connections')
      .upsert(conn, { onConflict: 'id' });

    if (error) {
      console.error(`Error seeding connection ${conn.id}:`, error.message);
    } else {
      console.log(`  ✓ ${conn.id}`);
    }
  }

  // Seed tariffs
  console.log(`\nSeeding ${tariffs.length} tariffs...`);

  for (const tariff of tariffs) {
    const { error } = await supabase
      .from('tariffs')
      .upsert(tariff, { onConflict: 'id' });

    if (error) {
      console.error(`Error seeding tariff ${tariff.id}:`, error.message);
    } else {
      console.log(`  ✓ ${tariff.id}`);
    }
  }

  console.log('\nSeeding complete!');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
