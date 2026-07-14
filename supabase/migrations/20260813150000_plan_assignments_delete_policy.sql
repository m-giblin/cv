-- Managers could not remove plan assignments: RLS had no DELETE policy, so deletes silently affected 0 rows.

drop policy if exists "plan_assignments_delete_managers" on public.plan_assignments;
create policy "plan_assignments_delete_managers"
on public.plan_assignments for delete
to authenticated
using (
  public.is_admin()
  or public.can_access_profile(user_id)
);

drop policy if exists "plan_assignment_steps_delete_managers" on public.plan_assignment_steps;
create policy "plan_assignment_steps_delete_managers"
on public.plan_assignment_steps for delete
to authenticated
using (
  exists (
    select 1 from public.plan_assignments pa
    where pa.id = plan_assignment_steps.assignment_id
      and (public.is_admin() or public.can_access_profile(pa.user_id))
  )
);
