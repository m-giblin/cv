-- Persist AI challenge review notes (strengths, gaps, summary) alongside suggested score
alter table public.challenge_submissions
  add column if not exists ai_review jsonb;
