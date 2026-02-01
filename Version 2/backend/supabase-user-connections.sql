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

CREATE INDEX IF NOT EXISTS idx_user_connections_from ON user_connections(from_node_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_to ON user_connections(to_node_id);

ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

-- Service role policy (optional)
-- CREATE POLICY "Service role has full access to user_connections" ON user_connections FOR ALL USING (true);
