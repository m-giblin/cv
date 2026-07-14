-- Mission control: support inbox, maintenance mode, tenant activity tracking

alter table public.support_requests
  add column if not exists assigned_to uuid references public.profiles (id) on delete set null,
  add column if not exists operator_reply text,
  add column if not exists first_response_at timestamptz;

create index if not exists support_requests_assigned_idx
  on public.support_requests (assigned_to, status);

alter table public.tenants
  add column if not exists maintenance_mode boolean not null default false,
  add column if not exists maintenance_message text;

create index if not exists tenants_maintenance_idx
  on public.tenants (maintenance_mode)
  where maintenance_mode = true;
