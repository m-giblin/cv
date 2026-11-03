-- Job titles per tenant ("Account Executive", "Sales Manager"), each tied to an access level that
-- decides what the person can do (learner, manager or admin). Adds columns to existing tables only,
-- so their existing grants and row-level security already cover them.
alter table public.tenants
  add column if not exists job_titles jsonb not null default '[]'::jsonb;

alter table public.profiles
  add column if not exists job_title text;

alter table public.profiles
  drop constraint if exists profiles_job_title_length,
  add constraint profiles_job_title_length check (job_title is null or char_length(job_title) between 1 and 60);

comment on column public.tenants.job_titles is
  'Job titles admins pick from: [{"name": "Account Executive", "access": "learner"|"manager"|"admin"}].';
comment on column public.profiles.job_title is
  'The person''s job title in their tenant; profiles.role still decides their access.';
