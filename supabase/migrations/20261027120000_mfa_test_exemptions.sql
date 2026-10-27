-- Named test accounts can sign in without MFA while the platform is in testing. Everyone else
-- still needs AAL2. Exemptions can expire, and deleting the row (or the person) ends it.

create table if not exists public.mfa_exemptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  reason text not null default 'Test account',
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.mfa_exemptions enable row level security;
-- Only the server (service role) manages exemptions; nobody reads or writes them through the Data API.
grant select, insert, update, delete on public.mfa_exemptions to service_role;

-- True when the signed-in person has a current exemption. Security definer so it can read the table.
create or replace function public.is_mfa_exempt()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.mfa_exemptions
    where user_id = auth.uid() and (expires_at is null or expires_at > now())
  );
$$;

revoke all on function public.is_mfa_exempt() from public, anon;
grant execute on function public.is_mfa_exempt() to authenticated, service_role;

-- The restrictive MFA policies now also pass for exempt test accounts.
create or replace function public.require_aal2()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() ->> 'aal') = 'aal2', false) or public.is_mfa_exempt();
$$;
