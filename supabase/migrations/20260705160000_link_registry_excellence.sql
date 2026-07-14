-- Link Registry: Master Corpus metadata, 120-day segment gates, release courses, feedback & routing

alter table public.content_assets
  add column if not exists asset_type text not null default 'link'
    check (asset_type in ('video', 'doc', 'podcast', 'link', 'file')),
  add column if not exists project_tags text[] not null default '{}',
  add column if not exists module_tags text[] not null default '{}',
  add column if not exists is_link_only boolean not null default true;

create index if not exists content_assets_project_tags_idx on public.content_assets using gin (project_tags);
create index if not exists content_assets_module_tags_idx on public.content_assets using gin (module_tags);

alter table public.plan_assignments
  add column if not exists unlocked_segment_max smallint not null default 1
    check (unlocked_segment_max >= 1 and unlocked_segment_max <= 4);

create table if not exists public.release_courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  project_tag text not null,
  plan_id uuid references public.onboarding_plans(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists release_courses_project_tag_idx on public.release_courses (project_tag);

create table if not exists public.corpus_asset_feedback (
  id uuid primary key default gen_random_uuid(),
  content_asset_id uuid not null references public.content_assets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_confusing boolean not null default false,
  comment text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  admin_note text,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists corpus_asset_feedback_status_idx on public.corpus_asset_feedback (status, created_at desc);
create index if not exists corpus_asset_feedback_asset_idx on public.corpus_asset_feedback (content_asset_id);

create table if not exists public.corpus_routing_rules (
  id uuid primary key default gen_random_uuid(),
  tag text not null,
  destination_type text not null check (destination_type in ('slack', 'email')),
  destination_address text not null,
  label text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tag, destination_type, destination_address)
);

create table if not exists public.corpus_qa_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_asset_id uuid references public.content_assets(id) on delete set null,
  question text not null,
  asset_tags text[] not null default '{}',
  routed_destination_type text,
  routed_destination_address text,
  status text not null default 'routed' check (status in ('routed', 'answered', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.release_courses enable row level security;
alter table public.corpus_asset_feedback enable row level security;
alter table public.corpus_routing_rules enable row level security;
alter table public.corpus_qa_inquiries enable row level security;

create policy "release_courses_select_authenticated"
on public.release_courses for select to authenticated using (true);

create policy "release_courses_manage_manager_admin"
on public.release_courses for all to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director', 'admin'))
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director', 'admin'))
);

create policy "corpus_feedback_select_own_or_admin"
on public.corpus_asset_feedback for select to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director', 'admin'))
);

create policy "corpus_feedback_insert_own"
on public.corpus_asset_feedback for insert to authenticated
with check (user_id = auth.uid());

create policy "corpus_feedback_update_admin"
on public.corpus_asset_feedback for update to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director', 'admin')));

create policy "corpus_routing_select_manager_admin"
on public.corpus_routing_rules for select to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director', 'admin')));

create policy "corpus_routing_manage_admin"
on public.corpus_routing_rules for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'director')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'director')));

create policy "corpus_qa_select_own_or_manager"
on public.corpus_qa_inquiries for select to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director', 'admin'))
);

create policy "corpus_qa_insert_own"
on public.corpus_qa_inquiries for insert to authenticated
with check (user_id = auth.uid());

-- 120-day Accelerated Mastery: four 30-day segment templates
insert into public.onboarding_plans (name, description, is_template, created_by)
select v.name, v.description, true, null
from (values
  (
    '120-Day Mastery — Days 1–30 (Foundation)',
    'Segment 1: ISC foundations, core docs, and first simulation gate.'
  ),
  (
    '120-Day Mastery — Days 31–60 (Field Ready)',
    'Segment 2: Workflows, deal prep, and customer-call simulator gate.'
  ),
  (
    '120-Day Mastery — Days 61–90 (Advanced)',
    'Segment 3: Agentic/AIS depth, competitive battlecards, pitch gate.'
  ),
  (
    '120-Day Mastery — Days 91–120 (Advisory)',
    'Segment 4: Executive demos, certifications, and advisory readiness gate.'
  )
) as v(name, description)
where not exists (
  select 1 from public.onboarding_plans where name like '120-Day Mastery%' limit 1
);

insert into public.plan_steps (plan_id, title, description, step_type, sort_order, content_url, metadata)
select p.id, v.title, v.description, v.step_type::public.plan_step_type, v.sort_order, v.content_url,
  jsonb_build_object('dueOffsetDays', v.due_offset, 'segmentIndex', v.segment_index, 'isSegmentGate', v.is_gate)
from public.onboarding_plans p
join (values
  ('120-Day Mastery — Days 1–30 (Foundation)', 'Review ISC platform overview', 'Read Identity Security Cloud positioning and core modules.', 'content_review', 1, 'https://www.sailpoint.com/products/identity-security-cloud', 7, 1, false),
  ('120-Day Mastery — Days 1–30 (Foundation)', 'Provisioning fundamentals', 'Study provisioning and lifecycle documentation.', 'content_review', 2, 'https://documentation.sailpoint.com/saas/help/provisioning/provisioning.html', 14, 1, false),
  ('120-Day Mastery — Days 1–30 (Foundation)', 'First simulation gate', 'Complete a foundational customer discovery simulation.', 'simulation', 3, null, 28, 1, true),
  ('120-Day Mastery — Days 31–60 (Field Ready)', 'Workflows deep dive', 'ISC workflows for joiner/mover/leaver automation.', 'content_review', 1, 'https://documentation.sailpoint.com/saas/help/workflows/index.html', 35, 2, false),
  ('120-Day Mastery — Days 31–60 (Field Ready)', 'Deal prep practice', 'Run deal prep for a practice account.', 'deal_prep', 2, null, 45, 2, false),
  ('120-Day Mastery — Days 31–60 (Field Ready)', 'Customer call simulator gate', 'Pass manager-reviewed simulation with score ≥ 75.', 'simulation', 3, null, 60, 2, true),
  ('120-Day Mastery — Days 61–90 (Advanced)', 'Agentic Fabric & AIS', 'Study AIS and Agentic Fabric positioning.', 'content_review', 1, 'https://www.sailpoint.com/products/agent-identity-security', 67, 3, false),
  ('120-Day Mastery — Days 61–90 (Advanced)', 'Agentic challenge', 'Complete an Agentic Fabric challenge from the library.', 'challenge', 2, null, 75, 3, false),
  ('120-Day Mastery — Days 61–90 (Advanced)', 'Elevator pitch gate', 'Record AIS positioning pitch for manager review.', 'mentor_review', 3, null, 90, 3, true),
  ('120-Day Mastery — Days 91–120 (Advisory)', 'Executive demo prep', 'Review executive demo certification criteria.', 'content_review', 1, 'https://www.sailpoint.com/solutions/zero-trust', 97, 4, false),
  ('120-Day Mastery — Days 91–120 (Advisory)', 'Competitive bake-off prep', 'Complete competitive positioning challenge.', 'challenge', 2, null, 105, 4, false),
  ('120-Day Mastery — Days 91–120 (Advisory)', 'Advisory readiness gate', 'Submit executive demo cert evidence for approval.', 'mentor_review', 3, null, 120, 4, true)
) as v(plan_name, title, description, step_type, sort_order, content_url, due_offset, segment_index, is_gate)
  on p.name = v.plan_name
where not exists (select 1 from public.plan_steps ps where ps.plan_id = p.id);
