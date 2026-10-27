-- 20260819120000_data_api_grants.sql ran `grant execute on all functions in schema public to
-- authenticated` AFTER the migrations that made privileged functions service-role only, so those
-- functions became callable by any signed-in user again. Put them back, and stop handing every
-- future table, sequence and function to `authenticated` automatically: new objects are granted
-- explicitly in the migration that creates them (see ~/.claude/CLAUDE.md).

-- promote_to_super_admin would let any signed-in user make themself a super admin.
revoke all on function public.promote_to_super_admin(uuid) from public, anon, authenticated;
grant execute on function public.promote_to_super_admin(uuid) to service_role;

-- insert_audit_log takes the actor and tenant as arguments, so a signed-in user could forge audit entries.
revoke all on function public.insert_audit_log(text, text, text, jsonb, uuid, uuid) from public, anon, authenticated;
grant execute on function public.insert_audit_log(text, text, text, jsonb, uuid, uuid) to service_role;

-- Future objects start with no Data API access for signed-in users or anonymous visitors.
alter default privileges in schema public revoke select, insert, update, delete on tables from authenticated;
alter default privileges in schema public revoke usage, select on sequences from authenticated;
alter default privileges in schema public revoke execute on functions from authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;
