-- Capability playbooks: a sales field guide imported as structured content.
-- One playbook_guides row per imported guide (front matter, routing table), one
-- capability_playbooks row per chapter. Admin writes go through the service role in the
-- admin API; members read published playbooks in their own tenant.

create table if not exists public.playbook_guides (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  segment text not null default 'general',
  segment_label text,
  edition text,
  source_name text,
  body jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists playbook_guides_tenant_idx on public.playbook_guides (tenant_id);

create table if not exists public.capability_playbooks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  guide_id uuid not null references public.playbook_guides(id) on delete cascade,
  chapter integer not null,
  slug text not null,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  version integer not null default 1,
  body jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guide_id, chapter)
);

create index if not exists capability_playbooks_tenant_status_idx on public.capability_playbooks (tenant_id, status);
create index if not exists capability_playbooks_guide_idx on public.capability_playbooks (guide_id, chapter);

alter table public.playbook_guides enable row level security;
alter table public.capability_playbooks enable row level security;

drop policy if exists playbook_guides_select_tenant on public.playbook_guides;
create policy playbook_guides_select_tenant on public.playbook_guides
  for select to authenticated
  using (public.can_access_tenant_row(tenant_id));

-- Drafts are visible to admins only; everyone in the tenant reads published chapters.
drop policy if exists capability_playbooks_select_tenant on public.capability_playbooks;
create policy capability_playbooks_select_tenant on public.capability_playbooks
  for select to authenticated
  using (public.can_access_tenant_row(tenant_id) and (status = 'published' or public.is_admin()));
