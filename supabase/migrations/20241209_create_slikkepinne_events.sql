-- Create slikkepinne_events table for storing volunteer help requests/events
CREATE TABLE IF NOT EXISTS slikkepinne_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  time_slot TEXT NOT NULL CHECK (time_slot IN ('morning', 'afternoon', 'evening', 'flexible')),
  location TEXT NOT NULL,
  duration TEXT DEFAULT '1 time',
  event_date DATE NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  organization_id TEXT REFERENCES organisasjonar(id),
  organization_name TEXT,
  contact_info TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_slikkepinne_events_status ON slikkepinne_events(status);
CREATE INDEX IF NOT EXISTS idx_slikkepinne_events_event_date ON slikkepinne_events(event_date);
CREATE INDEX IF NOT EXISTS idx_slikkepinne_events_organization_id ON slikkepinne_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_slikkepinne_events_created_at ON slikkepinne_events(created_at DESC);

-- Enable Row Level Security
ALTER TABLE slikkepinne_events ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active events
CREATE POLICY "Anyone can read active events"
  ON slikkepinne_events
  FOR SELECT
  USING (status = 'active');

-- Policy: Anyone can insert events (for now, no auth required)
CREATE POLICY "Anyone can create events"
  ON slikkepinne_events
  FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can update events (for now, no auth required)
CREATE POLICY "Anyone can update events"
  ON slikkepinne_events
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE slikkepinne_events IS 'Stores volunteer help requests/events from the Slikkepinne feature';
