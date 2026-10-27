-- Mentors set due dates through the server (service role), and the step guard refused every write
-- without a signed-in user, so those updates failed with "Not authorized to update plan step".
-- Same rule as the profiles guard: trusted server writes pass; interactive users are still checked.

create or replace function public.guard_plan_assignment_steps_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assignee_id uuid;
begin
  -- Server-side writes (service role: API routes that already checked who may do this, such as a
  -- mentor setting due dates, and maintenance scripts) run with no signed-in user.
  if auth.uid() is null then
    return new;
  end if;

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

