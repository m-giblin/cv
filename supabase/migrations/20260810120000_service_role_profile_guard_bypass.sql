-- Service-role profile updates (seed scripts, admin API) run with auth.uid() null.
-- Allow those trusted writes; interactive users still pass through the guard.

create or replace function public.guard_profiles_sensitive_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.is_admin(auth.uid()) then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'Cannot change profile id';
  end if;

  if new.role is distinct from old.role then
    raise exception 'Cannot change role';
  end if;

  if new.level is distinct from old.level then
    raise exception 'Cannot change level';
  end if;

  if new.manager_id is distinct from old.manager_id then
    raise exception 'Cannot change manager';
  end if;

  if new.email is distinct from old.email then
    raise exception 'Cannot change email';
  end if;

  return new;
end;
$$;

-- Optional helper for SQL editor promotions (service-role guard bypass must be applied).
create or replace function public.promote_to_super_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    role = 'super_admin',
    tenant_id = null,
    manager_id = null,
    level = 'Senior'
  where id = p_user_id;
  if not found then
    raise exception 'Profile not found for %', p_user_id;
  end if;
end;
$$;

revoke all on function public.promote_to_super_admin(uuid) from public;
grant execute on function public.promote_to_super_admin(uuid) to service_role;
