-- Content ↔ plan linking
alter table public.plan_steps
  add column if not exists content_asset_id uuid references public.content_assets(id) on delete set null;

create index if not exists plan_steps_content_asset_id_idx on public.plan_steps(content_asset_id);

-- Deep-linkable notifications
alter table public.notifications
  add column if not exists action_url text;

-- Saved deal prep sessions
create table if not exists public.deal_prep_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_name text not null,
  industry text not null,
  solutions text[] not null default '{}',
  account_context text,
  prep_output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists deal_prep_sessions_user_id_idx on public.deal_prep_sessions(user_id, created_at desc);

alter table public.deal_prep_sessions enable row level security;

create policy "deal_prep_sessions_own"
on public.deal_prep_sessions for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Shadow meeting logs
create table if not exists public.shadow_meeting_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  assignment_step_id uuid references public.plan_assignment_steps(id) on delete set null,
  meeting_date date not null default current_date,
  customer_name text,
  notes text not null,
  takeaways text,
  created_at timestamptz not null default now()
);

alter table public.shadow_meeting_logs enable row level security;

create policy "shadow_logs_own"
on public.shadow_meeting_logs for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Mentor review requests
create table if not exists public.mentor_review_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mentor_id uuid references public.profiles(id) on delete set null,
  assignment_step_id uuid references public.plan_assignment_steps(id) on delete set null,
  topic text not null,
  se_notes text,
  mentor_feedback text,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.mentor_review_requests enable row level security;

create policy "mentor_reviews_participants"
on public.mentor_review_requests for select
using (user_id = auth.uid() or mentor_id = auth.uid());

create policy "mentor_reviews_insert_self"
on public.mentor_review_requests for insert
with check (user_id = auth.uid());

create policy "mentor_reviews_update_participants"
on public.mentor_review_requests for update
using (user_id = auth.uid() or mentor_id = auth.uid());

-- Default first-week onboarding template
insert into public.onboarding_plans (name, description, is_template, created_by)
select
  'First week — new SE',
  'Default onboarding path: welcome content, first challenge, first simulation, shadow log, mentor check-in.',
  true,
  null
where not exists (
  select 1 from public.onboarding_plans where name = 'First week — new SE' and is_template = true
);

insert into public.plan_steps (plan_id, title, description, step_type, sort_order, content_url, metadata)
select
  p.id,
  step.title,
  step.description,
  step.step_type::public.plan_step_type,
  step.sort_order,
  step.content_url,
  step.metadata::jsonb
from public.onboarding_plans p
cross join (
  values
    ('Welcome & platform orientation', 'Review enablement overview and SailPoint identity fundamentals.', 'content_review', 1, null, '{"dueOffsetDays": 1}'),
    ('ISC discovery challenge', 'Complete your first offline practice challenge and submit evidence.', 'challenge', 2, null, '{"dueOffsetDays": 3}'),
    ('SLED roleplay simulation', 'Run your first AI roleplay and save the coaching card.', 'simulation', 3, null, '{"dueOffsetDays": 5}'),
    ('Shadow a customer call', 'Log notes from a shadow session with your manager or mentor.', 'shadow_meeting_log', 4, null, '{"dueOffsetDays": 7}'),
    ('Mentor check-in', 'Request a mentor review on your first week progress.', 'mentor_review', 5, null, '{"dueOffsetDays": 7}')
) as step(title, description, step_type, sort_order, content_url, metadata)
where p.name = 'First week — new SE' and p.is_template = true
  and not exists (select 1 from public.plan_steps ps where ps.plan_id = p.id);
