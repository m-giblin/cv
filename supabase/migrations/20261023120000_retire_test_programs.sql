-- The experienced-hire fast track and the week-based New SE ramp were test programs.
-- The new-hire path is New Hirer - Foundation plus the 60, 90, and 120 day stages.

do $$
declare
  sp constant uuid := '00000000-0000-4000-8000-000000000001';
begin
  delete from public.enablement_programs
  where tenant_id = sp
    and name in ('Experienced SE fast track', 'New SE ramp', '120-Day SE Mastery');

  delete from public.onboarding_plans
  where tenant_id = sp
    and name in (
      '120-Day Mastery — Days 1–30 (Foundation)',
      '120-Day Mastery — Days 31–60 (Field Ready)',
      '120-Day Mastery — Days 61–90 (Advanced)',
      '120-Day Mastery — Days 91–120 (Advisory)',
      'Weeks 1–2 — Boots on the ground',
      'Weeks 3–4 — Platform and pitch basics',
      'Weeks 5–6 — Roles and JML demos',
      'Weeks 7–8 — Compliance, certifications and reporting',
      'Weeks 9–10 — Transforms and readiness sign-off'
    );
end $$;
