-- Competitive excellence: adaptive flight checks, pitch peer reviews, gamification events

create table if not exists public.adaptive_probe_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  focus_competencies text[] not null default '{}',
  responses jsonb not null default '[]'::jsonb,
  competency_scores jsonb not null default '{}'::jsonb,
  field_signal_score int check (field_signal_score between 0 and 100),
  recommended_actions jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists adaptive_probe_sessions_user_idx on public.adaptive_probe_sessions(user_id);

alter table public.adaptive_probe_sessions enable row level security;

create policy "adaptive_probe_select_own_or_manager"
on public.adaptive_probe_sessions for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.id = adaptive_probe_sessions.user_id and p.manager_id = auth.uid()
  )
);

create policy "adaptive_probe_insert_own"
on public.adaptive_probe_sessions for insert
with check (auth.uid() = user_id);

create policy "adaptive_probe_update_own"
on public.adaptive_probe_sessions for update
using (auth.uid() = user_id);

create table if not exists public.pitch_peer_reviews (
  id uuid primary key default gen_random_uuid(),
  pitch_id uuid not null references public.pitch_submissions(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  clarity_score int not null check (clarity_score between 1 and 5),
  storyline_score int not null check (storyline_score between 1 and 5),
  differentiation_score int not null check (differentiation_score between 1 and 5),
  comment text,
  endorsed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (pitch_id, reviewer_id)
);

create index if not exists pitch_peer_reviews_pitch_idx on public.pitch_peer_reviews(pitch_id);

alter table public.pitch_peer_reviews enable row level security;

create policy "pitch_peer_reviews_select_teammates"
on public.pitch_peer_reviews for select
using (
  auth.uid() = reviewer_id
  or exists (
    select 1 from public.pitch_submissions ps
    join public.profiles reviewer on reviewer.id = auth.uid()
    join public.profiles owner on owner.id = ps.user_id
    where ps.id = pitch_peer_reviews.pitch_id
      and (owner.manager_id = reviewer.manager_id or owner.id = auth.uid())
  )
);

create policy "pitch_peer_reviews_insert_teammate"
on public.pitch_peer_reviews for insert
with check (
  auth.uid() = reviewer_id
  and exists (
    select 1 from public.pitch_submissions ps
    join public.profiles reviewer on reviewer.id = auth.uid()
    join public.profiles owner on owner.id = ps.user_id
    where ps.id = pitch_id
      and ps.status = 'reviewed'
      and owner.id <> auth.uid()
      and owner.manager_id = reviewer.manager_id
  )
);

create table if not exists public.gamification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  points int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists gamification_events_user_idx on public.gamification_events(user_id, created_at desc);

alter table public.gamification_events enable row level security;

create policy "gamification_events_select_own_or_manager"
on public.gamification_events for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.id = gamification_events.user_id and p.manager_id = auth.uid()
  )
);

create policy "gamification_events_insert_own"
on public.gamification_events for insert
with check (auth.uid() = user_id);
