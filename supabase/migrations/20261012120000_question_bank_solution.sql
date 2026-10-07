-- Groups question banks by SailPoint solution so the list stays manageable as it grows.
alter table public.question_bank add column if not exists solution text not null default 'Identity Security Cloud';
create index if not exists question_bank_solution_idx on public.question_bank (tenant_id, solution);
