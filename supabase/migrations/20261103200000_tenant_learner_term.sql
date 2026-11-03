-- What a tenant calls the people it trains ("SE"/"SEs", "AE"/"AEs"), used in page text, help and
-- emails. Null means the product default (SE / SEs). Columns on an existing table: no new grants.
alter table public.tenants
  add column if not exists learner_term text,
  add column if not exists learner_term_plural text;

alter table public.tenants
  drop constraint if exists tenants_learner_term_length,
  add constraint tenants_learner_term_length check (learner_term is null or char_length(learner_term) between 1 and 24),
  drop constraint if exists tenants_learner_term_plural_length,
  add constraint tenants_learner_term_plural_length check (learner_term_plural is null or char_length(learner_term_plural) between 1 and 24);
