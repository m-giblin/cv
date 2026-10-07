-- A chapter assignment can require passing the chapter's knowledge check, when it has one.
alter table public.playbook_assignments
  add column if not exists require_quiz boolean not null default true,
  add column if not exists quiz_pass_score integer not null default 80 check (quiz_pass_score between 1 and 100);
