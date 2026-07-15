create table if not exists public.manager_coaching_session_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  manager_id uuid not null references public.profiles(id) on delete cascade,
  se_user_id uuid not null references public.profiles(id) on delete cascade,
  session_focus text not null default 'Coaching note',
  note text not null,
  outcome_label text not null default 'LOGGED',
  created_at timestamptz not null default now()
);

create index if not exists manager_coaching_session_notes_se_idx
  on public.manager_coaching_session_notes(se_user_id, created_at desc);

create index if not exists manager_coaching_session_notes_manager_idx
  on public.manager_coaching_session_notes(manager_id, created_at desc);

alter table public.manager_coaching_session_notes enable row level security;

create policy "manager_coaching_session_notes_select"
on public.manager_coaching_session_notes for select to authenticated
using (
  manager_id = auth.uid()
  or public.can_access_profile(se_user_id)
);

create policy "manager_coaching_session_notes_insert"
on public.manager_coaching_session_notes for insert to authenticated
with check (
  manager_id = auth.uid()
  and public.can_access_profile(se_user_id)
  and public.can_access_tenant_row(tenant_id)
);
