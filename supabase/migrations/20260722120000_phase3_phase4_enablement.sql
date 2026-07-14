-- Phase 3 + 4: agentic certs, market pulse, learn progress, pitch submissions, engagement, video/webm

alter type public.certification_type add value if not exists 'agentic_fabric';
alter type public.certification_type add value if not exists 'ais_readiness';
alter type public.certification_type add value if not exists 'mcp_governance';

-- Learn module completion (agentic curriculum track)
create table if not exists public.learn_module_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  module_id text not null,
  completed_at timestamptz not null default now(),
  unique (user_id, module_id)
);

create index if not exists learn_module_progress_user_idx on public.learn_module_progress(user_id);

alter table public.learn_module_progress enable row level security;

create policy "learn_progress_select_own_or_manager"
on public.learn_module_progress for select
to authenticated
using (
  user_id = auth.uid()
  or public.can_access_profile(user_id)
);

create policy "learn_progress_insert_own"
on public.learn_module_progress for insert
to authenticated
with check (user_id = auth.uid());

-- Market pulse: weekly question sets + results
create table if not exists public.market_pulse_weeks (
  week_id text primary key,
  questions jsonb not null,
  source text not null default 'seed',
  created_at timestamptz not null default now()
);

create table if not exists public.market_pulse_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_id text not null references public.market_pulse_weeks(week_id) on delete cascade,
  score int not null,
  total int not null,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  unique (user_id, week_id)
);

create index if not exists market_pulse_results_user_idx on public.market_pulse_results(user_id);

alter table public.market_pulse_weeks enable row level security;
alter table public.market_pulse_results enable row level security;

create policy "market_pulse_weeks_select_all"
on public.market_pulse_weeks for select
to authenticated
using (true);

create policy "market_pulse_weeks_admin_insert"
on public.market_pulse_weeks for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('manager', 'mentor', 'director', 'admin')
  )
);

create policy "market_pulse_results_select_own_or_manager"
on public.market_pulse_results for select
to authenticated
using (
  user_id = auth.uid()
  or public.can_access_profile(user_id)
);

create policy "market_pulse_results_insert_own"
on public.market_pulse_results for insert
to authenticated
with check (user_id = auth.uid());

-- Video pitch submissions (Phase 4)
create type public.pitch_target_type as enum ('challenge', 'certification', 'practice');

create table if not exists public.pitch_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  evidence_path text not null,
  reflection_text text,
  target_type public.pitch_target_type not null default 'practice',
  target_id text,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed', 'rejected')),
  manager_feedback text,
  manager_grade int check (manager_grade between 1 and 5),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists pitch_submissions_user_idx on public.pitch_submissions(user_id);
create index if not exists pitch_submissions_status_idx on public.pitch_submissions(status);

alter table public.pitch_submissions enable row level security;

create policy "pitch_submissions_select_own_or_manager"
on public.pitch_submissions for select
to authenticated
using (
  user_id = auth.uid()
  or public.can_access_profile(user_id)
);

create policy "pitch_submissions_insert_own"
on public.pitch_submissions for insert
to authenticated
with check (user_id = auth.uid());

create policy "pitch_submissions_update_manager"
on public.pitch_submissions for update
to authenticated
using (public.can_access_profile(user_id))
with check (public.can_access_profile(user_id));

-- Buyer / resource engagement (Phase 4)
create table if not exists public.resource_engagement (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  resource_label text not null,
  resource_url text,
  account_name text,
  event_type text not null check (event_type in ('open', 'share', 'download', 'view_brief')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists resource_engagement_user_idx on public.resource_engagement(user_id);
create index if not exists resource_engagement_created_idx on public.resource_engagement(created_at desc);

alter table public.resource_engagement enable row level security;

create policy "resource_engagement_select_own_or_manager"
on public.resource_engagement for select
to authenticated
using (
  user_id = auth.uid()
  or public.can_access_profile(user_id)
);

create policy "resource_engagement_insert_own"
on public.resource_engagement for insert
to authenticated
with check (user_id = auth.uid());

-- Allow webm video uploads in evidence bucket
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'video/mp4',
  'video/webm',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]
where id = 'evidence';
