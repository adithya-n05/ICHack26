/**
 * Apply risk agent migrations to Supabase database
 * Usage: npx tsx scripts/apply-migrations.ts
 */
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { Client } from 'pg';
import { config } from 'dotenv';

// Load .env file
config({ path: resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || '';

// Extract project ref from Supabase URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('Could not extract project ref from SUPABASE_URL');
  console.error('SUPABASE_URL should be in format: https://xxxxx.supabase.co');
  process.exit(1);
}

// Construct Postgres connection string
// Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
const connectionString = `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_SERVICE_ROLE_KEY}@db.${projectRef}.supabase.co:6543/postgres`;

async function runMigrations() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase database...');
    await client.connect();
    console.log('Connected successfully');

    const migrationsDir = resolve(__dirname, '../../risk-agent/migrations');

    // Run migrations in order
    const migrations = [
      '001_create_risk_assessments.sql',
      '002_add_indexes.sql'
    ];

    for (const migrationFile of migrations) {
      const migrationPath = join(migrationsDir, migrationFile);
      console.log(`\nRunning migration: ${migrationFile}`);

      const sql = readFileSync(migrationPath, 'utf-8');
      await client.query(sql);

      console.log(`✓ ${migrationFile} completed`);
    }

    console.log('\n✅ All migrations completed successfully');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
