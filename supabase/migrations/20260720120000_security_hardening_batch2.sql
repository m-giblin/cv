-- Security hardening batch 2: audit log permissions
-- insert_audit_log was created as (text, text, text, jsonb) in sprint5 — not uuid for p_target_id.

drop function if exists public.insert_audit_log(text, text, text, jsonb);

create or replace function public.insert_audit_log(
  p_action text,
  p_target_type text,
  p_target_id text default null,
  p_details jsonb default '{}'::jsonb,
  p_actor_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.audit_logs (actor_id, action, target_type, target_id, details)
  values (coalesce(p_actor_id, auth.uid()), p_action, p_target_type, p_target_id, p_details)
  returning id into new_id;
  return new_id;
end;
$$;

revoke execute on function public.insert_audit_log(text, text, text, jsonb, uuid) from public;
revoke execute on function public.insert_audit_log(text, text, text, jsonb, uuid) from authenticated;
revoke execute on function public.insert_audit_log(text, text, text, jsonb, uuid) from anon;

grant execute on function public.insert_audit_log(text, text, text, jsonb, uuid) to service_role;
