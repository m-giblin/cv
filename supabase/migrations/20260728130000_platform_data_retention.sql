-- Data retention policy fields (Admin → Settings → Data retention)

alter table public.platform_settings
  add column if not exists audit_log_retention_days integer not null default 365
    check (audit_log_retention_days between 30 and 3650),
  add column if not exists activity_log_retention_days integer not null default 180
    check (activity_log_retention_days between 30 and 3650),
  add column if not exists ai_usage_retention_days integer not null default 90
    check (ai_usage_retention_days between 7 and 3650);

comment on column public.platform_settings.audit_log_retention_days is
  'Target retention for audit_logs rows (purge job uses this).';
comment on column public.platform_settings.activity_log_retention_days is
  'Target retention for activity_logs rows.';
comment on column public.platform_settings.ai_usage_retention_days is
  'Target retention for ai_usage_logs rows.';
