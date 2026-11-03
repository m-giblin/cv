-- Each program (onboarding_plans template) can name its own four phases.
-- null, or a null entry, means the shared default name for that phase.
alter table public.onboarding_plans add column if not exists phase_names text[];
alter table public.onboarding_plans
  drop constraint if exists onboarding_plans_phase_names_shape,
  add constraint onboarding_plans_phase_names_shape check (phase_names is null or cardinality(phase_names) = 4);
