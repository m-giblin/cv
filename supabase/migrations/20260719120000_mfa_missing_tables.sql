-- Extend MFA (AAL2) restrictive policies to tables added after initial MFA migration.
-- Idempotent: policies may already exist if partially applied.

drop policy if exists "require_mfa_aal2_deal_prep_sessions" on public.deal_prep_sessions;
create policy "require_mfa_aal2_deal_prep_sessions"
on public.deal_prep_sessions
as restrictive
for all
to authenticated
using (public.require_aal2())
with check (public.require_aal2());

drop policy if exists "require_mfa_aal2_shadow_meeting_logs" on public.shadow_meeting_logs;
create policy "require_mfa_aal2_shadow_meeting_logs"
on public.shadow_meeting_logs
as restrictive
for all
to authenticated
using (public.require_aal2())
with check (public.require_aal2());

drop policy if exists "require_mfa_aal2_mentor_review_requests" on public.mentor_review_requests;
create policy "require_mfa_aal2_mentor_review_requests"
on public.mentor_review_requests
as restrictive
for all
to authenticated
using (public.require_aal2())
with check (public.require_aal2());

drop policy if exists "require_mfa_aal2_platform_settings" on public.platform_settings;
create policy "require_mfa_aal2_platform_settings"
on public.platform_settings
as restrictive
for all
to authenticated
using (public.require_aal2())
with check (public.require_aal2());

drop policy if exists "require_mfa_aal2_ai_usage_logs" on public.ai_usage_logs;
create policy "require_mfa_aal2_ai_usage_logs"
on public.ai_usage_logs
as restrictive
for all
to authenticated
using (public.require_aal2())
with check (public.require_aal2());
