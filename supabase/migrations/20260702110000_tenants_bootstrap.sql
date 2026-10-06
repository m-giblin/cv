-- Tenant bootstrap.
--
-- `public.tenants` was originally introduced by 20260808120000_multi_tenant_foundation.sql,
-- but many earlier-dated migrations (20260710150000 onward) declare `tenant_id uuid
-- references public.tenants(id)` columns. Applying the migration set to an empty database
-- therefore failed with `relation "public.tenants" does not exist`.
--
-- Creating the table (and the default tenant + profiles.tenant_id) here makes the set
-- replayable from scratch. Every statement is idempotent, and the later multi-tenant
-- foundation migration re-runs as a no-op on databases that were migrated before this file
-- existed.

-- Helper used by migrations that backfill tenant_id before the multi-tenant columns are
-- guaranteed to exist. Kept in the public schema so later migrations can reuse it.
create or replace function public.has_tenant_id_column(target_table text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = target_table
      and column_name = 'tenant_id'
  );
$$;

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

insert into public.tenants (id, slug, name, status)
values ('00000000-0000-4000-8000-000000000001', 'sailpoint', 'SailPoint', 'active')
on conflict (slug) do nothing;

alter table public.profiles
  add column if not exists tenant_id uuid references public.tenants (id) on delete restrict;

update public.profiles
set tenant_id = '00000000-0000-4000-8000-000000000001'
where tenant_id is null;

-- Same story as `tenants`: the base table lands in 20260809120000, but
-- 20260716230000_platform_ops_extensions.sql already ALTERs it. RLS and policies are still
-- attached by 20260809120000, which re-runs this CREATE as a no-op.
create table if not exists public.tenant_admin_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  email text not null,
  full_name text not null,
  invited_by uuid references public.profiles (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (tenant_id, email)
);

create index if not exists tenant_admin_invites_tenant_idx
  on public.tenant_admin_invites (tenant_id, status);

alter table public.tenant_admin_invites enable row level security;

-- Tenant/role predicates. Originally defined in 20260808120000_multi_tenant_foundation.sql,
-- but 20260716230000_platform_ops_extensions.sql builds RLS policies on top of
-- is_super_admin(). Defined here so policies created earlier in the sequence resolve; the
-- later migration re-issues identical CREATE OR REPLACE definitions.
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
