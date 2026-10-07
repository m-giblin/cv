-- New SE ramp: stage names that match the real day ranges (each stage is 14 days), and one gate
-- step per stage: the end-of-stage milestone that shows the SE is ready to move on.

do $$
declare
  sp constant uuid := '00000000-0000-4000-8000-000000000001';
  stage record;
begin
  for stage in
    select * from (values
      ('Week 1–2 — Boots on the ground', 'Weeks 1–2 — Boots on the ground', 'Start shadowing SE meetings'),
      ('Week 2–3 — First steps', 'Weeks 3–4 — Platform and pitch basics', 'Corporate demo deck — draft'),
      ('Week 3–4 — Second step', 'Weeks 5–6 — Roles and JML demos', 'Demo new roles with mentor'),
      ('Week 5–6 — Third step', 'Weeks 7–8 — Compliance, certifications and reporting', 'Presentation practice'),
      ('Week 7–8 — Fourth step', 'Weeks 9–10 — Transforms and readiness sign-off', 'Week 7–8 mentor readiness sign-off')
    ) as v(old_name, new_name, gate_title)
  loop
    -- Mark the gate first (matched by the plan's current or new name, so this can run twice).
    update public.plan_steps ps
    set metadata = coalesce(ps.metadata, '{}'::jsonb) || '{"isSegmentGate": true}'::jsonb
    from public.onboarding_plans p
    where ps.plan_id = p.id
      and p.tenant_id = sp
      and p.name in (stage.old_name, stage.new_name)
      and ps.title = stage.gate_title;

    update public.onboarding_plans
    set name = stage.new_name, updated_at = now()
    where tenant_id = sp and name = stage.old_name;
  end loop;

  -- The last stage's sign-off step named the old weeks.
  update public.plan_steps ps
  set title = 'Mentor readiness sign-off'
  from public.onboarding_plans p
  where ps.plan_id = p.id and p.tenant_id = sp
    and p.name = 'Weeks 9–10 — Transforms and readiness sign-off'
    and ps.title = 'Week 7–8 mentor readiness sign-off';
end $$;
