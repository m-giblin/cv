-- Run in Supabase SQL Editor to diagnose sign-in issues.
-- Login uses auth.users (password), NOT public.profiles alone.

-- 1) Profile row (enablement app data)
select id, email, full_name, role, level
from public.profiles
order by created_at;

-- 2) Auth user (what /login actually checks)
select id, email, email_confirmed_at, last_sign_in_at, created_at
from auth.users
order by created_at;

-- 3) Find mismatches: profile without auth user, or different emails
select p.id, p.email as profile_email, u.email as auth_email
from public.profiles p
left join auth.users u on u.id = p.id
where u.id is null or lower(p.email) <> lower(u.email);
