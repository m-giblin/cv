-- Cross-tenant RLS hardening.
--
-- Every policy replaced below was confirmed exploitable against a two-tenant local
-- database using real end-user JWTs (see Smoke Tests 101, findings SEC-01 … SEC-13).
-- The common defect is a role predicate (`is_admin()`, `role in ('manager','director')`)
-- used on its own: those helpers answer "what role is this person?", never "which tenant
-- are they in?", so a manager or admin in one tenant satisfied them for every tenant's
-- rows. Each policy now ANDs `can_access_tenant_row(tenant_id)` (or an equivalent join
-- back to the owning tenant) onto the existing role check.
--
-- Policies are also re-issued `to authenticated` rather than the implicit `to public`, so
-- they can never be evaluated for the `anon` role.

-- ---------------------------------------------------------------------------
-- SEC-01  isc_lab_knowledge_chunks: an open `using (true)` policy survived the
--         multi-tenant rollout because 20260809120000 dropped `..._select_auth`
--         while 20260727140000 had created `..._select_authenticated`. Permissive
--         policies OR together, so the open one silently defeated the scoped one.
-- ---------------------------------------------------------------------------
drop policy if exists "isc_lab_knowledge_chunks_select_authenticated" on public.isc_lab_knowledge_chunks;

drop policy if exists "isc_lab_knowledge_chunks_select_auth" on public.isc_lab_knowledge_chunks;
create policy "isc_lab_knowledge_chunks_select_auth" on public.isc_lab_knowledge_chunks
  for select to authenticated
  using (public.can_access_tenant_row(tenant_id));

-- ---------------------------------------------------------------------------
-- SEC-02  manager_coaching_notes hold the most sensitive free text in the product
--         (performance and comp commentary). `is_admin()` alone let any tenant's
--         admin read every tenant's notes.
-- ---------------------------------------------------------------------------
drop policy if exists manager_coaching_notes_select on public.manager_coaching_notes;
create policy manager_coaching_notes_select on public.manager_coaching_notes
  for select to authenticated
  using (
    manager_id = auth.uid()
    or (public.is_admin(auth.uid()) and public.can_access_tenant_row(tenant_id))
  );

-- ---------------------------------------------------------------------------
-- SEC-05  onboarding_plans / SEC-06 plan_steps / SEC-07 simulation_templates /
--         release_courses: `for all` policies with a bare role check granted
--         cross-tenant SELECT *and* UPDATE/DELETE on shared content.
-- ---------------------------------------------------------------------------
drop policy if exists onboarding_plans_manage_managers on public.onboarding_plans;
create policy onboarding_plans_manage_managers on public.onboarding_plans
  for all to authenticated
  using (
    public.can_access_tenant_row(tenant_id)
    and (
      public.is_admin(auth.uid())
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('manager', 'director')
      )
    )
  )
  with check (
    public.can_access_tenant_row(tenant_id)
    and (
      public.is_admin(auth.uid())
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('manager', 'director')
      )
    )
  );

drop policy if exists plan_steps_manage_plan_managers on public.plan_steps;
create policy plan_steps_manage_plan_managers on public.plan_steps
  for all to authenticated
  using (
    exists (
      select 1
      from public.onboarding_plans op
      where op.id = plan_steps.plan_id
        and public.can_access_tenant_row(op.tenant_id)
    )
    and (
      public.is_admin(auth.uid())
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('manager', 'director')
      )
    )
  )
  with check (
    exists (
      select 1
      from public.onboarding_plans op
      where op.id = plan_steps.plan_id
        and public.can_access_tenant_row(op.tenant_id)
    )
    and (
      public.is_admin(auth.uid())
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('manager', 'director')
      )
    )
  );

drop policy if exists simulation_templates_manage_admin_manager on public.simulation_templates;
create policy simulation_templates_manage_admin_manager on public.simulation_templates
  for all to authenticated
  using (
    public.can_access_tenant_row(tenant_id)
    and (
      public.is_admin(auth.uid())
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('manager', 'director')
      )
    )
  )
  with check (
    public.can_access_tenant_row(tenant_id)
    and (
      public.is_admin(auth.uid())
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('manager', 'director')
      )
    )
  );

