-- One row each time someone starts a challenge. Holds the 5-working-day clock, which
-- reminders have gone out, and whether a manager has allowed a canceled challenge to restart.
-- People read their own rows and managers read their team's through RLS. All writes go
-- through server routes using the service role.
create table if not exists public.challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'submitted', 'approved', 'canceled')),
  started_at timestamptz not null default now(),
  clock_started_at timestamptz not null default now(),
  reminder_sent_at timestamptz,
  warning_sent_at timestamptz,
  canceled_at timestamptz,
  restart_allowed_at timestamptz,
  restart_allowed_by uuid references public.profiles(id) on delete set null,
  submission_id uuid references public.challenge_submissions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists challenge_attempts_one_open_idx
  on public.challenge_attempts(user_id, challenge_id)
  where status in ('active', 'submitted');
create index if not exists challenge_attempts_user_idx
  on public.challenge_attempts(user_id, created_at desc);
create index if not exists challenge_attempts_active_idx
  on public.challenge_attempts(clock_started_at)
  where status = 'active';

alter table public.challenge_attempts enable row level security;

drop policy if exists "challenge_attempts_select" on public.challenge_attempts;
create policy "challenge_attempts_select"
on public.challenge_attempts for select to authenticated
using (user_id = auth.uid() or public.can_access_profile(user_id));

grant select, insert, update, delete on public.challenge_attempts to service_role;
grant select on public.challenge_attempts to authenticated;
