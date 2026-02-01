-- Add indexes for better query performance on related tables
-- Note: GeoPoint is stored as JSONB {lat, lng}, spatial queries done in Python

-- Index for fast event type filtering
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

-- Index for event severity filtering
CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity);

-- Index for company type filtering (for finding ports/hubs)
CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(type);

-- Index for connection status filtering
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);

-- Index for connection endpoints
CREATE INDEX IF NOT EXISTS idx_connections_from_node ON connections(from_node_id);
CREATE INDEX IF NOT EXISTS idx_connections_to_node ON connections(to_node_id);

-- Comments
COMMENT ON INDEX idx_events_type IS 'Fast filtering of events by type (natural_disaster, war, etc.)';
COMMENT ON INDEX idx_events_severity IS 'Fast filtering of events by severity level';
COMMENT ON INDEX idx_companies_type IS 'Fast filtering of companies by type (port, airport, foundry, etc.)';
COMMENT ON INDEX idx_connections_status IS 'Fast filtering of connections by status';
