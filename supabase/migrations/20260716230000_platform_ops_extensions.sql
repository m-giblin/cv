-- Super Admin platform ops: invite lifecycle, tenant commercial/domain/export
-- fields, SSO configs, outbound webhooks, and operator notification prefs.

-- ---------------------------------------------------------------------------
-- tenant_admin_invites: revoke + resend + expiry tracking
-- ---------------------------------------------------------------------------

alter table public.tenant_admin_invites
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references public.profiles (id) on delete set null,
  add column if not exists last_sent_at timestamptz,
  add column if not exists expires_at timestamptz;

create index if not exists tenant_admin_invites_expires_idx
  on public.tenant_admin_invites (expires_at)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- tenants: commercial, custom domain, and data export fields
-- ---------------------------------------------------------------------------

alter table public.tenants
  add column if not exists billing_status text not null default 'trial'
    check (billing_status in ('trial', 'active', 'past_due', 'canceled', 'exempt')),
  add column if not exists billing_plan text,
  add column if not exists seat_quota integer,
  add column if not exists custom_domain text,
  add column if not exists custom_domain_status text not null default 'none'
    check (custom_domain_status in ('none', 'pending', 'verified', 'failed')),
  add column if not exists export_requested_at timestamptz,
  add column if not exists export_completed_at timestamptz,
  add column if not exists export_status text not null default 'idle'
    check (export_status in ('idle', 'queued', 'running', 'ready', 'failed')),
  add column if not exists last_export_artifact_url text;

create unique index if not exists tenants_custom_domain_unique
  on public.tenants (custom_domain)
  where custom_domain is not null;

create index if not exists tenants_billing_status_idx
  on public.tenants (billing_status);

-- ---------------------------------------------------------------------------
-- tenant_sso_configs
-- ---------------------------------------------------------------------------

create table if not exists public.tenant_sso_configs (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  enabled boolean not null default false,
  provider text not null default 'saml' check (provider in ('saml', 'oidc')),
  sso_domain text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_tenant_sso_configs_updated_at on public.tenant_sso_configs;
create trigger set_tenant_sso_configs_updated_at
  before update on public.tenant_sso_configs
  for each row execute function public.set_updated_at();

alter table public.tenant_sso_configs enable row level security;

drop policy if exists tenant_sso_configs_super_admin on public.tenant_sso_configs;
create policy tenant_sso_configs_super_admin on public.tenant_sso_configs
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- tenant_webhooks
-- ---------------------------------------------------------------------------

create table if not exists public.tenant_webhooks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  url text not null,
  secret_ciphertext text,
  events text[] not null default array[]::text[],
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists tenant_webhooks_tenant_idx
  on public.tenant_webhooks (tenant_id);

alter table public.tenant_webhooks enable row level security;

drop policy if exists tenant_webhooks_super_admin on public.tenant_webhooks;
create policy tenant_webhooks_super_admin on public.tenant_webhooks
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- operator_notification_prefs
-- ---------------------------------------------------------------------------

create table if not exists public.operator_notification_prefs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email_on_critical_support boolean not null default true,
  email_on_new_tenant boolean not null default true,
  email_digest_hours integer not null default 24 check (email_digest_hours > 0),
  channels jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_operator_notification_prefs_updated_at on public.operator_notification_prefs;
create trigger set_operator_notification_prefs_updated_at
  before update on public.operator_notification_prefs
  for each row execute function public.set_updated_at();

alter table public.operator_notification_prefs enable row level security;

drop policy if exists operator_notification_prefs_super_admin on public.operator_notification_prefs;
create policy operator_notification_prefs_super_admin on public.operator_notification_prefs
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());
