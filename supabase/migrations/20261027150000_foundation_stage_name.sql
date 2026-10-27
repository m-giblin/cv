-- Fix the "New Hirer" typo in the first New Hire stage, and the Entro wording (now Credentials
-- Management) in stage descriptions. Data only; safe to rerun.
update public.onboarding_plans
set name = 'Days 1–30 — Foundation'
where name = 'Days 1–30 — New Hirer - Foundation';

update public.onboarding_plans
set description = replace(replace(description, 'SailPoint Entro', 'SailPoint Credentials Management'), 'Entro', 'Credentials Management')
where description like '%Entro%';