drop policy if exists release_courses_manage_manager_admin on public.release_courses;
create policy release_courses_manage_manager_admin on public.release_courses
  for all to authenticated
  using (
    public.can_access_tenant_row(tenant_id)
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('manager', 'director', 'admin')
    )
  )
  with check (
    public.can_access_tenant_row(tenant_id)
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('manager', 'director', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- SEC-08  ai_usage_logs expose per-tenant spend and feature mix.
-- ---------------------------------------------------------------------------
drop policy if exists ai_usage_logs_admin_read on public.ai_usage_logs;
create policy ai_usage_logs_admin_read on public.ai_usage_logs
  for select to authenticated
  using (
    public.is_super_admin(auth.uid())
    or (public.is_admin(auth.uid()) and public.can_access_tenant_row(tenant_id))
  );

-- ---------------------------------------------------------------------------
-- SEC-09  segment_certificates were readable by *any* manager/director/admin in
--         any tenant. Scope to the row owner, their reporting line, or a
--         same-tenant admin.
-- ---------------------------------------------------------------------------
drop policy if exists segment_certs_select_own_or_manager on public.segment_certificates;
create policy segment_certs_select_own_or_manager on public.segment_certificates
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.can_access_profile(user_id)
  );

-- ---------------------------------------------------------------------------
-- SEC-13  gong_call_intel carries customer call content. The `user_id is null`
--         disjunct made every unassigned row world-readable to any authenticated
--         user in any tenant.
-- ---------------------------------------------------------------------------
drop policy if exists gong_call_intel_select_own_or_manager on public.gong_call_intel;
create policy gong_call_intel_select_own_or_manager on public.gong_call_intel
  for select to authenticated
  using (
    public.can_access_tenant_row(tenant_id)
    and (
      user_id is null
      or user_id = auth.uid()
      or public.can_access_profile(user_id)
    )
  );

drop policy if exists gong_call_intel_insert_authenticated on public.gong_call_intel;
create policy gong_call_intel_insert_authenticated on public.gong_call_intel
  for insert to authenticated
  with check (public.can_access_tenant_row(tenant_id));

drop policy if exists gong_call_intel_update_authenticated on public.gong_call_intel;
create policy gong_call_intel_update_authenticated on public.gong_call_intel
  for update to authenticated
  using (public.can_access_tenant_row(tenant_id))
  with check (public.can_access_tenant_row(tenant_id));

-- ---------------------------------------------------------------------------
-- challenges: writes were role-gated but not tenant-gated, so a manager could
-- edit (or plant) library content in another tenant.
-- ---------------------------------------------------------------------------
drop policy if exists challenges_create_authenticated on public.challenges;
create policy challenges_create_authenticated on public.challenges
  for insert to authenticated
  with check (
    public.can_access_tenant_row(tenant_id)
    and (created_by = auth.uid() or public.is_admin(auth.uid()))
  );

drop policy if exists challenges_update_owner_manager_admin on public.challenges;
create policy challenges_update_owner_manager_admin on public.challenges
  for update to authenticated
  using (
    public.can_access_tenant_row(tenant_id)
    and (
      created_by = auth.uid()
      or public.is_admin(auth.uid())
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('manager', 'director')
      )
    )
  )
  with check (
    public.can_access_tenant_row(tenant_id)
    and (
      created_by = auth.uid()
      or public.is_admin(auth.uid())
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('manager', 'director')
      )
    )
  );

drop policy if exists corpus_sme_answers_insert_manager_admin on public.corpus_sme_answers;
create policy corpus_sme_answers_insert_manager_admin on public.corpus_sme_answers
  for insert to authenticated
  with check (
    public.can_access_tenant_row(tenant_id)
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('manager', 'director', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- plan_holidays: `tenant_id = coalesce((select tenant_id from profiles ...), tenant_id)`
-- collapses to `tenant_id = tenant_id` — i.e. true for every row — whenever the
-- caller has no profile row or a null tenant_id. Fail closed instead, with an
-- explicit super-admin allowance.
-- ---------------------------------------------------------------------------
drop policy if exists plan_holidays_select_tenant on public.plan_holidays;
create policy plan_holidays_select_tenant on public.plan_holidays
  for select to authenticated
  using (public.can_access_tenant_row(tenant_id));

-- ---------------------------------------------------------------------------
-- SEC-03  Privilege escalation.
--
-- `guard_profiles_sensitive_update` returned early for any admin, so an admin could
-- rewrite their own `role` to 'super_admin' (the `profiles_update_self_or_admin`
-- policy happily allows writing your own row). Admins legitimately need to change
-- role/level/manager for people in their own tenant, so the guard now allows that
-- but refuses the two escalation paths: minting super_admins, and moving a profile
-- between tenants. Only the service role (auth.uid() is null) may do either.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profiles_sensitive_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service-role / trigger-less contexts (seeding, admin API) keep full control.
  if auth.uid() is null then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'Cannot change profile id';
  end if;

  -- No end-user session may mint a super admin, including for themselves.
  if new.role is distinct from old.role and new.role = 'super_admin' then
    raise exception 'Cannot grant super_admin';
  end if;

  -- Nor move a profile into a different tenant.
  if new.tenant_id is distinct from old.tenant_id and not public.is_super_admin(auth.uid()) then
    raise exception 'Cannot change tenant';
  end if;

  if public.is_super_admin(auth.uid()) then
    return new;
  end if;

  -- Tenant admins may re-grade and re-parent people inside their own tenant.
  if public.is_admin(auth.uid()) and public.can_access_tenant_row(old.tenant_id) then
    return new;
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

-- Belt and braces: the policy itself should not admit foreign-tenant rows.
drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin on public.profiles
  for update to authenticated
  using (
    id = auth.uid()
    or public.is_super_admin(auth.uid())
    or (public.is_admin(auth.uid()) and public.can_access_tenant_row(tenant_id))
  )
  with check (
    id = auth.uid()
    or public.is_super_admin(auth.uid())
    or (public.is_admin(auth.uid()) and public.can_access_tenant_row(tenant_id))
  );
