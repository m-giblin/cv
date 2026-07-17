-- Explicit multi-hat designations for shell workspaces.
-- NULL means derive from profiles.role (see lib/auth/workspace.ts).
-- Values: platform | tenant_admin | manager | se

alter table public.profiles
  add column if not exists workspace_hats text[] null;

comment on column public.profiles.workspace_hats is
  'Optional workspace hats (platform, tenant_admin, manager, se). NULL = derive from role.';
