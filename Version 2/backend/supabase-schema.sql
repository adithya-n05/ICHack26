-- Sentinel Zero Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/bgnqpyncwndrggmtbgcq/sql)

-- Companies table (includes companies, ports, and other nodes)
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT, -- 'foundry', 'fabless', 'equipment', 'port', etc.
  country TEXT,
  city TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  products JSONB DEFAULT '[]'::jsonb, -- array of products/materials
  description TEXT,
  tier INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT REFERENCES companies(id),
  name TEXT NOT NULL,
  tier INTEGER,
  country TEXT,
  products JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Connections table (supply chain links)
CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  from_node_id TEXT REFERENCES companies(id),
  to_node_id TEXT REFERENCES companies(id),
  status TEXT DEFAULT 'active', -- 'active', 'at-risk', 'disrupted'
  is_user_connection BOOLEAN DEFAULT FALSE,
  material TEXT,
  volume DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User connections table (custom links added in UI)
CREATE TABLE IF NOT EXISTS user_connections (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  from_node_id TEXT REFERENCES companies(id),
  to_node_id TEXT REFERENCES companies(id),
  transport_mode TEXT DEFAULT 'land',
  status TEXT DEFAULT 'healthy',
  is_user_connection BOOLEAN DEFAULT TRUE,
  materials JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  lead_time_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table (disasters, disruptions, geopolitical events)
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type TEXT NOT NULL, -- 'natural_disaster', 'geopolitical', 'economic', 'infrastructure'
  title TEXT NOT NULL,
  description TEXT,
  severity INTEGER CHECK (severity >= 1 AND severity <= 10),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius DOUBLE PRECISION, -- affected radius in km
  country TEXT,
  region TEXT,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ, -- NULL if ongoing
  source TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tariffs table
CREATE TABLE IF NOT EXISTS tariffs (
  id TEXT PRIMARY KEY,
  from_country TEXT NOT NULL,
  to_country TEXT NOT NULL,
  product_category TEXT,
  rate DOUBLE PRECISION, -- percentage
  description TEXT,
  effective_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- News table
CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  category TEXT, -- 'supply_chain', 'geopolitical', 'economic', 'technology'
  source TEXT,
  source_url TEXT,
  image_url TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User supply chains table (stores user's custom supply chain)
CREATE TABLE IF NOT EXISTS user_supply_chains (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_name TEXT NOT NULL,
  company_city TEXT,
  company_country TEXT,
  suppliers JSONB DEFAULT '[]'::jsonb,
  materials JSONB DEFAULT '[]'::jsonb,
  connections JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(type);
CREATE INDEX IF NOT EXISTS idx_companies_country ON companies(country);
CREATE INDEX IF NOT EXISTS idx_companies_location ON companies(lat, lng);

CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_tier ON suppliers(tier);

CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
CREATE INDEX IF NOT EXISTS idx_connections_from ON connections(from_node_id);
CREATE INDEX IF NOT EXISTS idx_connections_to ON connections(to_node_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_from ON user_connections(from_node_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_to ON user_connections(to_node_id);

CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity);
CREATE INDEX IF NOT EXISTS idx_events_location ON events(lat, lng);
CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_tariffs_countries ON tariffs(from_country, to_country);
CREATE INDEX IF NOT EXISTS idx_tariffs_category ON tariffs(product_category);

CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);
CREATE INDEX IF NOT EXISTS idx_news_published ON news(published_at DESC);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_supply_chains ENABLE ROW LEVEL SECURITY;

-- -- Create policies to allow service role full access
-- CREATE POLICY "Service role has full access to companies" ON companies FOR ALL USING (true);
-- CREATE POLICY "Service role has full access to suppliers" ON suppliers FOR ALL USING (true);
-- CREATE POLICY "Service role has full access to connections" ON connections FOR ALL USING (true);
-- CREATE POLICY "Service role has full access to user_connections" ON user_connections FOR ALL USING (true);
-- CREATE POLICY "Service role has full access to events" ON events FOR ALL USING (true);
-- CREATE POLICY "Service role has full access to tariffs" ON tariffs FOR ALL USING (true);
-- CREATE POLICY "Service role has full access to news" ON news FOR ALL USING (true);
-- CREATE POLICY "Service role has full access to user_supply_chains" ON user_supply_chains FOR ALL USING (true);

-- Additional columns needed for seed data
-- Add missing columns to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS annual_revenue_usd BIGINT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS annual_teu BIGINT; -- for ports (Twenty-foot Equivalent Units)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_count INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS founded_year INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS node_type TEXT; -- company, factory, port, warehouse, hub, market
ALTER TABLE companies ADD COLUMN IF NOT EXISTS source TEXT; -- osm, curated, ports_index
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS region_code TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS taxonomy JSONB DEFAULT '{}'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_hs_code TEXT;

-- Add missing columns to connections table
ALTER TABLE connections ADD COLUMN IF NOT EXISTS annual_volume_units BIGINT;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS transport_mode TEXT; -- 'sea', 'air', 'land'
ALTER TABLE connections ADD COLUMN IF NOT EXISTS lead_time_days INTEGER;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS path_id TEXT;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS sequence INTEGER;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS cost_score DOUBLE PRECISION;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS risk_score DOUBLE PRECISION;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS tariff_cost DOUBLE PRECISION;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS product_category TEXT;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS is_path_edge BOOLEAN DEFAULT FALSE;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS materials JSONB DEFAULT '[]'::jsonb;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS unit_cost DOUBLE PRECISION;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS currency TEXT;

-- Add missing columns to suppliers table
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS materials JSONB DEFAULT '[]'::jsonb;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS price_catalog JSONB DEFAULT '{}'::jsonb;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS website TEXT;

-- Add missing columns to tariffs table
ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS hs_codes JSONB DEFAULT '[]'::jsonb; -- Harmonized System codes
ALTER TABLE tariffs ADD COLUMN IF NOT EXISTS affected_products JSONB DEFAULT '[]'::jsonb;

-- Supply paths table (path metadata)
CREATE TABLE IF NOT EXISTS supply_paths (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT REFERENCES companies(id),
  product_category TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
