-- Pitch Studio: scenario templates, SE assignment queue, and practice sessions

do $$ begin
  create type public.pitch_scenario_track as enum (
    'elevator',
    'discovery',
    'competitive',
    'executive',
    'governance'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.pitch_scenario_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  slug text not null,
  track public.pitch_scenario_track not null,
  short_label text not null,
  label text not null,
  prompt_label text not null,
  prompt text not null,
  description text not null,
  competencies text[] not null default '{}',
  linked_solution text,
  max_duration_sec int not null default 60,
  sort_order int not null default 0,
  active boolean not null default true,
  passing_grade int not null default 4 check (passing_grade between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create index if not exists pitch_scenario_templates_tenant_idx on public.pitch_scenario_templates(tenant_id);
create index if not exists pitch_scenario_templates_track_idx on public.pitch_scenario_templates(track);

drop trigger if exists set_pitch_scenario_templates_updated_at on public.pitch_scenario_templates;
create trigger set_pitch_scenario_templates_updated_at
before update on public.pitch_scenario_templates
for each row execute function public.set_updated_at();

alter table public.pitch_scenario_templates enable row level security;

drop policy if exists "pitch_scenario_templates_select_auth" on public.pitch_scenario_templates;
create policy "pitch_scenario_templates_select_auth"
on public.pitch_scenario_templates for select
to authenticated
using (public.can_access_tenant_row(tenant_id));

drop policy if exists "pitch_scenario_templates_admin_write" on public.pitch_scenario_templates;
create policy "pitch_scenario_templates_admin_write"
on public.pitch_scenario_templates for all
to authenticated
using (
  public.can_access_tenant_row(tenant_id)
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'director', 'super_admin')
  )
)
with check (
  public.can_access_tenant_row(tenant_id)
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'director', 'super_admin')
  )
);

-- Assigned pitch queue (active slots per SE)
create table if not exists public.pitch_se_queue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scenario_id uuid not null references public.pitch_scenario_templates(id) on delete restrict,
  slot int not null check (slot between 1 and 5),
  status text not null default 'active' check (status in ('active', 'completed', 'skipped')),
  submission_id uuid references public.pitch_submissions(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists pitch_se_queue_active_slot_idx
  on public.pitch_se_queue(user_id, slot)
  where status = 'active';

create index if not exists pitch_se_queue_user_status_idx on public.pitch_se_queue(user_id, status);
create index if not exists pitch_se_queue_tenant_idx on public.pitch_se_queue(tenant_id);

alter table public.pitch_se_queue enable row level security;

drop policy if exists "pitch_se_queue_select_own_or_manager" on public.pitch_se_queue;
create policy "pitch_se_queue_select_own_or_manager"
on public.pitch_se_queue for select
to authenticated
using (
  user_id = auth.uid()
  or public.can_access_profile(user_id)
);

drop policy if exists "pitch_se_queue_insert_own" on public.pitch_se_queue;
create policy "pitch_se_queue_insert_own"
on public.pitch_se_queue for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "pitch_se_queue_update_own_or_manager" on public.pitch_se_queue;
create policy "pitch_se_queue_update_own_or_manager"
on public.pitch_se_queue for update
to authenticated
using (user_id = auth.uid() or public.can_access_profile(user_id))
with check (user_id = auth.uid() or public.can_access_profile(user_id));

-- Free practice (no manager review)
create table if not exists public.pitch_practice_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scenario_id uuid references public.pitch_scenario_templates(id) on delete set null,
  title text not null,
  reflection_text text,
  evidence_path text,
  ai_scores jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pitch_practice_sessions_user_idx on public.pitch_practice_sessions(user_id);

alter table public.pitch_practice_sessions enable row level security;

drop policy if exists "pitch_practice_sessions_select_own" on public.pitch_practice_sessions;
create policy "pitch_practice_sessions_select_own"
on public.pitch_practice_sessions for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "pitch_practice_sessions_insert_own" on public.pitch_practice_sessions;
create policy "pitch_practice_sessions_insert_own"
on public.pitch_practice_sessions for insert
to authenticated
with check (user_id = auth.uid());

-- Link formal submissions to scenarios and queue slots
alter table public.pitch_submissions
  add column if not exists scenario_id uuid references public.pitch_scenario_templates(id) on delete set null,
  add column if not exists queue_slot_id uuid references public.pitch_se_queue(id) on delete set null;

create index if not exists pitch_submissions_scenario_idx on public.pitch_submissions(scenario_id);
