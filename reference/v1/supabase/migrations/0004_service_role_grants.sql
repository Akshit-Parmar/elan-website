-- ============================================================================
-- Élan 2026 — grant the backend role access to the portal tables (0004)
-- ----------------------------------------------------------------------------
-- Fixes "permission denied for table participants" from the issue-participant
-- Edge Function. service_role bypasses RLS but still needs table-level grants,
-- which the portal tables (created in 0002) were missing in this project.
-- service_role is server-side only (never exposed to the browser), so full
-- access to your own schema is correct and safe.
-- ============================================================================
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- keep future tables/sequences covered too
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
