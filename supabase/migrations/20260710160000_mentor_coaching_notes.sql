-- Mentor coaching notes shared with the SE's hiring manager (not manager-private).
create table if not exists public.mentor_coaching_notes (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles(id) on delete cascade,
  se_user_id uuid not null references public.profiles(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mentor_id, se_user_id)
);

create index if not exists mentor_coaching_notes_se_user_id_idx on public.mentor_coaching_notes(se_user_id);
create index if not exists mentor_coaching_notes_mentor_id_idx on public.mentor_coaching_notes(mentor_id);

alter table public.mentor_coaching_notes enable row level security;

drop trigger if exists set_mentor_coaching_notes_updated_at on public.mentor_coaching_notes;
create trigger set_mentor_coaching_notes_updated_at
  before update on public.mentor_coaching_notes
  for each row execute function public.set_updated_at();

create policy "mentor_coaching_notes_select"
on public.mentor_coaching_notes for select to authenticated
using (
  mentor_id = auth.uid()
  or public.can_access_profile(se_user_id)
);

create policy "mentor_coaching_notes_mentor_write"
on public.mentor_coaching_notes for insert to authenticated
with check (mentor_id = auth.uid());

create policy "mentor_coaching_notes_mentor_update"
on public.mentor_coaching_notes for update to authenticated
using (mentor_id = auth.uid())
with check (mentor_id = auth.uid());
