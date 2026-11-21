-- Enable Row Level Security on every application table.
--
-- Supabase exposes all tables in the `public` schema through PostgREST using the
-- publishable anon key, which ships to the browser. Without RLS enabled, anyone
-- holding that key can read and write these tables directly, including owner
-- PII (owner_properties, appraisal_requests) and unreviewed pipeline data.
--
-- No policies are created here on purpose: RLS with zero policies denies all
-- access to the anon/authenticated roles while the server-side connection
-- (DATABASE_URL owner role) and the service role key continue to work.
-- Owner-scoped policies must be added alongside the features that need them.

ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE mansions ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_attribute_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE mansion_match_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_match_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE appraisal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;
