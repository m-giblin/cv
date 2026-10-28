-- The activity feed holds milestone events a person's Record reads back (approvals, 1:1s,
-- mentor check-ins, stage changes). 180 days was too short to look back over a year, so the
-- default is now two years. Workspaces still on the old default move up with it; anyone who
-- chose a different value keeps it. No purge job runs today, so nothing has been lost.
-- Creates no tables, views or sequences, so there are no grants to add.

alter table public.platform_settings
  alter column activity_log_retention_days set default 730;

update public.platform_settings
  set activity_log_retention_days = 730
  where activity_log_retention_days = 180;

comment on column public.platform_settings.activity_log_retention_days is
  'Target retention for activity_logs rows (default 730). A purge must keep milestone events '
  '(approvals, certificates, stage changes, 1:1s, mentor check-ins) whatever this is set to.';
