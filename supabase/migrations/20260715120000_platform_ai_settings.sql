-- Platform AI settings (admin-managed) + usage telemetry

create table if not exists public.platform_settings (
  id text primary key default 'default',
  provider text not null default 'xai' check (provider in ('xai', 'openai')),
  model text not null default 'grok-3-mini',
  api_key text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  constraint platform_settings_singleton check (id = 'default')
);

insert into public.platform_settings (id, provider, model)
values ('default', 'xai', 'grok-3-mini')
on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

drop policy if exists platform_settings_admin on public.platform_settings;
create policy platform_settings_admin on public.platform_settings
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  feature text not null,
  provider text,
  model text,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_logs_created_at_idx on public.ai_usage_logs (created_at desc);
create index if not exists ai_usage_logs_feature_idx on public.ai_usage_logs (feature);

alter table public.ai_usage_logs enable row level security;

drop policy if exists ai_usage_logs_insert_own on public.ai_usage_logs;
create policy ai_usage_logs_insert_own on public.ai_usage_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists ai_usage_logs_admin_read on public.ai_usage_logs;
create policy ai_usage_logs_admin_read on public.ai_usage_logs
  for select
  using (public.is_admin(auth.uid()));
