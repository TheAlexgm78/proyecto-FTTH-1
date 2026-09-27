CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS app_users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS network_nodes (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL,
  name TEXT NOT NULL,
  optical_loss_db NUMERIC(8,3) NOT NULL DEFAULT 0,
  tx_power_dbm NUMERIC(8,3),
  splitter_outputs INTEGER,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  geom geometry(Point, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS network_links (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_node_id BIGINT REFERENCES network_nodes(id) ON DELETE CASCADE,
  to_node_id BIGINT REFERENCES network_nodes(id) ON DELETE CASCADE,
  name TEXT,
  fiber_count INTEGER,
  attenuation_db_km NUMERIC(8,4) NOT NULL DEFAULT 0.35,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  geom geometry(LineString, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_network_nodes_geom
  ON network_nodes USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_network_links_geom
  ON network_links USING GIST (geom);
