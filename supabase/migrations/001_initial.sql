-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Data source registry and metadata
CREATE TABLE IF NOT EXISTS data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_type text NOT NULL,
  base_url text,
  acquisition_method text NOT NULL,
  terms_status text NOT NULL DEFAULT 'pending_review',
  scraping_status text NOT NULL DEFAULT 'disabled',
  commercial_use_status text NOT NULL DEFAULT 'restricted',
  publication_status text NOT NULL DEFAULT 'not_allowed',
  terms_checked_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Raw data payload storage
CREATE TABLE IF NOT EXISTS raw_source_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  external_id text,
  raw_payload jsonb NOT NULL,
  source_url text,
  content_hash text,
  observed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Observations extracted from raw records
CREATE TABLE IF NOT EXISTS source_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  external_id text,
  entity_type text NOT NULL CHECK (entity_type IN ('project','mansion','building','unit','market','listing')),
  canonical_name text,
  address text,
  building_label text,
  built_year smallint,
  built_month smallint,
  floors_above smallint,
  floors_below smallint,
  total_units smallint,
  structure text,
  latitude numeric,
  longitude numeric,
  source_url text,
  observed_at timestamptz NOT NULL,
  raw_source_record_id uuid REFERENCES raw_source_records(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Canonical Projects (large developments)
CREATE TABLE IF NOT EXISTS projects (
  id text PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  canonical_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  prefecture text,
  city text,
  ward text,
  address_summary text,
  latitude numeric,
  longitude numeric,
  geometry geometry(Point, 4326),
  developer text,
  description text,
  public_status text NOT NULL DEFAULT 'draft',
  review_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Canonical Mansions (user / market / SEO entity)
CREATE TABLE IF NOT EXISTS mansions (
  id text PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  project_id text REFERENCES projects(id) ON DELETE SET NULL,
  canonical_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  prefecture text,
  city text,
  ward text,
  town text,
  address text,
  latitude numeric,
  longitude numeric,
  built_year smallint,
  built_month smallint,
  total_units smallint,
  developer text,
  constructor text,
  management_company text,
  mansion_type text,
  public_status text NOT NULL DEFAULT 'draft',
  review_status text NOT NULL DEFAULT 'pending',
  confidence_score numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Canonical Buildings (physical / GIS entity)
CREATE TABLE IF NOT EXISTS buildings (
  id text PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  mansion_id text NOT NULL REFERENCES mansions(id) ON DELETE CASCADE,
  canonical_name text NOT NULL,
  building_label text,
  latitude numeric,
  longitude numeric,
  geometry geometry(Point, 4326),
  built_year smallint,
  built_month smallint,
  floors_above smallint,
  floors_below smallint,
  total_units smallint,
  structure text,
  public_status text NOT NULL DEFAULT 'draft',
  review_status text NOT NULL DEFAULT 'pending',
  confidence_score numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Canonical Units (actual dwellings)
CREATE TABLE IF NOT EXISTS units (
  id text PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  mansion_id text NOT NULL REFERENCES mansions(id) ON DELETE CASCADE,
  building_id text REFERENCES buildings(id) ON DELETE SET NULL,
  room_number text,
  floor smallint,
  area_sqm numeric,
  layout text,
  direction text,
  balcony_area_sqm numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Provenance for any canonical entity attribute
CREATE TABLE IF NOT EXISTS entity_attribute_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  attribute_name text NOT NULL,
  attribute_value text,
  source_id uuid REFERENCES data_sources(id) ON DELETE SET NULL,
  observation_id uuid REFERENCES source_observations(id) ON DELETE SET NULL,
  confidence numeric,
  publication_allowed boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Mansion matching candidates
CREATE TABLE IF NOT EXISTS mansion_match_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id uuid NOT NULL REFERENCES source_observations(id) ON DELETE CASCADE,
  candidate_mansion_id text NOT NULL REFERENCES mansions(id) ON DELETE CASCADE,
  score numeric NOT NULL,
  name_score numeric,
  address_score numeric,
  geo_score numeric,
  year_score numeric,
  project_score numeric,
  status text NOT NULL DEFAULT 'pending',
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Building matching candidates
CREATE TABLE IF NOT EXISTS building_match_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id uuid NOT NULL REFERENCES source_observations(id) ON DELETE CASCADE,
  candidate_building_id text NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  score numeric NOT NULL,
  label_score numeric,
  address_score numeric,
  geo_score numeric,
  year_score numeric,
  floors_score numeric,
  structure_score numeric,
  status text NOT NULL DEFAULT 'pending',
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Owner properties
CREATE TABLE IF NOT EXISTS owner_properties (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  mansion_id text NOT NULL REFERENCES mansions(id) ON DELETE CASCADE,
  building_id text REFERENCES buildings(id) ON DELETE SET NULL,
  unit_id text REFERENCES units(id) ON DELETE SET NULL,
  room_number text,
  floor smallint,
  area_sqm numeric,
  layout text,
  direction text,
  estimated_price numeric,
  estimated_price_min numeric,
  estimated_price_max numeric,
  registered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Appraisal requests
CREATE TABLE IF NOT EXISTS appraisal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  owner_property_id text NOT NULL REFERENCES owner_properties(id) ON DELETE CASCADE,
  selling_timeline text,
  selling_reason text,
  comment text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User behavior events
CREATE TABLE IF NOT EXISTS user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Market data observations
CREATE TABLE IF NOT EXISTS market_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  metric_type text NOT NULL,
  value numeric,
  value_min numeric,
  value_max numeric,
  period_start date,
  period_end date,
  sample_size integer,
  source_id uuid REFERENCES data_sources(id) ON DELETE SET NULL,
  observed_at timestamptz NOT NULL,
  publication_allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Property listings / transactions
CREATE TABLE IF NOT EXISTS property_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mansion_id text NOT NULL REFERENCES mansions(id) ON DELETE CASCADE,
  building_id text REFERENCES buildings(id) ON DELETE SET NULL,
  unit_id text REFERENCES units(id) ON DELETE SET NULL,
  floor smallint,
  area_sqm numeric,
  layout text,
  direction text,
  asking_price numeric,
  price_per_sqm numeric,
  price_per_tsubo numeric,
  listed_at timestamptz,
  source_id uuid REFERENCES data_sources(id) ON DELETE SET NULL,
  source_url text,
  observation_id uuid REFERENCES source_observations(id) ON DELETE SET NULL,
  publication_allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_mansions_slug ON mansions(slug);
CREATE INDEX IF NOT EXISTS idx_mansions_project_id ON mansions(project_id);
CREATE INDEX IF NOT EXISTS idx_mansions_public_status ON mansions(public_status);
CREATE INDEX IF NOT EXISTS idx_buildings_mansion_id ON buildings(mansion_id);
CREATE INDEX IF NOT EXISTS idx_buildings_public_status ON buildings(public_status);
CREATE INDEX IF NOT EXISTS idx_units_mansion_id ON units(mansion_id);
CREATE INDEX IF NOT EXISTS idx_units_building_id ON units(building_id);
CREATE INDEX IF NOT EXISTS idx_owner_properties_user_id ON owner_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_owner_properties_mansion_id ON owner_properties(mansion_id);
CREATE INDEX IF NOT EXISTS idx_appraisal_requests_user_id ON appraisal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_appraisal_requests_owner_property_id ON appraisal_requests(owner_property_id);
CREATE INDEX IF NOT EXISTS idx_entity_attribute_sources_entity ON entity_attribute_sources(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_market_observations_entity ON market_observations(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_property_listings_mansion_id ON property_listings(mansion_id);
