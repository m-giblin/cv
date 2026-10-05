-- Offboard previously reused the "suspended" status verbatim, making it
-- indistinguishable from an emergency suspend (same DB state, same badge,
-- differed only by an audit-log action name). Add a real "offboarded"
-- status plus a timestamp so the two are distinguishable everywhere.
alter table public.tenants
  drop constraint if exists tenants_status_check;

alter table public.tenants
  add constraint tenants_status_check
  check (status in ('active', 'suspended', 'provisioning', 'offboarded'));

alter table public.tenants
  add column if not exists offboarded_at timestamptz;
