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
alter table public.coaching_cards disable trigger guard_coaching_cards_update;

update public.coaching_cards cc
set tenant_id = p.tenant_id
from public.profiles p
where p.id = cc.user_id and cc.tenant_id is null;

alter table public.coaching_cards enable trigger guard_coaching_cards_update;

update public.activity_logs al
set tenant_id = p.tenant_id
from public.profiles p
where p.id = al.user_id and al.tenant_id is null;

update public.challenge_submissions cs
set tenant_id = p.tenant_id
from public.profiles p
where p.id = cs.user_id and cs.tenant_id is null;

update public.deal_prep_sessions d
set tenant_id = p.tenant_id
from public.profiles p
where p.id = d.user_id and d.tenant_id is null;
