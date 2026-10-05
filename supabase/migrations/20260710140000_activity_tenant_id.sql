-- Stamp tenant_id on activity rows created by coaching-card and challenge triggers.

create or replace function public.log_challenge_submission_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_tenant_id uuid;
begin
  select tenant_id into row_tenant_id from public.profiles where id = new.user_id;

  if tg_op = 'INSERT' and new.status in ('submitted', 'under_review', 'reviewed') then
    insert into public.activity_logs (user_id, actor_id, event_type, title, metadata, tenant_id)
    values (
      new.user_id,
      auth.uid(),
      'challenge_submitted',
      'Challenge submitted for review',
      jsonb_build_object('challenge_id', new.challenge_id, 'submission_id', new.id, 'status', new.status),
      row_tenant_id
    );
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'reviewed' then
    insert into public.activity_logs (user_id, actor_id, event_type, title, metadata, tenant_id)
    values (
      new.user_id,
      auth.uid(),
      'manager_feedback_received',
      'Manager reviewed challenge submission',
      jsonb_build_object('challenge_id', new.challenge_id, 'submission_id', new.id, 'grade', new.manager_grade),
      row_tenant_id
    );
  end if;

  return new;
end;
$$;

create or replace function public.log_coaching_card_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_tenant_id uuid;
begin
  select tenant_id into row_tenant_id from public.profiles where id = new.user_id;

  if tg_op = 'INSERT' then
    insert into public.activity_logs (user_id, actor_id, event_type, title, metadata, tenant_id)
    values (
      new.user_id,
      auth.uid(),
      'simulation_completed',
      'Simulation coaching card created',
      jsonb_build_object('coaching_card_id', new.id, 'simulation_assignment_id', new.simulation_assignment_id),
      row_tenant_id
    );
  elsif tg_op = 'UPDATE' and old.manager_review_status is distinct from new.manager_review_status and new.manager_review_status = 'reviewed' then
    insert into public.activity_logs (user_id, actor_id, event_type, title, metadata, tenant_id)
    values (
      new.user_id,
      auth.uid(),
      'coaching_card_reviewed',
      'Manager reviewed simulation coaching card',
      jsonb_build_object('coaching_card_id', new.id, 'grade', new.manager_grade),
      row_tenant_id
    );
  end if;

  return new;
end;
$$;

-- Repair rows created before tenant_id was stamped on insert.
--
-- These columns are only introduced by 20260808120000_multi_tenant_foundation.sql, which
-- sorts *after* this migration. On a from-scratch run they do not exist yet, so the repair
-- is guarded and simply skipped (there are no rows to repair on a fresh database). On an
-- already-multi-tenant database the guard passes and the backfill runs exactly as before.
do $$
declare
  target text;
begin
  if not public.has_tenant_id_column('profiles') then
    raise notice 'skipping tenant_id backfill: profiles.tenant_id not present yet';
    return;
  end if;

  foreach target in array array['coaching_cards', 'activity_logs', 'challenge_submissions', 'deal_prep_sessions']
  loop
    if not public.has_tenant_id_column(target) then
      raise notice 'skipping tenant_id backfill for %: column not present yet', target;
      continue;
    end if;

    if target = 'coaching_cards' then
      execute 'alter table public.coaching_cards disable trigger guard_coaching_cards_update';
    end if;

    execute format(
      'update public.%I t set tenant_id = p.tenant_id from public.profiles p '
      || 'where p.id = t.user_id and t.tenant_id is null',
      target
    );

    if target = 'coaching_cards' then
      execute 'alter table public.coaching_cards enable trigger guard_coaching_cards_update';
    end if;
  end loop;
end
$$;
