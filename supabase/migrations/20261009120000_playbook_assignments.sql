-- Playbook assignments with due dates, plus the progress signals they're measured against.

-- A manager or admin assigns a playbook to a person with a due date and the parts that count.
create table if not exists public.playbook_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  playbook_id uuid not null references public.capability_playbooks(id) on delete cascade,
  assigned_to uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  due_date date not null,
  require_read boolean not null default true,
  require_pitch boolean not null default true,
  require_objections boolean not null default true,
  pitch_pass_score integer not null default 70 check (pitch_pass_score between 1 and 100),
  note text,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  completed_at timestamptz,
  due_soon_reminded_at timestamptz,
  overdue_reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One open assignment per person per playbook; reassigning updates it.
create unique index if not exists playbook_assignments_open_idx
  on public.playbook_assignments (playbook_id, assigned_to)
  where status = 'active';
create index if not exists playbook_assignments_assignee_idx on public.playbook_assignments (assigned_to, status);
create index if not exists playbook_assignments_tenant_idx on public.playbook_assignments (tenant_id, status, due_date);

-- "I've read this playbook", per person, with the version they read.
create table if not exists public.playbook_reads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  playbook_id uuid not null references public.capability_playbooks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  version integer not null default 1,
  read_at timestamptz not null default now(),
  unique (playbook_id, user_id)
);

-- Scored drill attempts: pitch drills (average rubric score) and completed objection drills.
create table if not exists public.playbook_drill_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  playbook_id uuid not null references public.capability_playbooks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('pitch', 'objections')),
  score integer check (score between 0 and 100),
  scenario_id uuid references public.pitch_scenario_templates(id) on delete set null,
  simulation_assignment_id uuid references public.simulation_assignments(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists playbook_drill_results_user_idx on public.playbook_drill_results (user_id, playbook_id, kind);

alter table public.playbook_assignments enable row level security;
alter table public.playbook_reads enable row level security;
alter table public.playbook_drill_results enable row level security;

-- People see their own; managers and admins see the people they can access. Writes go through
-- the server (service role) after the API checks who may assign or record what.
drop policy if exists playbook_assignments_select on public.playbook_assignments;
create policy playbook_assignments_select on public.playbook_assignments
  for select to authenticated
  using (assigned_to = auth.uid() or public.can_access_profile(assigned_to));

drop policy if exists playbook_reads_select on public.playbook_reads;
create policy playbook_reads_select on public.playbook_reads
  for select to authenticated
  using (user_id = auth.uid() or public.can_access_profile(user_id));

drop policy if exists playbook_drill_results_select on public.playbook_drill_results;
create policy playbook_drill_results_select on public.playbook_drill_results
  for select to authenticated
  using (user_id = auth.uid() or public.can_access_profile(user_id));
