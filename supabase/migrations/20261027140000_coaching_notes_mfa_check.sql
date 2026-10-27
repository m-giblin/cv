-- MFA policies should all go through public.require_aal2() so one rule decides who counts as
-- MFA-verified (including named test accounts in mfa_exemptions). manager_coaching_notes checked the
-- JWT directly, so an exempt manager couldn't save private coaching notes. Rewrite any restrictive
-- policy in public that still inspects the 'aal' claim itself.

do $$
declare
  pol record;
begin
  for pol in
    select tablename, policyname, cmd
    from pg_policies
    where schemaname = 'public'
      and permissive = 'RESTRICTIVE'
      and (coalesce(qual, '') like '%aal%' or coalesce(with_check, '') like '%aal%')
      and coalesce(qual, '') not like '%require_aal2%'
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
    if pol.cmd = 'SELECT' or pol.cmd = 'DELETE' then
      execute format(
        'create policy %I on public.%I as restrictive for %s to authenticated using (public.require_aal2())',
        pol.policyname, pol.tablename, pol.cmd
      );
    elsif pol.cmd = 'INSERT' then
      execute format(
        'create policy %I on public.%I as restrictive for insert to authenticated with check (public.require_aal2())',
        pol.policyname, pol.tablename
      );
    else
      execute format(
        'create policy %I on public.%I as restrictive for %s to authenticated using (public.require_aal2()) with check (public.require_aal2())',
        pol.policyname, pol.tablename, pol.cmd
      );
    end if;
    raise notice 'Rewrote % on %', pol.policyname, pol.tablename;
  end loop;
end $$;
