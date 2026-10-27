-- A super admin with a home workspace is a member of it for training: they can have a manager and
-- mentor people there. Their profile has no tenant_id, so profile visibility also matches on
-- home_tenant_id; otherwise their own manager couldn't see them on the team or pick them as a mentor.

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
          and coalesce(target.tenant_id, target.home_tenant_id) = public.effective_tenant_id()
      )
    else (
      exists (
        select 1
        from public.profiles actor
        join public.profiles target on target.id = target_profile_id
        where actor.id = auth.uid()
          and actor.tenant_id is not null
          and actor.tenant_id = coalesce(target.tenant_id, target.home_tenant_id)
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

