-- Market-best enablement: corpus health, programs, release bundles, certs, SME answers, prerequisites

alter table public.content_assets
  add column if not exists version integer not null default 1,
  add column if not exists superseded_by uuid references public.content_assets(id) on delete set null,
  add column if not exists last_verified_at timestamptz,
  add column if not exists health_status text not null default 'active'
    check (health_status in ('active', 'stale', 'deprecated', 'broken'));

alter table public.release_courses
  add column if not exists lab_mode text,
  add column if not exists pitch_topic text,
  add column if not exists corpus_tag_filters text[] not null default '{}',
  add column if not exists slack_announce_channel text;

alter table public.plan_assignments
  add column if not exists program_id uuid;

alter table public.readiness_certifications
  add column if not exists expires_at timestamptz;

create table if not exists public.enablement_programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  segment_count smallint not null default 4 check (segment_count between 1 and 6),
  cert_valid_months smallint not null default 12,
  created_at timestamptz not null default now()
);

create table if not exists public.enablement_program_segments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.enablement_programs(id) on delete cascade,
  segment_index smallint not null check (segment_index >= 1),
  plan_id uuid not null references public.onboarding_plans(id) on delete cascade,
  unique (program_id, segment_index)
);

create table if not exists public.segment_certificates (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.plan_assignments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_id uuid references public.enablement_programs(id) on delete set null,
  segment_index smallint not null,
  certificate_code text not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (assignment_id, segment_index)
);

create table if not exists public.segment_unlock_overrides (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.plan_assignments(id) on delete cascade,
  unlocked_segment_max smallint not null check (unlocked_segment_max between 1 and 6),
  reason text not null,
  overridden_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.plan_step_prerequisites (
  id uuid primary key default gen_random_uuid(),
  plan_step_id uuid not null references public.plan_steps(id) on delete cascade,
  prerequisite_plan_step_id uuid not null references public.plan_steps(id) on delete cascade,
  unique (plan_step_id, prerequisite_plan_step_id)
);

create table if not exists public.corpus_sme_answers (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  content_asset_id uuid references public.content_assets(id) on delete set null,
  project_tags text[] not null default '{}',
  confidence_score numeric(4,3),
  source_feedback_id uuid references public.corpus_asset_feedback(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists corpus_sme_answers_tags_idx on public.corpus_sme_answers using gin (project_tags);

alter table public.corpus_qa_inquiries
  add column if not exists confidence_score numeric(4,3),
  add column if not exists draft_answer text,
  add column if not exists source_urls text[] not null default '{}',
  add column if not exists escalated_at timestamptz;

alter table public.corpus_asset_feedback
  add column if not exists escalated_at timestamptz;

alter table public.plan_assignments
  add constraint plan_assignments_program_id_fkey
  foreign key (program_id) references public.enablement_programs(id) on delete set null;

create index if not exists segment_certificates_user_idx on public.segment_certificates(user_id, issued_at desc);
create index if not exists plan_assignments_program_idx on public.plan_assignments(program_id);

alter table public.enablement_programs enable row level security;
alter table public.enablement_program_segments enable row level security;
alter table public.segment_certificates enable row level security;
alter table public.segment_unlock_overrides enable row level security;
alter table public.plan_step_prerequisites enable row level security;
alter table public.corpus_sme_answers enable row level security;

create policy "enablement_programs_select_auth" on public.enablement_programs for select to authenticated using (true);
create policy "enablement_program_segments_select_auth" on public.enablement_program_segments for select to authenticated using (true);
create policy "segment_certs_select_own_or_manager" on public.segment_certificates for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director', 'admin'))
  );
create policy "segment_unlock_overrides_select_manager" on public.segment_unlock_overrides for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director', 'admin')));
create policy "segment_unlock_overrides_insert_manager" on public.segment_unlock_overrides for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director', 'admin')));
create policy "plan_step_prerequisites_select_auth" on public.plan_step_prerequisites for select to authenticated using (true);
create policy "corpus_sme_answers_select_auth" on public.corpus_sme_answers for select to authenticated using (true);
create policy "corpus_sme_answers_insert_manager_admin" on public.corpus_sme_answers for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director', 'admin')));

-- 120-Day Mastery unified program
insert into public.enablement_programs (name, description, segment_count, cert_valid_months)
select '120-Day SE Mastery', 'Unified four-segment ramp: Foundation through Advisory.', 4, 12
where not exists (select 1 from public.enablement_programs where name = '120-Day SE Mastery');

insert into public.enablement_program_segments (program_id, segment_index, plan_id)
select prog.id, seg.segment_index, p.id
from public.enablement_programs prog
join public.onboarding_plans p on p.name like '120-Day Mastery%'
join lateral (
  select case
    when p.name like '%Days 1–30%' then 1
    when p.name like '%Days 31–60%' then 2
    when p.name like '%Days 61–90%' then 3
    when p.name like '%Days 91–120%' then 4
    else null
  end as segment_index
) seg on seg.segment_index is not null
where prog.name = '120-Day SE Mastery'
  and not exists (
    select 1 from public.enablement_program_segments eps where eps.program_id = prog.id
  );
