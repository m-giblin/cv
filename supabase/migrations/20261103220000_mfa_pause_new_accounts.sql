-- MFA is paused for everyone: every new profile gets an exemption as it is created.
-- To turn MFA back on for new accounts, drop the trigger; to turn it back on for everyone,
-- also delete the rows with reason 'MFA paused for all users'.

create or replace function public.exempt_new_profile_from_mfa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.mfa_exemptions (user_id, reason)
  values (new.id, 'MFA paused for all users')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.exempt_new_profile_from_mfa() from public, anon, authenticated;

drop trigger if exists exempt_new_profile_from_mfa on public.profiles;
create trigger exempt_new_profile_from_mfa
  after insert on public.profiles
  for each row execute function public.exempt_new_profile_from_mfa();
