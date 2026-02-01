/**
 * Display migration SQL for manual application via Supabase dashboard
 * Usage: npx tsx scripts/show-migration.ts
 */
import { readFileSync } from 'fs';
import { resolve, join } from 'path';

const migrationsDir = resolve(__dirname, '../../risk-agent/migrations');

const migrations = [
  '001_create_risk_assessments.sql',
  '002_add_indexes.sql'
];

console.log('='.repeat(80));
console.log('RISK AGENT DATABASE MIGRATIONS');
console.log('='.repeat(80));
console.log('\nTo apply these migrations:');
console.log('1. Go to your Supabase project dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Create a new query');
console.log('4. Copy and paste the SQL below');
console.log('5. Click "Run"\n');
console.log('='.repeat(80));
console.log('\n');

for (const migrationFile of migrations) {
  const migrationPath = join(migrationsDir, migrationFile);
  const sql = readFileSync(migrationPath, 'utf-8');

  console.log(`-- Migration: ${migrationFile}`);
  console.log(`-- ${'-'.repeat(76)}\n`);
  console.log(sql);
  console.log('\n');
}

console.log('='.repeat(80));
console.log('END OF MIGRATIONS');
console.log('='.repeat(80));
