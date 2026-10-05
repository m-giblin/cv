-- Readiness Map v2: outcome tagging, score-dispute flags, and a cohort
-- percentile snapshot table.

-- 1. Deal Prep outcome tagging (feeds the outcome-correlation report).
alter table public.deal_prep_sessions
  add column if not exists outcome text not null default 'pending'
    check (outcome in ('pending', 'won', 'lost'));

-- 2. Score-dispute flags: an SE can flag a readiness dimension score as
-- inaccurate; a manager/admin can resolve it. Mirrors the RLS shape used by
-- manager_coaching_session_notes.
create table if not exists public.readiness_signal_flags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  dim_name text not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null
);

create index if not exists readiness_signal_flags_user_idx
  on public.readiness_signal_flags(user_id, created_at desc);

create index if not exists readiness_signal_flags_open_idx
  on public.readiness_signal_flags(tenant_id, status) where status = 'open';

alter table public.readiness_signal_flags enable row level security;

drop policy if exists "readiness_signal_flags_select" on public.readiness_signal_flags;
create policy "readiness_signal_flags_select"
on public.readiness_signal_flags for select to authenticated
using (public.can_access_profile(user_id));

drop policy if exists "readiness_signal_flags_insert" on public.readiness_signal_flags;
create policy "readiness_signal_flags_insert"
on public.readiness_signal_flags for insert to authenticated
with check (
  user_id = auth.uid()
  and public.can_access_tenant_row(tenant_id)
);

drop policy if exists "readiness_signal_flags_update" on public.readiness_signal_flags;
create policy "readiness_signal_flags_update"
on public.readiness_signal_flags for update to authenticated
using (public.can_access_profile(user_id) and user_id <> auth.uid())
with check (public.can_access_profile(user_id) and user_id <> auth.uid());

-- 3. Composite-score snapshots: upserted by the readiness-map API routes
-- after each computation, so cohort percentile ranking doesn't require
-- re-deriving the whole TS scoring pipeline in SQL. Deliberately minimal
-- (no per-dimension breakdown) so a tenant-wide select policy can't leak
-- anything beyond "level + a number" for teammates.
create table if not exists public.readiness_score_snapshots (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  level text not null,
  composite int not null,
  computed_at timestamptz not null default now()
);

create index if not exists readiness_score_snapshots_cohort_idx
  on public.readiness_score_snapshots(tenant_id, level);

alter table public.readiness_score_snapshots enable row level security;

drop policy if exists "readiness_score_snapshots_select" on public.readiness_score_snapshots;
create policy "readiness_score_snapshots_select"
on public.readiness_score_snapshots for select to authenticated
using (public.can_access_tenant_row(tenant_id));

drop policy if exists "readiness_score_snapshots_upsert" on public.readiness_score_snapshots;
create policy "readiness_score_snapshots_upsert"
on public.readiness_score_snapshots for insert to authenticated
with check (public.can_access_profile(user_id) and public.can_access_tenant_row(tenant_id));

drop policy if exists "readiness_score_snapshots_update" on public.readiness_score_snapshots;
create policy "readiness_score_snapshots_update"
on public.readiness_score_snapshots for update to authenticated
using (public.can_access_profile(user_id))
with check (public.can_access_profile(user_id) and public.can_access_tenant_row(tenant_id));
