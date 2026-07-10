-- Locked templates: managers may reorder steps but cannot add/delete structure.
alter table public.onboarding_plans
  add column if not exists is_locked boolean not null default false;

-- Standard library ramps are manager-locked.
update public.onboarding_plans
set is_locked = true
where is_template = true
  and (
    name like 'Week %'
    or name like 'First week%'
    or name like '60-day%'
    or name like '90-day%'
    or name like '120-Day Mastery%'
  );
