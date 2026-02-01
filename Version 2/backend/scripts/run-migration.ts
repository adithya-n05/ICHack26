/**
 * Script to run SQL migrations directly via Supabase
 * Usage: tsx scripts/run-migration.ts <migration-file>
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { supabase } from '../src/lib/supabase';

const main = async () => {
  const migrationPath = process.argv[2];

  if (!migrationPath) {
    console.error('Usage: tsx scripts/run-migration.ts <migration-file>');
    process.exit(1);
  }

  const fullPath = resolve(process.cwd(), migrationPath);
  console.log(`Running migration: ${fullPath}`);

  try {
    const sql = readFileSync(fullPath, 'utf-8');

    // Execute SQL using rpc (for raw SQL execution)
    // Note: This requires a database function or direct postgres connection
    // For now, we'll use the postgres connection string if available

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
};

main();
