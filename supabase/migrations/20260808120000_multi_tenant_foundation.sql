-- Multi-tenant foundation: tenants, super_admin role, per-tenant platform_settings
-- (super_admin enum value added in 20260808110000_add_super_admin_role.sql)

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null default 'active' check (status in ('active', 'suspended', 'provisioning')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tenants_status_idx on public.tenants (status);

drop trigger if exists set_tenants_updated_at on public.tenants;
create trigger set_tenants_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

-- Default tenant for existing SailPoint deployment
insert into public.tenants (id, slug, name, status)
values ('00000000-0000-4000-8000-000000000001', 'sailpoint', 'SailPoint', 'active')
on conflict (slug) do nothing;

alter table public.profiles
  add column if not exists tenant_id uuid references public.tenants (id) on delete restrict;

update public.profiles
set tenant_id = '00000000-0000-4000-8000-000000000001'
where tenant_id is null
  and role is distinct from 'super_admin';

alter table public.platform_settings
  add column if not exists tenant_id uuid references public.tenants (id) on delete cascade;

update public.platform_settings
set tenant_id = '00000000-0000-4000-8000-000000000001'
where tenant_id is null;

alter table public.platform_settings drop constraint if exists platform_settings_singleton;

create unique index if not exists platform_settings_tenant_id_unique
  on public.platform_settings (tenant_id)
  where tenant_id is not null;

-- Tenant-scoped usage rollups for super-admin dashboard
create table if not exists public.tenant_usage_daily (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  usage_date date not null,
  active_users integer not null default 0,
  ai_calls integer not null default 0,
  simulation_sessions integer not null default 0,
  challenge_submissions integer not null default 0,
  storage_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (tenant_id, usage_date)
);

create index if not exists tenant_usage_daily_tenant_date_idx
  on public.tenant_usage_daily (tenant_id, usage_date desc);

-- SQL helpers
create or replace function public.is_super_admin(check_profile_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = check_profile_id
      and p.role = 'super_admin'
  );
$$;

create or replace function public.current_tenant_id(check_profile_id uuid default auth.uid())
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.tenant_id
  from public.profiles p
  where p.id = check_profile_id;
$$;

create or replace function public.is_admin(check_profile_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = check_profile_id
      and p.role in ('admin', 'director')
  );
$$;

-- Tenants: super-admin only
alter table public.tenants enable row level security;

drop policy if exists tenants_super_admin_all on public.tenants;
create policy tenants_super_admin_all on public.tenants
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists tenants_member_select on public.tenants;
create policy tenants_member_select on public.tenants
  for select to authenticated
  using (
    id = public.current_tenant_id()
    or public.is_super_admin()
  );

-- Tenant usage: super-admin read
alter table public.tenant_usage_daily enable row level security;

drop policy if exists tenant_usage_super_admin on public.tenant_usage_daily;
create policy tenant_usage_super_admin on public.tenant_usage_daily
  for select to authenticated
  using (public.is_super_admin());

-- Platform settings: tenant admins see own row; super-admin sees all
drop policy if exists platform_settings_admin on public.platform_settings;
create policy platform_settings_admin on public.platform_settings
  for all to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_admin()
      and tenant_id = public.current_tenant_id()
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.is_admin()
      and tenant_id = public.current_tenant_id()
    )
  );

-- Profiles: super-admin can read all; tenant admins only same tenant
drop policy if exists profiles_select_authorized_org on public.profiles;
create policy profiles_select_authorized_org on public.profiles
  for select to authenticated
  using (
    public.is_super_admin()
    or public.can_access_profile(id)
  );

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles
  for insert to authenticated
  with check (
    public.is_super_admin()
    or (
      public.is_admin()
      and tenant_id = public.current_tenant_id()
    )
  );
