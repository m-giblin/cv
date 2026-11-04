-- A super admin can belong to several workspaces (tenants), not just one home workspace.
-- They appear in each one's People list, can have a manager there and can mentor or manage its
-- people, all from one sign-in. home_tenant_id stays as the default; member_tenant_ids is the
-- full list (it always includes the home workspace). No new table, so no new grants are needed.

alter table public.profiles add column if not exists member_tenant_ids uuid[] not null default '{}';
create index if not exists profiles_member_tenant_ids_idx on public.profiles using gin (member_tenant_ids);

-- Existing home workspaces become the first membership.
update public.profiles
set member_tenant_ids = array[home_tenant_id]
where home_tenant_id is not null
  and not (home_tenant_id = any(member_tenant_ids));

-- Profile visibility: a member of a workspace is visible inside it, the same way a home member is.
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
          and (
            coalesce(target.tenant_id, target.home_tenant_id) = public.effective_tenant_id()
            or public.effective_tenant_id() = any(target.member_tenant_ids)
          )
      )
    else (
      exists (
        select 1
        from public.profiles actor
        join public.profiles target on target.id = target_profile_id
        where actor.id = auth.uid()
          and actor.tenant_id is not null
          and (
            actor.tenant_id = coalesce(target.tenant_id, target.home_tenant_id)
            or actor.tenant_id = any(target.member_tenant_ids)
          )
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
