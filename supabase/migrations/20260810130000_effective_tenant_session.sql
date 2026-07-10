-- Phase 2: effective tenant session for super-admin shadow (RLS scoping at DB layer)
-- When app.tenant_id is set on the session, super_admin RLS is limited to that tenant.
-- Platform console (no app.tenant_id) retains cross-tenant visibility for super_admin.

create or replace function public.effective_tenant_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.tenant_id', true), '')::uuid;
$$;

create or replace function public.set_session_tenant(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only super-admins may set session tenant context';
  end if;

  if p_tenant_id is null then
    perform set_config('app.tenant_id', '', true);
    return;
  end if;

  if not exists (select 1 from public.tenants t where t.id = p_tenant_id) then
    raise exception 'Unknown tenant';
  end if;

  perform set_config('app.tenant_id', p_tenant_id::text, true);
end;
$$;

create or replace function public.can_access_tenant_row(row_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_super_admin(auth.uid()) then
      public.effective_tenant_id() is null or row_tenant_id = public.effective_tenant_id()
    else
      row_tenant_id = public.current_tenant_id(auth.uid())
  end;
$$;

create or replace function public.can_access_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_super_admin(auth.uid()) then
      public.effective_tenant_id() is null
      or exists (
        select 1
        from public.profiles target
        where target.id = target_profile_id
          and target.tenant_id = public.effective_tenant_id()
      )
    else (
      exists (
        select 1
        from public.profiles actor
        join public.profiles target on target.id = target_profile_id
        where actor.id = auth.uid()
          and actor.tenant_id is not null
          and actor.tenant_id = target.tenant_id
      )
      and (
        auth.uid() = target_profile_id
        or public.is_admin(auth.uid())
        or exists (
          select 1
          from public.get_profile_subtree(auth.uid()) visible
          where visible.id = target_profile_id
        )
      )
    )
  end;
$$;

grant execute on function public.effective_tenant_id() to authenticated, service_role;
grant execute on function public.set_session_tenant(uuid) to authenticated, service_role;
