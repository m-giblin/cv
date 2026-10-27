-- New SE ramp stages follow the renamed week plans. The cleanup migration joined the
-- pre-rename titles, so a tenant whose plans were already renamed kept a five-stage
-- program with no stages. Re-attach the current plans and correct the week range.

do $$
declare
  sp constant uuid := '00000000-0000-4000-8000-000000000001';
  ramp_id uuid;
  attached integer;
begin
  select id into ramp_id
  from public.enablement_programs
  where name = 'New SE ramp' and tenant_id = sp;

  if ramp_id is null then
    raise exception 'New SE ramp program is missing for the SailPoint tenant';
  end if;

  update public.enablement_programs
  set description = 'SailPoint onboarding for new SEs, weeks 1 to 10, in five stages.'
  where id = ramp_id;

  insert into public.enablement_program_segments (program_id, segment_index, plan_id)
  select ramp_id, stage.idx, p.id
  from (values
    (1, 'Weeks 1–2 — Boots on the ground'),
    (2, 'Weeks 3–4 — Platform and pitch basics'),
    (3, 'Weeks 5–6 — Roles and JML demos'),
    (4, 'Weeks 7–8 — Compliance, certifications and reporting'),
    (5, 'Weeks 9–10 — Transforms and readiness sign-off')
  ) as stage(idx, plan_name)
  join public.onboarding_plans p on p.name = stage.plan_name and p.tenant_id = sp
  on conflict (program_id, segment_index) do update set plan_id = excluded.plan_id;

  select count(*) into attached
  from public.enablement_program_segments
  where program_id = ramp_id;

  if attached <> 5 then
    raise exception 'New SE ramp should have 5 stages, found %', attached;
  end if;
end $$;
