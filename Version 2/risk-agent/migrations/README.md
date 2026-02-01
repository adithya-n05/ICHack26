# Database Migrations

## Running Migrations

These SQL migrations need to be run on your Supabase database.

**Option 1: Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the migration file contents
4. Run the query

**Option 2: Supabase CLI**
```bash
supabase db push
```

**Option 3: Direct PostgreSQL**
```bash
psql -h <supabase-host> -U postgres -d postgres -f migrations/001_create_risk_assessments.sql
```

## Migration Order
1. `001_create_risk_assessments.sql` - Create risk_assessments table with indexes
2. `002_add_indexes.sql` - Add additional performance indexes for related tables

## Notes
- GeoPoint data is stored as JSONB `{lat: number, lng: number}`
- **No PostGIS required** - spatial calculations done in Python agent using Haversine formula
- Risk categories use lowercase with hyphens to match TypeScript ConnectionStatus
- Affected entities stored as JSONB array: `[{type, id, name, distance_km}]`
- Alternatives stored as JSONB object: `{suppliers: [...], routes: [...]}`
