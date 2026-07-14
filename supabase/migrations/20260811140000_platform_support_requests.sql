-- Platform operator: tenant support requests + operator notes

alter table public.tenants
  add column if not exists operator_notes text;

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  body text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  page_url text,
  operator_notes text,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_requests_tenant_status_idx
  on public.support_requests (tenant_id, status, created_at desc);

create index if not exists support_requests_status_idx
  on public.support_requests (status, created_at desc);

alter table public.support_requests enable row level security;

drop policy if exists support_requests_tenant_admin on public.support_requests;
create policy support_requests_tenant_admin on public.support_requests
  for all to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_admin()
      and tenant_id = public.current_tenant_id()
    )
    or reporter_id = auth.uid()
  )
  with check (
    public.is_super_admin()
    or (
      public.is_admin()
      and tenant_id = public.current_tenant_id()
      and reporter_id = auth.uid()
      and status = 'open'
    )
  );

drop policy if exists support_requests_super_admin on public.support_requests;
create policy support_requests_super_admin on public.support_requests
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());
