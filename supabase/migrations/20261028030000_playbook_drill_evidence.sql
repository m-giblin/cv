-- What the person actually said in a pitch drill, and the coach's feedback, so whoever assigned the
-- chapter can read it next to the score. Existing table: no new grants needed.
alter table public.playbook_drill_results
  add column if not exists response_text text,
  add column if not exists feedback jsonb;
