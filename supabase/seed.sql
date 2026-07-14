-- Optional demo seed for Supabase after Auth users exist.
-- Run in Supabase SQL Editor AFTER creating matching auth.users rows.
--
-- 1. Create users in Supabase Auth (Authentication → Users) with emails below.
-- 2. Replace the placeholder UUIDs with each user's auth.users.id.
-- 3. Run this script.

-- Example profile insert (repeat for each team member):
-- insert into public.profiles (id, email, full_name, role, level, manager_id)
-- values
--   ('YOUR-MATT-UUID', 'matt.giblin@sailpoint.com', 'Matt Giblin', 'director', 'Advisory', null),
--   ('YOUR-PRIYA-UUID', 'priya.shah@sailpoint.com', 'Priya Shah', 'manager', 'Advisory', 'YOUR-MATT-UUID');

insert into public.competencies (name, category, description)
values
  ('ISC Workflows and Forms', 'Platform', 'Map business process automation to Identity Security Cloud workflows, forms, and transforms.'),
  ('SLED Vertical Knowledge', 'Vertical', 'Navigate state/local/education procurement, compliance, and identity modernization priorities.'),
  ('Executive Demo Storytelling', 'Presentation', 'Frame demos around customer outcomes instead of feature tours.')
on conflict (name) do nothing;

-- After profiles exist, add onboarding plans, challenges, and assignments through the app admin UI
-- or extend this seed with your team-specific content.
