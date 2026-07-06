-- Platform session timeout + persisted feature flags (Admin → Settings)

alter table public.platform_settings
  add column if not exists session_idle_minutes integer not null default 15
    check (session_idle_minutes between 5 and 1440),
  add column if not exists feature_flags jsonb not null default '{}'::jsonb;

comment on column public.platform_settings.session_idle_minutes is
  'Idle sign-out threshold in minutes (5–1440). Applied client-side after login.';
comment on column public.platform_settings.feature_flags is
  'Admin-managed feature toggles keyed by flag id.';
