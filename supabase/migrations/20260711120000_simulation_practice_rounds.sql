-- Simulation practice rounds + coaching card practice flag

alter table public.simulation_templates
  add column if not exists practice_rounds_before_submit integer not null default 1
  check (practice_rounds_before_submit >= 0 and practice_rounds_before_submit <= 10);

comment on column public.simulation_templates.practice_rounds_before_submit is
  'Minimum practice rounds recommended before an SE can submit for manager review.';

alter table public.coaching_cards
  add column if not exists is_practice boolean not null default false;

create index if not exists coaching_cards_is_practice_idx
  on public.coaching_cards (is_practice)
  where is_practice = false;

comment on column public.coaching_cards.is_practice is
  'Practice rounds keep coaching feedback for the SE but skip manager review workflow.';
