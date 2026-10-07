-- Super admins belong to no tenant, so they couldn't be enrolled or assigned training anywhere.
-- A home tenant makes them a member of one workspace for training (they appear in its People list
-- and can have a manager), while keeping their platform-wide powers. They can change it any time.
alter table public.profiles add column if not exists home_tenant_id uuid references public.tenants(id) on delete set null;
create index if not exists profiles_home_tenant_idx on public.profiles (home_tenant_id);
