-- Buyer-side DSR-lite + Gong call intel cache

create table if not exists public.buyer_share_rooms (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  prep_session_id uuid references public.deal_prep_sessions(id) on delete set null,
  account_name text not null,
  title text not null,
  room_payload jsonb not null default '{}'::jsonb,
  view_count int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists buyer_share_rooms_user_idx on public.buyer_share_rooms(user_id);
create index if not exists buyer_share_rooms_token_idx on public.buyer_share_rooms(token);

alter table public.buyer_share_rooms enable row level security;

create policy "buyer_share_rooms_select_own_or_manager"
on public.buyer_share_rooms for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.id = buyer_share_rooms.user_id and p.manager_id = auth.uid()
  )
);

create policy "buyer_share_rooms_insert_own"
on public.buyer_share_rooms for insert
with check (auth.uid() = user_id);

create policy "buyer_share_rooms_update_own"
on public.buyer_share_rooms for update
using (auth.uid() = user_id);

create table if not exists public.buyer_share_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.buyer_share_rooms(id) on delete cascade,
  event_type text not null check (event_type in ('room_view', 'resource_open', 'resource_download', 'time_on_page')),
  resource_label text,
  viewer_fingerprint text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists buyer_share_events_room_idx on public.buyer_share_events(room_id, created_at desc);

alter table public.buyer_share_events enable row level security;

create policy "buyer_share_events_select_own_or_manager"
on public.buyer_share_events for select
using (
  exists (
    select 1 from public.buyer_share_rooms r
    where r.id = buyer_share_events.room_id
      and (
        r.user_id = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = r.user_id and p.manager_id = auth.uid()
        )
      )
  )
);

create table if not exists public.gong_call_intel (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  account_name text not null,
  account_key text not null,
  call_count int not null default 0,
  avg_talk_ratio numeric(5, 2),
  objection_themes jsonb not null default '[]'::jsonb,
  brief_summary text,
  talk_track_hints jsonb not null default '[]'::jsonb,
  risk_signals jsonb not null default '[]'::jsonb,
  source text not null default 'template' check (source in ('gong', 'template')),
  fetched_at timestamptz not null default now(),
  unique (account_key, user_id)
);

create index if not exists gong_call_intel_account_idx on public.gong_call_intel(account_key);

alter table public.gong_call_intel enable row level security;

create policy "gong_call_intel_select_own_or_manager"
on public.gong_call_intel for select
using (
  user_id is null
  or auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.id = gong_call_intel.user_id and p.manager_id = auth.uid()
  )
);

create policy "gong_call_intel_insert_authenticated"
on public.gong_call_intel for insert
with check (auth.uid() = user_id or user_id is null);

create policy "gong_call_intel_update_authenticated"
on public.gong_call_intel for update
using (auth.uid() = user_id or user_id is null);
