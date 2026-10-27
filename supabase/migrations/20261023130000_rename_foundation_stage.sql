-- Match the first new-hire stage to the Days 31–60, 61–90, and 91–120 names.
update public.onboarding_plans
set name = 'Days 1–30 — New Hirer - Foundation',
    updated_at = now()
where tenant_id = '00000000-0000-4000-8000-000000000001'
  and name = 'New Hirer - Foundation';
