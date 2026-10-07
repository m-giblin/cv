-- Question bank: AI-drafted, admin-approved questions from playbooks and SailPoint docs, served in
-- rotation so people don't see the same questions every time.

create table if not exists public.question_bank (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  -- Where the question came from: a playbook chapter, documentation.sailpoint.com, developer.sailpoint.com, or typed by hand.
  source_kind text not null check (source_kind in ('playbook', 'docs', 'developer', 'manual')),
  playbook_id uuid references public.capability_playbooks(id) on delete cascade,
  -- The topic searched for docs/developer questions; a stable key for grouping and refreshing.
  topic text not null default '',
  source_title text,
  source_url text,
  competency text not null default '',
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  stem text not null,
  choices jsonb not null,
  correct_index integer not null check (correct_index between 0 and 5),
  explanation text not null default '',
  -- draft (waiting for review) → active (served) → retired (rotated out, kept for history).
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  -- Questions generated together; refreshing replaces one batch with the next.
  batch_id uuid,
  -- An improved rewrite points at the question it replaces; approving it retires the original.
  replaces_id uuid references public.question_bank(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  retired_at timestamptz
);

create index if not exists question_bank_source_idx on public.question_bank (tenant_id, source_kind, playbook_id, topic, status);
create index if not exists question_bank_batch_idx on public.question_bank (batch_id);

-- Every answer, so quizzes can skip recently seen questions and weak questions show up in the stats.
create table if not exists public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  question_id uuid not null references public.question_bank(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  chosen_index integer not null,
  correct boolean not null,
  quiz_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists question_attempts_user_idx on public.question_attempts (user_id, question_id, created_at desc);
create index if not exists question_attempts_question_idx on public.question_attempts (question_id);

alter table public.question_bank enable row level security;
alter table public.question_attempts enable row level security;

-- Reads and writes go through the server (service role), which checks roles and hides answers
-- from learners until they've answered. Learners may read their own attempts.
drop policy if exists question_attempts_select on public.question_attempts;
create policy question_attempts_select on public.question_attempts
  for select to authenticated
  using (user_id = auth.uid() or public.can_access_profile(user_id));
