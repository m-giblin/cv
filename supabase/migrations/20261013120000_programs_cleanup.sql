-- Programs clean-up (SailPoint tenant only): one "New SE ramp" program from the SailPoint onboarding
-- stages, the 120-day plans kept as "Experienced SE fast track", Definitions archived, and the old
-- generic seed plans deleted (demo data; their assignments and progress go with them).

-- Archived plans stay in the database but leave the library.
alter table public.onboarding_plans add column if not exists is_archived boolean not null default false;

do $$
declare
  sp constant uuid := '00000000-0000-4000-8000-000000000001';
  ramp_id uuid;
begin
  -- 1. Delete the old generic seed plans. Cascades remove their steps and demo assignments.
  delete from public.onboarding_plans
  where tenant_id = sp
    and trim(name) in (
      'First week — New SE',
      'Week 2 — building depth',
      'Week 3 — customer ready',
      'Week 4 — first customer motions',
      '60-day ramp check-in',
      '90-day SE readiness'
    );

  -- 2. Archive SailPoint Definitions.
  update public.onboarding_plans set is_archived = true, updated_at = now()
  where tenant_id = sp and name = 'SailPoint Definitions';

  -- 3. The 120-day plans become the experienced-hire fast track.
  update public.enablement_programs
  set name = 'Experienced SE fast track',
      description = 'Four 30-day stages for SEs who already know identity: foundation, field ready, advanced, advisory.'
  where name = '120-Day SE Mastery' and (tenant_id = sp or tenant_id is null);

  -- 4. "New SE ramp": the five SailPoint onboarding stages, in order, as one program.
  select id into ramp_id from public.enablement_programs where name = 'New SE ramp' and tenant_id = sp;
  if ramp_id is null then
    insert into public.enablement_programs (name, description, segment_count, cert_valid_months, tenant_id)
    values ('New SE ramp', 'SailPoint onboarding for new SEs, weeks 1 to 8, in five stages.', 5, 12, sp)
    returning id into ramp_id;
  end if;

  insert into public.enablement_program_segments (program_id, segment_index, plan_id)
  select ramp_id, stage.idx, p.id
  from (values
    (1, 'Week 1–2 — Boots on the ground'),
    (2, 'Week 2–3 — First steps'),
    (3, 'Week 3–4 — Second step'),
    (4, 'Week 5–6 — Third step'),
    (5, 'Week 7–8 — Fourth step')
  ) as stage(idx, plan_name)
  join public.onboarding_plans p on p.name = stage.plan_name and p.tenant_id = sp
  on conflict (program_id, segment_index) do update set plan_id = excluded.plan_id;
end $$;
