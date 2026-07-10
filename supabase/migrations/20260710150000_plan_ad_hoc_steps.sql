-- Manager-added tasks on an individual's onboarding assignment (not template-wide).
create table if not exists public.plan_ad_hoc_steps (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.plan_assignments(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  title text not null,
  description text,
  step_type text not null default 'custom',
  status public.assignment_status not null default 'not_started',
  due_date date,
  notes text,
  is_manager_gate boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plan_ad_hoc_steps_assignment_id_idx on public.plan_ad_hoc_steps(assignment_id);
create index if not exists plan_ad_hoc_steps_tenant_id_idx on public.plan_ad_hoc_steps(tenant_id);

alter table public.plan_ad_hoc_steps enable row level security;

drop trigger if exists set_plan_ad_hoc_steps_updated_at on public.plan_ad_hoc_steps;
create trigger set_plan_ad_hoc_steps_updated_at
  before update on public.plan_ad_hoc_steps
  for each row execute function public.set_updated_at();

create policy "plan_ad_hoc_steps_select"
on public.plan_ad_hoc_steps for select to authenticated
using (
  exists (
    select 1 from public.plan_assignments pa
    where pa.id = plan_ad_hoc_steps.assignment_id
      and (
        pa.user_id = auth.uid()
        or pa.mentor_id = auth.uid()
        or public.can_access_profile(pa.user_id)
      )
  )
);

create policy "plan_ad_hoc_steps_manager_insert"
on public.plan_ad_hoc_steps for insert to authenticated
with check (
  exists (
    select 1 from public.plan_assignments pa
    where pa.id = plan_ad_hoc_steps.assignment_id
      and public.can_access_profile(pa.user_id)
      and auth.uid() <> pa.user_id
  )
);

create policy "plan_ad_hoc_steps_participant_update"
on public.plan_ad_hoc_steps for update to authenticated
using (
  exists (
    select 1 from public.plan_assignments pa
    where pa.id = plan_ad_hoc_steps.assignment_id
      and (
        pa.user_id = auth.uid()
        or pa.mentor_id = auth.uid()
        or public.can_access_profile(pa.user_id)
      )
  )
);
