-- Gate sign-offs failed with "Could not find the table 'public.manager_coaching_signoffs' in the
-- schema cache": the table was created without Data API grants, so signed-in managers could not
-- see it. Managers insert and read their own sign-offs through RLS (policies in 20260710180000).
alter table public.manager_coaching_signoffs enable row level security;
grant select, insert, update, delete on public.manager_coaching_signoffs to service_role;
grant select, insert on public.manager_coaching_signoffs to authenticated;
