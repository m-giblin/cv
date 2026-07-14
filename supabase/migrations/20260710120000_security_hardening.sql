-- Security hardening: column-level guards via triggers + tightened RLS policies.
-- Run: supabase db push

-- ---------------------------------------------------------------------------
-- Helper: reviewer is manager/admin in org tree, not the subject themselves
-- ---------------------------------------------------------------------------
create or replace function public.is_work_reviewer(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin(auth.uid())
    or (
      public.can_access_profile(target_user_id)
      and auth.uid() is not null
      and auth.uid() <> target_user_id
    );
$$;

-- ---------------------------------------------------------------------------
-- profiles: block self-service role / manager / level / email escalation
-- ---------------------------------------------------------------------------
create or replace function public.guard_profiles_sensitive_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'Cannot change profile id';
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

drop trigger if exists guard_profiles_sensitive_update on public.profiles;
create trigger guard_profiles_sensitive_update
  before update on public.profiles
  for each row execute function public.guard_profiles_sensitive_update();

-- ---------------------------------------------------------------------------
-- challenge_submissions: owners submit; reviewers approve
-- ---------------------------------------------------------------------------
create or replace function public.guard_challenge_submissions_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'Cannot change submission owner';
  end if;

  if public.is_work_reviewer(old.user_id) then
    return new;
  end if;

  if auth.uid() = old.user_id then
    if new.status in ('reviewed', 'under_review', 'completed') then
      raise exception 'Cannot self-approve challenge submission';
    end if;
    if new.manager_grade is distinct from old.manager_grade and new.manager_grade is not null then
      raise exception 'Cannot set manager grade on own submission';
    end if;
    if new.manager_feedback is distinct from old.manager_feedback and new.manager_feedback is not null then
      raise exception 'Cannot set manager feedback on own submission';
    end if;
    if new.reviewed_at is distinct from old.reviewed_at and new.reviewed_at is not null then
      raise exception 'Cannot set reviewed_at on own submission';
    end if;
    return new;
  end if;

  raise exception 'Not authorized to update challenge submission';
end;
$$;

drop trigger if exists guard_challenge_submissions_update on public.challenge_submissions;
create trigger guard_challenge_submissions_update
  before update on public.challenge_submissions
  for each row execute function public.guard_challenge_submissions_update();

drop policy if exists "challenge_submissions_update_self_or_manager" on public.challenge_submissions;
drop policy if exists "challenge_submissions_update_owner" on public.challenge_submissions;
drop policy if exists "challenge_submissions_update_reviewer" on public.challenge_submissions;

create policy "challenge_submissions_update_owner"
on public.challenge_submissions for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "challenge_submissions_update_reviewer"
on public.challenge_submissions for update to authenticated
using (public.is_work_reviewer(user_id))
with check (public.is_work_reviewer(user_id));

-- ---------------------------------------------------------------------------
-- coaching_cards: owners reflect; reviewers sign off
-- ---------------------------------------------------------------------------
create or replace function public.guard_coaching_cards_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'Cannot change coaching card owner';
  end if;

  if public.is_work_reviewer(old.user_id) then
    return new;
  end if;

  if auth.uid() = old.user_id then
    if new.manager_review_status is distinct from old.manager_review_status
       and new.manager_review_status in ('reviewed', 'needs_revision') then
      raise exception 'Cannot self-approve coaching card';
    end if;
    if new.manager_comments is distinct from old.manager_comments and new.manager_comments is not null then
      raise exception 'Cannot set manager comments on own coaching card';
    end if;
    if new.manager_grade is distinct from old.manager_grade and new.manager_grade is not null then
      raise exception 'Cannot set manager grade on own coaching card';
    end if;
    if new.reviewed_at is distinct from old.reviewed_at and new.reviewed_at is not null then
      raise exception 'Cannot set reviewed_at on own coaching card';
    end if;
    return new;
  end if;

  raise exception 'Not authorized to update coaching card';
end;
$$;

drop trigger if exists guard_coaching_cards_update on public.coaching_cards;
create trigger guard_coaching_cards_update
  before update on public.coaching_cards
  for each row execute function public.guard_coaching_cards_update();

drop policy if exists "coaching_cards_update_self_or_manager" on public.coaching_cards;
drop policy if exists "coaching_cards_update_owner" on public.coaching_cards;
drop policy if exists "coaching_cards_update_reviewer" on public.coaching_cards;

create policy "coaching_cards_update_owner"
on public.coaching_cards for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "coaching_cards_update_reviewer"
on public.coaching_cards for update to authenticated
using (public.is_work_reviewer(user_id))
with check (public.is_work_reviewer(user_id));

-- ---------------------------------------------------------------------------
-- readiness_certifications: owners submit evidence; managers approve
-- ---------------------------------------------------------------------------
create or replace function public.guard_readiness_certifications_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'Cannot change certification owner';
  end if;

  if public.is_work_reviewer(old.user_id) then
    return new;
  end if;

  if auth.uid() = old.user_id then
    if new.status = 'approved' then
      raise exception 'Cannot self-approve certification';
    end if;
    if new.status not in ('not_started', 'submitted', 'revoked') then
      raise exception 'Invalid certification status for owner update';
    end if;
    if new.approved_by is distinct from old.approved_by and new.approved_by is not null then
      raise exception 'Cannot set approved_by on own certification';
    end if;
    if new.approved_at is distinct from old.approved_at and new.approved_at is not null then
      raise exception 'Cannot set approved_at on own certification';
    end if;
    if new.manager_notes is distinct from old.manager_notes
       and new.manager_notes is not null
       and new.status = 'approved' then
      raise exception 'Cannot set manager notes on self-approved certification';
    end if;
    return new;
  end if;

  raise exception 'Not authorized to update certification';
end;
$$;

drop trigger if exists guard_readiness_certifications_update on public.readiness_certifications;
create trigger guard_readiness_certifications_update
  before update on public.readiness_certifications
  for each row execute function public.guard_readiness_certifications_update();

drop policy if exists "certifications_update" on public.readiness_certifications;
drop policy if exists "certifications_update_owner" on public.readiness_certifications;
drop policy if exists "certifications_update_reviewer" on public.readiness_certifications;

create policy "certifications_update_owner"
on public.readiness_certifications for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "certifications_update_reviewer"
on public.readiness_certifications for update to authenticated
using (public.is_work_reviewer(user_id))
with check (public.is_work_reviewer(user_id));

-- ---------------------------------------------------------------------------
-- plan_assignment_steps: assignees submit; managers/mentors validate
-- ---------------------------------------------------------------------------
create or replace function public.can_review_plan_assignment(assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.plan_assignments pa
    where pa.id = assignment_id
      and (
        public.is_admin(auth.uid())
        or pa.mentor_id = auth.uid()
        or (
          public.can_access_profile(pa.user_id)
          and auth.uid() <> pa.user_id
        )
      )
  );
$$;

create or replace function public.guard_plan_assignment_steps_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assignee_id uuid;
begin
  select pa.user_id into assignee_id
  from public.plan_assignments pa
  where pa.id = old.assignment_id;

  if assignee_id is null then
    raise exception 'Plan assignment not found';
  end if;

  if public.is_admin(auth.uid()) then
    return new;
  end if;

  if public.can_review_plan_assignment(old.assignment_id) then
    return new;
  end if;

  if auth.uid() = assignee_id then
    if new.status = 'reviewed' then
      raise exception 'Cannot self-validate plan step';
    end if;
    if new.status not in ('not_started', 'in_progress', 'submitted') then
      raise exception 'Invalid plan step status for assignee update';
    end if;
    if new.completed_at is not null and new.status <> 'submitted' then
      raise exception 'completed_at only allowed when submitting for review';
    end if;
    return new;
  end if;

  raise exception 'Not authorized to update plan step';
end;
$$;

drop trigger if exists guard_plan_assignment_steps_update on public.plan_assignment_steps;
create trigger guard_plan_assignment_steps_update
  before update on public.plan_assignment_steps
  for each row execute function public.guard_plan_assignment_steps_update();

drop policy if exists "plan_assignment_steps_update_authorized" on public.plan_assignment_steps;
drop policy if exists "plan_assignment_steps_update_assignee" on public.plan_assignment_steps;
drop policy if exists "plan_assignment_steps_update_reviewer" on public.plan_assignment_steps;

create policy "plan_assignment_steps_update_assignee"
on public.plan_assignment_steps for update to authenticated
using (
  exists (
    select 1 from public.plan_assignments pa
    where pa.id = plan_assignment_steps.assignment_id
      and pa.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.plan_assignments pa
    where pa.id = plan_assignment_steps.assignment_id
      and pa.user_id = auth.uid()
  )
);

create policy "plan_assignment_steps_update_reviewer"
on public.plan_assignment_steps for update to authenticated
using (public.can_review_plan_assignment(assignment_id))
with check (public.can_review_plan_assignment(assignment_id));

-- ---------------------------------------------------------------------------
-- manager_coaching_notes: manager-private (SE cannot read)
-- ---------------------------------------------------------------------------
drop policy if exists "manager_coaching_notes_select" on public.manager_coaching_notes;

create policy "manager_coaching_notes_select"
on public.manager_coaching_notes for select to authenticated
using (
  manager_id = auth.uid()
  or public.is_admin(auth.uid())
);
