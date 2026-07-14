-- Phase 2: tenant_id on data tables + tenant-scoped RLS
-- Phase 3: tenant branding + admin provisioning invites
-- Audit: tenant_id on audit_logs + super-admin cross-tenant visibility

-- ---------------------------------------------------------------------------
-- Phase 3: tenant branding + provisioning
-- ---------------------------------------------------------------------------

alter table public.tenants
  add column if not exists branding_primary_color text not null default '#0071ce',
  add column if not exists branding_logo_url text,
  add column if not exists allowed_email_domains jsonb not null default '[]'::jsonb,
  add column if not exists welcome_message text;

create table if not exists public.tenant_admin_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email text not null,
  full_name text not null,
  invited_by uuid references public.profiles (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (tenant_id, email)
);

create index if not exists tenant_admin_invites_tenant_idx
  on public.tenant_admin_invites (tenant_id, status);

alter table public.tenant_admin_invites enable row level security;

drop policy if exists tenant_admin_invites_super_admin on public.tenant_admin_invites;
create policy tenant_admin_invites_super_admin on public.tenant_admin_invites
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_access_tenant_row(row_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin(auth.uid())
    or row_tenant_id = public.current_tenant_id(auth.uid());
$$;

create or replace function public.can_access_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin(auth.uid())
    or (
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
    );
$$;

-- ---------------------------------------------------------------------------
-- Add tenant_id columns (nullable during backfill)
-- ---------------------------------------------------------------------------

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'activity_logs', 'adaptive_probe_sessions', 'ai_provider_configs', 'ai_usage_logs',
    'audit_logs', 'buyer_share_events', 'buyer_share_rooms', 'challenge_competencies',
    'challenge_submissions', 'challenges', 'coaching_card_competencies', 'coaching_cards',
    'competencies', 'content_assets', 'corpus_asset_feedback', 'corpus_qa_inquiries',
    'corpus_routing_rules', 'corpus_sme_answers', 'deal_prep_sessions', 'development_goals',
    'development_plans', 'enablement_program_segments', 'enablement_programs',
    'gamification_events', 'goal_quarterly_reviews', 'gong_call_intel',
    'integration_connections', 'isc_lab_interactions', 'isc_lab_knowledge_chunks',
    'isc_lab_precall_briefs', 'learn_module_progress', 'manager_coaching_notes',
    'market_pulse_results', 'market_pulse_weeks', 'mentor_review_requests',
    'notifications', 'onboarding_plans', 'pitch_peer_reviews', 'pitch_submissions',
    'plan_assignment_steps', 'plan_assignments', 'plan_step_prerequisites', 'plan_steps',
    'readiness_certifications', 'release_courses', 'resource_engagement',
    'segment_certificates', 'segment_unlock_overrides', 'shadow_meeting_logs',
    'simulation_assignments', 'simulation_templates'
  ]
  loop
    execute format(
      'alter table public.%I add column if not exists tenant_id uuid references public.tenants (id) on delete restrict',
      tbl
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Backfill: default tenant for catalogs
-- Guard triggers require auth.uid(); disable during migration backfill.
-- ---------------------------------------------------------------------------

alter table public.challenge_submissions disable trigger guard_challenge_submissions_update;
alter table public.coaching_cards disable trigger guard_coaching_cards_update;
alter table public.readiness_certifications disable trigger guard_readiness_certifications_update;
alter table public.plan_assignment_steps disable trigger guard_plan_assignment_steps_update;

do $$
declare
  tbl text;
  default_tenant uuid := '00000000-0000-4000-8000-000000000001';
begin
  foreach tbl in array array[
    'challenges', 'simulation_templates', 'competencies', 'content_assets',
    'onboarding_plans', 'plan_steps', 'enablement_programs', 'enablement_program_segments',
    'corpus_routing_rules', 'corpus_sme_answers', 'isc_lab_knowledge_chunks',
    'market_pulse_weeks', 'release_courses', 'ai_provider_configs'
  ]
  loop
    execute format(
      'update public.%I set tenant_id = $1 where tenant_id is null',
      tbl
    ) using default_tenant;
  end loop;
end $$;

-- Backfill from profiles.user_id
update public.activity_logs al
set tenant_id = p.tenant_id
from public.profiles p
where p.id = al.user_id and al.tenant_id is null;

update public.challenge_submissions cs
set tenant_id = p.tenant_id
from public.profiles p
where p.id = cs.user_id and cs.tenant_id is null;

update public.simulation_assignments sa
set tenant_id = p.tenant_id
from public.profiles p
where p.id = sa.assigned_to and sa.tenant_id is null;

update public.coaching_cards cc
set tenant_id = p.tenant_id
from public.profiles p
where p.id = cc.user_id and cc.tenant_id is null;

update public.plan_assignments pa
set tenant_id = p.tenant_id
from public.profiles p
where p.id = pa.user_id and pa.tenant_id is null;

update public.notifications n
set tenant_id = p.tenant_id
from public.profiles p
where p.id = n.user_id and n.tenant_id is null;

update public.deal_prep_sessions d
set tenant_id = p.tenant_id
from public.profiles p
where p.id = d.user_id and d.tenant_id is null;

update public.development_plans dp
set tenant_id = p.tenant_id
from public.profiles p
where p.id = dp.user_id and dp.tenant_id is null;

update public.readiness_certifications rc
set tenant_id = p.tenant_id
from public.profiles p
where p.id = rc.user_id and rc.tenant_id is null;

update public.learn_module_progress lmp
set tenant_id = p.tenant_id
from public.profiles p
where p.id = lmp.user_id and lmp.tenant_id is null;

update public.pitch_submissions ps
set tenant_id = p.tenant_id
from public.profiles p
where p.id = ps.user_id and ps.tenant_id is null;

update public.resource_engagement re
set tenant_id = p.tenant_id
from public.profiles p
where p.id = re.user_id and re.tenant_id is null;

update public.adaptive_probe_sessions aps
set tenant_id = p.tenant_id
from public.profiles p
where p.id = aps.user_id and aps.tenant_id is null;

update public.gamification_events ge
set tenant_id = p.tenant_id
from public.profiles p
where p.id = ge.user_id and ge.tenant_id is null;

update public.mentor_review_requests mrr
set tenant_id = p.tenant_id
from public.profiles p
where p.id = mrr.user_id and mrr.tenant_id is null;

update public.manager_coaching_notes mcn
set tenant_id = p.tenant_id
from public.profiles p
where p.id = mcn.se_user_id and mcn.tenant_id is null;

update public.shadow_meeting_logs sml
set tenant_id = p.tenant_id
from public.profiles p
where p.id = sml.user_id and sml.tenant_id is null;

update public.market_pulse_results mpr
set tenant_id = p.tenant_id
from public.profiles p
where p.id = mpr.user_id and mpr.tenant_id is null;

update public.integration_connections ic
set tenant_id = p.tenant_id
from public.profiles p
where p.id = ic.user_id and ic.tenant_id is null;

update public.gong_call_intel gci
set tenant_id = p.tenant_id
from public.profiles p
where p.id = gci.user_id and gci.tenant_id is null;

update public.isc_lab_interactions ili
set tenant_id = p.tenant_id
from public.profiles p
where p.id = ili.user_id and ili.tenant_id is null;

update public.isc_lab_precall_briefs ipb
set tenant_id = p.tenant_id
from public.profiles p
where p.id = ipb.user_id and ipb.tenant_id is null;

update public.corpus_asset_feedback caf
set tenant_id = p.tenant_id
from public.profiles p
where p.id = caf.user_id and caf.tenant_id is null;

update public.corpus_qa_inquiries cqi
set tenant_id = p.tenant_id
from public.profiles p
where p.id = cqi.user_id and cqi.tenant_id is null;

update public.ai_usage_logs aul
set tenant_id = p.tenant_id
from public.profiles p
where p.id = aul.user_id and aul.tenant_id is null;

update public.buyer_share_rooms bsr
set tenant_id = p.tenant_id
from public.profiles p
where p.id = bsr.user_id and bsr.tenant_id is null;

-- Backfill from parent rows
update public.challenge_competencies cc
set tenant_id = c.tenant_id
from public.challenges c
where c.id = cc.challenge_id and cc.tenant_id is null;

update public.coaching_card_competencies ccc
set tenant_id = cc.tenant_id
from public.coaching_cards cc
where cc.id = ccc.coaching_card_id and ccc.tenant_id is null;

update public.plan_assignment_steps pas
set tenant_id = pa.tenant_id
from public.plan_assignments pa
where pa.id = pas.assignment_id and pas.tenant_id is null;

update public.plan_step_prerequisites psp
set tenant_id = ps.tenant_id
from public.plan_steps ps
where ps.id = psp.plan_step_id and psp.tenant_id is null;

update public.development_goals dg
set tenant_id = dp.tenant_id
from public.development_plans dp
where dp.id = dg.plan_id and dg.tenant_id is null;

update public.goal_quarterly_reviews gqr
set tenant_id = dg.tenant_id
from public.development_goals dg
where dg.id = gqr.goal_id and gqr.tenant_id is null;

update public.segment_certificates sc
set tenant_id = pa.tenant_id
from public.plan_assignments pa
where pa.id = sc.assignment_id and sc.tenant_id is null;

update public.segment_unlock_overrides suo
set tenant_id = pa.tenant_id
from public.plan_assignments pa
where pa.id = suo.assignment_id and suo.tenant_id is null;

update public.pitch_peer_reviews ppr
set tenant_id = ps.tenant_id
from public.pitch_submissions ps
where ps.id = ppr.pitch_id and ppr.tenant_id is null;

update public.buyer_share_events bse
set tenant_id = bsr.tenant_id
from public.buyer_share_rooms bsr
where bsr.id = bse.room_id and bse.tenant_id is null;

-- Audit logs: tenant from actor profile
update public.audit_logs al
set tenant_id = p.tenant_id
from public.profiles p
where p.id = al.actor_id and al.tenant_id is null;

-- Remaining nulls → default tenant
do $$
declare
  tbl text;
  default_tenant uuid := '00000000-0000-4000-8000-000000000001';
begin
  foreach tbl in array array[
    'activity_logs', 'adaptive_probe_sessions', 'ai_provider_configs', 'ai_usage_logs',
    'audit_logs', 'buyer_share_events', 'buyer_share_rooms', 'challenge_competencies',
    'challenge_submissions', 'challenges', 'coaching_card_competencies', 'coaching_cards',
    'competencies', 'content_assets', 'corpus_asset_feedback', 'corpus_qa_inquiries',
    'corpus_routing_rules', 'corpus_sme_answers', 'deal_prep_sessions', 'development_goals',
    'development_plans', 'enablement_program_segments', 'enablement_programs',
    'gamification_events', 'goal_quarterly_reviews', 'gong_call_intel',
    'integration_connections', 'isc_lab_interactions', 'isc_lab_knowledge_chunks',
    'isc_lab_precall_briefs', 'learn_module_progress', 'manager_coaching_notes',
    'market_pulse_results', 'market_pulse_weeks', 'mentor_review_requests',
    'notifications', 'onboarding_plans', 'pitch_peer_reviews', 'pitch_submissions',
    'plan_assignment_steps', 'plan_assignments', 'plan_step_prerequisites', 'plan_steps',
    'readiness_certifications', 'release_courses', 'resource_engagement',
    'segment_certificates', 'segment_unlock_overrides', 'shadow_meeting_logs',
    'simulation_assignments', 'simulation_templates'
  ]
  loop
    execute format(
      'update public.%I set tenant_id = $1 where tenant_id is null',
      tbl
    ) using default_tenant;
  end loop;
end $$;

alter table public.challenge_submissions enable trigger guard_challenge_submissions_update;
alter table public.coaching_cards enable trigger guard_coaching_cards_update;
alter table public.readiness_certifications enable trigger guard_readiness_certifications_update;
alter table public.plan_assignment_steps enable trigger guard_plan_assignment_steps_update;

-- Indexes for tenant-scoped queries
create index if not exists profiles_tenant_id_idx on public.profiles (tenant_id);
create index if not exists audit_logs_tenant_created_idx on public.audit_logs (tenant_id, created_at desc);
create index if not exists challenges_tenant_id_idx on public.challenges (tenant_id);
create index if not exists ai_usage_logs_tenant_created_idx on public.ai_usage_logs (tenant_id, created_at desc);
create index if not exists simulation_assignments_tenant_created_idx on public.simulation_assignments (tenant_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Catalog RLS: replace global read with tenant-scoped read
-- ---------------------------------------------------------------------------

drop policy if exists "competencies_select_authenticated" on public.competencies;
create policy "competencies_select_authenticated" on public.competencies
  for select to authenticated
  using (public.can_access_tenant_row(tenant_id));

drop policy if exists "competencies_manage_admin" on public.competencies;
create policy "competencies_manage_admin" on public.competencies
  for all to authenticated
  using (public.is_super_admin() or (public.is_admin() and public.can_access_tenant_row(tenant_id)))
  with check (public.is_super_admin() or (public.is_admin() and tenant_id = public.current_tenant_id()));

drop policy if exists "challenges_select_authenticated" on public.challenges;
create policy "challenges_select_authenticated" on public.challenges
  for select to authenticated
  using (public.can_access_tenant_row(tenant_id));

drop policy if exists "simulation_templates_select_authenticated" on public.simulation_templates;
create policy "simulation_templates_select_authenticated" on public.simulation_templates
  for select to authenticated
  using (public.can_access_tenant_row(tenant_id));

drop policy if exists "enablement_programs_select_auth" on public.enablement_programs;
create policy "enablement_programs_select_auth" on public.enablement_programs
  for select to authenticated
  using (public.can_access_tenant_row(tenant_id));

drop policy if exists "enablement_program_segments_select_auth" on public.enablement_program_segments;
create policy "enablement_program_segments_select_auth" on public.enablement_program_segments
  for select to authenticated
  using (public.can_access_tenant_row(tenant_id));

drop policy if exists "plan_step_prerequisites_select_auth" on public.plan_step_prerequisites;
create policy "plan_step_prerequisites_select_auth" on public.plan_step_prerequisites
  for select to authenticated
  using (public.can_access_tenant_row(tenant_id));

drop policy if exists "corpus_sme_answers_select_auth" on public.corpus_sme_answers;
create policy "corpus_sme_answers_select_auth" on public.corpus_sme_answers
  for select to authenticated
  using (public.can_access_tenant_row(tenant_id));

drop policy if exists "isc_lab_knowledge_chunks_select_auth" on public.isc_lab_knowledge_chunks;
create policy "isc_lab_knowledge_chunks_select_auth" on public.isc_lab_knowledge_chunks
  for select to authenticated
  using (public.can_access_tenant_row(tenant_id));

drop policy if exists "release_courses_select_authenticated" on public.release_courses;
drop policy if exists "release_courses_select_auth" on public.release_courses;
create policy "release_courses_select_auth" on public.release_courses
  for select to authenticated
  using (public.can_access_tenant_row(tenant_id));

-- market_pulse_weeks (phase3 migration policy name may differ)
drop policy if exists "market_pulse_weeks_select_all" on public.market_pulse_weeks;
drop policy if exists "market_pulse_weeks_select_auth" on public.market_pulse_weeks;
create policy "market_pulse_weeks_select_auth" on public.market_pulse_weeks
  for select to authenticated
  using (public.can_access_tenant_row(tenant_id));

-- content_assets + onboarding_plans from initial schema
drop policy if exists "content_assets_select_authenticated" on public.content_assets;
create policy "content_assets_select_authenticated" on public.content_assets
  for select to authenticated
  using (public.can_access_tenant_row(tenant_id));

drop policy if exists "onboarding_plans_select_visible" on public.onboarding_plans;
drop policy if exists "onboarding_plans_select_authenticated" on public.onboarding_plans;
create policy "onboarding_plans_select_authenticated" on public.onboarding_plans
  for select to authenticated
  using (public.can_access_tenant_row(tenant_id));

-- ---------------------------------------------------------------------------
-- Audit logs: tenant scope + extended insert RPC
-- ---------------------------------------------------------------------------

drop policy if exists "audit_logs_select_admin" on public.audit_logs;
drop policy if exists "audit_logs_select_scoped" on public.audit_logs;

create policy "audit_logs_select_scoped" on public.audit_logs
  for select to authenticated
  using (
    public.is_super_admin()
    or (public.is_admin() and tenant_id = public.current_tenant_id())
  );

drop function if exists public.insert_audit_log(text, text, text, jsonb, uuid);

create or replace function public.insert_audit_log(
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
  values (coalesce(p_actor_id, auth.uid()), p_action, p_target_type, p_target_id, p_details, resolved_tenant)
  returning id into new_id;

  return new_id;
end;
$$;

revoke execute on function public.insert_audit_log(text, text, text, jsonb, uuid, uuid) from public;
revoke execute on function public.insert_audit_log(text, text, text, jsonb, uuid, uuid) from authenticated;
revoke execute on function public.insert_audit_log(text, text, text, jsonb, uuid, uuid) from anon;
grant execute on function public.insert_audit_log(text, text, text, jsonb, uuid, uuid) to service_role;
