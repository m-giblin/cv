-- Integration OAuth tokens (Gong, Slack) per user or org admin
create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('gong', 'slack')),
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists integration_connections_user_idx on public.integration_connections(user_id);

alter table public.integration_connections enable row level security;

create policy "integration_connections_select_own"
on public.integration_connections for select
using (auth.uid() = user_id);

create policy "integration_connections_insert_own"
on public.integration_connections for insert
with check (auth.uid() = user_id);

create policy "integration_connections_update_own"
on public.integration_connections for update
using (auth.uid() = user_id);

create policy "integration_connections_delete_own"
on public.integration_connections for delete
using (auth.uid() = user_id);
