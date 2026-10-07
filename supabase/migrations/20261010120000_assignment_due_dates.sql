-- Due dates for everything a manager assigns: simulations gain one, and pitches become assignable.

alter table public.simulation_assignments add column if not exists due_date date;

-- A manager asks someone to record a pitch scenario by a date. Done once they submit that scenario.
create table if not exists public.pitch_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  scenario_id uuid not null references public.pitch_scenario_templates(id) on delete cascade,
  assigned_to uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  due_date date not null,
  note text,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One open assignment per person per scenario; reassigning updates it.
create unique index if not exists pitch_assignments_open_idx
  on public.pitch_assignments (scenario_id, assigned_to)
  where status = 'active';
create index if not exists pitch_assignments_assignee_idx on public.pitch_assignments (assigned_to, status);

alter table public.pitch_assignments enable row level security;

-- People see their own; managers and admins see the people they can access. Writes go through the server.
drop policy if exists pitch_assignments_select on public.pitch_assignments;
create policy pitch_assignments_select on public.pitch_assignments
  for select to authenticated
  using (assigned_to = auth.uid() or public.can_access_profile(assigned_to));
