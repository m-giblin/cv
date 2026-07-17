-- Ensure a single insert_audit_log overload (6-arg) and durable grants.
-- Stale 4/5-arg overloads cause PostgREST RPC ambiguity / silent write failures.

drop function if exists public.insert_audit_log(text, text, text, jsonb);
drop function if exists public.insert_audit_log(text, text, text, jsonb, uuid);
drop function if exists public.insert_audit_log(text, text, text, jsonb, uuid, uuid);

create function public.insert_audit_log(
  p_action text,
  p_target_type text,
  p_target_id text default null,
  p_details jsonb default '{}'::jsonb,
  p_actor_id uuid default null,
  p_tenant_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  resolved_tenant uuid;
begin
  resolved_tenant := coalesce(
    p_tenant_id,
    (select tenant_id from public.profiles where id = coalesce(p_actor_id, auth.uid()))
  );

  insert into public.audit_logs (actor_id, action, target_type, target_id, details, tenant_id)
  values (
    coalesce(p_actor_id, auth.uid()),
    p_action,
    p_target_type,
    p_target_id,
    coalesce(p_details, '{}'::jsonb),
    resolved_tenant
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.insert_audit_log(text, text, text, jsonb, uuid, uuid) from public;
revoke all on function public.insert_audit_log(text, text, text, jsonb, uuid, uuid) from anon;
revoke all on function public.insert_audit_log(text, text, text, jsonb, uuid, uuid) from authenticated;
grant execute on function public.insert_audit_log(text, text, text, jsonb, uuid, uuid) to service_role;

comment on function public.insert_audit_log(text, text, text, jsonb, uuid, uuid) is
  'Privileged audit writer for service_role only. App code falls back to direct insert if RPC fails.';
