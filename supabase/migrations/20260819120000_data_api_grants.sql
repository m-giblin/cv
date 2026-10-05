-- Explicit Data API grants.
--
-- Every table in this schema was created without GRANTs, which only worked because older
-- Supabase projects auto-exposed new `public` entities to the Data API roles. That default
-- is gone for projects created after the change (and the `auto_expose_new_tables` config
-- flag is removed on 2026-10-30), so a fresh deployment fails with
-- `permission denied for table profiles` on the very first query.
--
-- Grants are issued to `authenticated` and `service_role` only:
--   * `authenticated` still passes through row-level security on every table, so this
--     restores API reachability without widening the data any single user can see.
--   * `service_role` is the trusted server-side client and bypasses RLS by design.
--   * `anon` is deliberately NOT granted. Unauthenticated surfaces (buyer share rooms)
--     go through the service-role admin client in the route handler, so anonymous
--     PostgREST access is never needed.

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

grant execute on all functions in schema public to authenticated, service_role;

-- Objects created by later migrations inherit the same grants.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;

alter default privileges in schema public
  grant execute on functions to authenticated, service_role;
