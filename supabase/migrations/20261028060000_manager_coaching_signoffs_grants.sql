-- Gate sign-offs failed with "Could not find the table 'public.manager_coaching_signoffs' in the
-- schema cache": 20260710180000 was never applied in production. This repeats it safely (it is a
-- no-op where the table already exists) and adds the Data API grants the table never had.
-- Managers insert and read their own sign-offs through RLS.
create table if not exists public.manager_coaching_signoffs (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references public.profiles(id) on delete cascade,
  se_user_id uuid not null references public.profiles(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  review_type text not null,
  review_target_id uuid not null,
  decision text not null check (decision in ('approve', 'reject')),
  signoff_tier text not null check (signoff_tier in ('light', 'standard', 'hard')),
  strength text not null default '',
  gap text,
  next_action text not null default '',
  confidence smallint check (confidence is null or (confidence >= 1 and confidence <= 5)),
  live_attestation boolean not null default false,
  attestation_note text,
  ai_draft text,
  ai_draft_edited boolean not null default false,
  review_duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists manager_coaching_signoffs_manager_id_idx
  on public.manager_coaching_signoffs(manager_id, created_at desc);
create index if not exists manager_coaching_signoffs_se_user_id_idx
  on public.manager_coaching_signoffs(se_user_id, created_at desc);
create index if not exists manager_coaching_signoffs_target_idx
  on public.manager_coaching_signoffs(review_type, review_target_id);

alter table public.manager_coaching_signoffs enable row level security;

drop policy if exists "manager_coaching_signoffs_select" on public.manager_coaching_signoffs;
create policy "manager_coaching_signoffs_select"
on public.manager_coaching_signoffs for select to authenticated
using (
  manager_id = auth.uid()
  or public.can_access_profile(se_user_id)
);

drop policy if exists "manager_coaching_signoffs_insert" on public.manager_coaching_signoffs;
create policy "manager_coaching_signoffs_insert"
on public.manager_coaching_signoffs for insert to authenticated
with check (manager_id = auth.uid());

grant select, insert, update, delete on public.manager_coaching_signoffs to service_role;
grant select, insert on public.manager_coaching_signoffs to authenticated;

notify pgrst, 'reload schema';
