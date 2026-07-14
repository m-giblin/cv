-- Private manager coaching notes per direct report (1:1 continuity)
create table if not exists public.manager_coaching_notes (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references public.profiles(id) on delete cascade,
  se_user_id uuid not null references public.profiles(id) on delete cascade,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (manager_id, se_user_id)
);

create index if not exists manager_coaching_notes_manager_id_idx
  on public.manager_coaching_notes(manager_id);

create index if not exists manager_coaching_notes_se_user_id_idx
  on public.manager_coaching_notes(se_user_id);

alter table if exists public.manager_coaching_notes enable row level security;

drop trigger if exists set_manager_coaching_notes_updated_at on public.manager_coaching_notes;
create trigger set_manager_coaching_notes_updated_at
  before update on public.manager_coaching_notes
  for each row execute function public.set_updated_at();

create policy "manager_coaching_notes_select"
on public.manager_coaching_notes for select to authenticated
using (
  manager_id = auth.uid()
  or se_user_id = auth.uid()
);

create policy "manager_coaching_notes_insert"
on public.manager_coaching_notes for insert to authenticated
with check (manager_id = auth.uid());

create policy "manager_coaching_notes_update"
on public.manager_coaching_notes for update to authenticated
using (manager_id = auth.uid())
with check (manager_id = auth.uid());

create policy "require_mfa_aal2_manager_coaching_notes"
on public.manager_coaching_notes as restrictive for all to authenticated
using ((select auth.jwt()->>'aal') = 'aal2');
