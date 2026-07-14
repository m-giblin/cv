-- Deal Prep v2: richer metadata, versioning, manager share, plan step type

alter type public.plan_step_type add value if not exists 'deal_prep';

alter table public.deal_prep_sessions
  add column if not exists meeting_type text,
  add column if not exists deal_stage text,
  add column if not exists attendees text,
  add column if not exists meeting_date date,
  add column if not exists competitors text,
  add column if not exists debrief_notes text,
  add column if not exists shared_with_manager boolean not null default false,
  add column if not exists manager_comment text,
  add column if not exists parent_session_id uuid references public.deal_prep_sessions(id) on delete set null,
  add column if not exists account_key text,
  add column if not exists version_number integer not null default 1,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists deal_prep_sessions_account_key_idx
  on public.deal_prep_sessions(user_id, account_key, created_at desc);

create index if not exists deal_prep_sessions_shared_idx
  on public.deal_prep_sessions(user_id, shared_with_manager)
  where shared_with_manager = true;

drop trigger if exists set_deal_prep_sessions_updated_at on public.deal_prep_sessions;
create trigger set_deal_prep_sessions_updated_at
  before update on public.deal_prep_sessions
  for each row execute function public.set_updated_at();

-- Managers can read prep sessions their reports explicitly shared
drop policy if exists "deal_prep_sessions_manager_shared" on public.deal_prep_sessions;
create policy "deal_prep_sessions_manager_shared"
on public.deal_prep_sessions for select
to authenticated
using (
  shared_with_manager = true
  and exists (
    select 1 from public.profiles p
    where p.id = deal_prep_sessions.user_id
      and (p.manager_id = auth.uid() or public.can_access_profile(p.id))
  )
);

-- Backfill account_key for existing rows
update public.deal_prep_sessions
set account_key = lower(trim(account_name))
where account_key is null;
