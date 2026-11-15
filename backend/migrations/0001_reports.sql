CREATE TABLE reports (
  id TEXT PRIMARY KEY NOT NULL,
  feature_id TEXT NOT NULL CHECK (length(feature_id) BETWEEN 1 AND 512),
  status TEXT NOT NULL CHECK (status IN ('working', 'not_working')),
  device_id TEXT NOT NULL CHECK (length(device_id) BETWEEN 8 AND 128),
  created_at INTEGER NOT NULL,
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -90 AND 90),
  lng REAL CHECK (lng IS NULL OR lng BETWEEN -180 AND 180),
  app_version TEXT,
  UNIQUE (feature_id, device_id)
);
CREATE INDEX reports_feature_created ON reports (feature_id, created_at DESC);
