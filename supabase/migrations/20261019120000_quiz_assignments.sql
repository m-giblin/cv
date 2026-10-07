-- Managers can assign a knowledge check (a question-bank source) with a due date and pass mark.
-- It completes when the SE passes; the manager can see every attempt and answer.
create table if not exists public.quiz_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  -- Question-bank source key: "playbook:<id>" or "docs:<topic>" / "developer:<topic>".
  source_key text not null,
  source_title text not null,
  assigned_to uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  due_date date not null,
  pass_score integer not null default 80 check (pass_score between 1 and 100),
  note text,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists quiz_assignments_open_idx on public.quiz_assignments (source_key, assigned_to) where status = 'active';
create index if not exists quiz_assignments_assignee_idx on public.quiz_assignments (assigned_to, status);

alter table public.quiz_assignments enable row level security;
drop policy if exists quiz_assignments_select on public.quiz_assignments;
create policy quiz_assignments_select on public.quiz_assignments
  for select to authenticated
  using (assigned_to = auth.uid() or public.can_access_profile(assigned_to));
