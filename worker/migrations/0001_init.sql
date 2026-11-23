CREATE TABLE IF NOT EXISTS guests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL UNIQUE,
  seat_allowance INTEGER NOT NULL CHECK (seat_allowance BETWEEN 1 AND 20)
);
CREATE TABLE IF NOT EXISTS rsvps (
  id TEXT PRIMARY KEY,
  guest_id TEXT NOT NULL UNIQUE REFERENCES guests(id) ON DELETE CASCADE,
  attending INTEGER NOT NULL CHECK (attending IN (0,1)),
  companions_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
