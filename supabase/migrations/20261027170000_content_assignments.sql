-- Managers assign Learn library items (documents, videos, links) to people on their team, with a
-- due date. The assignee marks it done once they've worked through it. Server-only: every read and
-- write goes through the API with the service role, which checks who may assign to whom.

create table if not exists public.content_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  asset_id uuid not null references public.content_assets(id) on delete cascade,
  assigned_to uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  due_date date,
  note text,
  status text not null default 'assigned' check (status in ('assigned', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_assignments_assigned_to_idx on public.content_assignments (assigned_to, status);
create index if not exists content_assignments_tenant_idx on public.content_assignments (tenant_id);

alter table public.content_assignments enable row level security;
grant select, insert, update, delete on public.content_assignments to service_role;
