-- Tracks manager review reminders (auto cron + SE manual nudge) for rate limiting.

create table if not exists public.review_reminder_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  review_kind text not null check (review_kind in ('challenge', 'coaching')),
  review_id uuid not null,
  manager_id uuid not null references public.profiles(id) on delete cascade,
  se_user_id uuid not null references public.profiles(id) on delete cascade,
  trigger_source text not null check (trigger_source in ('auto', 'se_nudge')),
  created_at timestamptz not null default now()
);

create index if not exists review_reminder_log_review_idx
  on public.review_reminder_log (review_kind, review_id, created_at desc);

create index if not exists review_reminder_log_manager_idx
  on public.review_reminder_log (manager_id, created_at desc);

alter table public.review_reminder_log enable row level security;

drop policy if exists "review_reminder_log_select_own" on public.review_reminder_log;
create policy "review_reminder_log_select_own"
  on public.review_reminder_log for select
  using (auth.uid() = se_user_id or auth.uid() = manager_id);

drop policy if exists "review_reminder_log_insert_se" on public.review_reminder_log;
create policy "review_reminder_log_insert_se"
  on public.review_reminder_log for insert
  with check (auth.uid() = se_user_id and trigger_source = 'se_nudge');
