-- People can be active or inactive. Bulk uploads arrive inactive; an admin reviews, activates and
-- invites them. Inactive people can't sign in and are left out of assignment and reminder lists.
alter table public.profiles add column if not exists status text not null default 'active'
  check (status in ('active', 'inactive'));
-- When the latest invite email went out (null: never invited from the app).
alter table public.profiles add column if not exists invited_at timestamptz;
create index if not exists profiles_tenant_status_idx on public.profiles (tenant_id, status);
