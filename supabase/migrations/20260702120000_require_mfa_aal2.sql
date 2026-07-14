-- Require MFA (AAL2) for all authenticated access to application data.
-- Run this in Supabase SQL Editor after enabling TOTP MFA in the Auth dashboard.

create or replace function public.require_aal2()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'aal') = 'aal2', false);
$$;

-- Restrictive policies combine with existing permissive policies using AND logic.
create policy "require_mfa_aal2_profiles"
on public.profiles
as restrictive
for all
to authenticated
using (public.require_aal2())
with check (public.require_aal2());

create policy "require_mfa_aal2_competencies"
on public.competencies
as restrictive
for all
to authenticated
using (public.require_aal2())
with check (public.require_aal2());

create policy "require_mfa_aal2_onboarding_plans"
on public.onboarding_plans
as restrictive
for all
to authenticated
using (public.require_aal2())
with check (public.require_aal2());

create policy "require_mfa_aal2_plan_steps"
on public.plan_steps
as restrictive
for all
to authenticated
using (public.require_aal2())
with check (public.require_aal2());

create policy "require_mfa_aal2_plan_assignments"
on public.plan_assignments
as restrictive
for all
to authenticated
using (public.require_aal2())
with check (public.require_aal2());

create policy "require_mfa_aal2_plan_assignment_steps"
on public.plan_assignment_steps
as restrictive
for all
to authenticated
using (public.require_aal2())
with check (public.require_aal2());

create policy "require_mfa_aal2_challenges"
on public.challenges
as restrictive
for all
to authenticated
using (public.require_aal2())
with check (public.require_aal2());

create policy "require_mfa_aal2_challenge_submissions"
on public.challenge_submissions
as restrictive
for all
to authenticated
using (public.require_aal2())
with check (public.require_aal2());

create policy "require_mfa_aal2_simulation_templates"
on public.simulation_templates
as restrictive
for all
to authenticated
using (public.require_aal2())
with check (public.require_aal2());

create policy "require_mfa_aal2_simulation_assignments"
on public.simulation_assignments
as restrictive
for all
to authenticated
using (public.require_aal2())
with check (public.require_aal2());

create policy "require_mfa_aal2_coaching_cards"
on public.coaching_cards
as restrictive
for all
to authenticated
using (public.require_aal2())
with check (public.require_aal2());

create policy "require_mfa_aal2_activity_logs"
on public.activity_logs
as restrictive
for all
to authenticated
using (public.require_aal2())
with check (public.require_aal2());

create policy "require_mfa_aal2_notifications"
on public.notifications
as restrictive
for all
to authenticated
using (public.require_aal2())
with check (public.require_aal2());

create policy "require_mfa_aal2_content_assets"
on public.content_assets
as restrictive
for all
to authenticated
using (public.require_aal2())
with check (public.require_aal2());

create policy "require_mfa_aal2_ai_provider_configs"
on public.ai_provider_configs
as restrictive
for all
to authenticated
using (public.require_aal2())
with check (public.require_aal2());
