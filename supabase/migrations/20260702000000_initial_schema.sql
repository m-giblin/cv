create extension if not exists "pgcrypto";

create type public.profile_role as enum (
  'basic_se',
  'senior_se',
  'advisory_solutions_consultant',
  'mentor',
  'manager',
  'director',
  'admin'
);

create type public.se_level as enum ('Basic', 'Senior', 'Advisory');

create type public.plan_step_type as enum (
  'content_review',
  'challenge',
  'simulation',
  'shadow_meeting_log',
  'mentor_review',
  'custom'
);

create type public.assignment_status as enum (
  'not_started',
  'in_progress',
  'submitted',
  'under_review',
  'reviewed',
  'completed'
);

create type public.difficulty as enum ('foundational', 'intermediate', 'advanced');
create type public.review_status as enum ('pending', 'reviewed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.profile_role not null default 'basic_se',
  level public.se_level not null default 'Basic',
  manager_id uuid references public.profiles(id) on delete set null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_manager_not_self check (manager_id is null or manager_id <> id)
);

create index profiles_manager_id_idx on public.profiles(manager_id);
create index profiles_role_idx on public.profiles(role);
create index profiles_level_idx on public.profiles(level);

create table public.competencies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.onboarding_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_template boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index onboarding_plans_created_by_idx on public.onboarding_plans(created_by);
create index onboarding_plans_is_template_idx on public.onboarding_plans(is_template);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  steps jsonb not null default '[]'::jsonb,
  success_criteria jsonb not null default '[]'::jsonb,
  linked_solutions text[] not null default '{}',
  difficulty public.difficulty not null default 'foundational',
  estimated_minutes integer not null default 45 check (estimated_minutes > 0),
  created_by uuid references public.profiles(id) on delete set null,
  is_ai_generated boolean not null default false,
  ai_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index challenges_created_by_idx on public.challenges(created_by);
create index challenges_difficulty_idx on public.challenges(difficulty);
create index challenges_linked_solutions_idx on public.challenges using gin(linked_solutions);

create table public.simulation_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  persona text not null,
  vertical text not null,
  solution_focus text not null,
  difficulty public.difficulty not null default 'foundational',
  prompt_body text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index simulation_templates_created_by_idx on public.simulation_templates(created_by);

create table public.plan_steps (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.onboarding_plans(id) on delete cascade,
  title text not null,
  description text,
  step_type public.plan_step_type not null,
  sort_order integer not null,
  content_url text,
  challenge_id uuid references public.challenges(id) on delete set null,
  simulation_template_id uuid references public.simulation_templates(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(plan_id, sort_order)
);

create index plan_steps_plan_id_idx on public.plan_steps(plan_id);
create index plan_steps_challenge_id_idx on public.plan_steps(challenge_id);
create index plan_steps_simulation_template_id_idx on public.plan_steps(simulation_template_id);

create table public.plan_assignments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.onboarding_plans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  mentor_id uuid references public.profiles(id) on delete set null,
  assigned_by uuid references public.profiles(id) on delete set null,
  start_date date not null default current_date,
  target_completion date,
  status public.assignment_status not null default 'not_started',
  progress_percent numeric(5,2) not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index plan_assignments_plan_id_idx on public.plan_assignments(plan_id);
create index plan_assignments_user_id_idx on public.plan_assignments(user_id);
create index plan_assignments_mentor_id_idx on public.plan_assignments(mentor_id);
create index plan_assignments_assigned_by_idx on public.plan_assignments(assigned_by);
create index plan_assignments_status_idx on public.plan_assignments(status);

create table public.plan_assignment_steps (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.plan_assignments(id) on delete cascade,
  plan_step_id uuid not null references public.plan_steps(id) on delete cascade,
  status public.assignment_status not null default 'not_started',
  due_date date,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(assignment_id, plan_step_id)
);

create index plan_assignment_steps_assignment_id_idx on public.plan_assignment_steps(assignment_id);
create index plan_assignment_steps_status_idx on public.plan_assignment_steps(status);

create table public.challenge_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  status public.assignment_status not null default 'not_started',
  evidence_files text[] not null default '{}',
  reflection_text text,
  manager_grade integer check (manager_grade between 1 and 5),
  manager_feedback text,
  ai_suggested_score integer check (ai_suggested_score between 0 and 100),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index challenge_submissions_user_id_idx on public.challenge_submissions(user_id);
create index challenge_submissions_challenge_id_idx on public.challenge_submissions(challenge_id);
create index challenge_submissions_status_idx on public.challenge_submissions(status);

create table public.simulation_assignments (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.simulation_templates(id) on delete set null,
  assigned_to uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  persona text not null,
  vertical text not null,
  solution_focus text not null,
  difficulty public.difficulty not null default 'foundational',
  status public.assignment_status not null default 'not_started',
  session_data jsonb not null default '{}'::jsonb,
  transcript jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index simulation_assignments_template_id_idx on public.simulation_assignments(template_id);
create index simulation_assignments_assigned_to_idx on public.simulation_assignments(assigned_to);
create index simulation_assignments_assigned_by_idx on public.simulation_assignments(assigned_by);
create index simulation_assignments_status_idx on public.simulation_assignments(status);

create table public.coaching_cards (
  id uuid primary key default gen_random_uuid(),
  simulation_assignment_id uuid references public.simulation_assignments(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  structured_output jsonb not null,
  se_reflection text,
  manager_review_status public.review_status not null default 'pending',
  manager_comments text,
  manager_grade integer check (manager_grade between 1 and 5),
  sent_to_manager_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index coaching_cards_simulation_assignment_id_idx on public.coaching_cards(simulation_assignment_id);
create index coaching_cards_user_id_idx on public.coaching_cards(user_id);
create index coaching_cards_manager_review_status_idx on public.coaching_cards(manager_review_status);
create index coaching_cards_structured_output_idx on public.coaching_cards using gin(structured_output);

create table public.challenge_competencies (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  competency_id uuid not null references public.competencies(id) on delete cascade,
  primary key (challenge_id, competency_id)
);

create table public.coaching_card_competencies (
  coaching_card_id uuid not null references public.coaching_cards(id) on delete cascade,
  competency_id uuid not null references public.competencies(id) on delete cascade,
  primary key (coaching_card_id, competency_id)
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  title text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_logs_user_id_created_at_idx on public.activity_logs(user_id, created_at desc);
create index activity_logs_event_type_idx on public.activity_logs(event_type);
create index activity_logs_metadata_idx on public.activity_logs using gin(metadata);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_created_at_idx on public.notifications(user_id, created_at desc);
create index notifications_unread_idx on public.notifications(user_id) where read_at is null;

create table public.content_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  storage_path text not null,
  content_type text,
  linked_solutions text[] not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index content_assets_created_by_idx on public.content_assets(created_by);
create index content_assets_linked_solutions_idx on public.content_assets using gin(linked_solutions);

create table public.ai_provider_configs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text not null,
  api_key_secret_name text not null,
  is_active boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index ai_provider_configs_one_active_idx on public.ai_provider_configs(is_active) where is_active;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_onboarding_plans_updated_at before update on public.onboarding_plans for each row execute function public.set_updated_at();
create trigger set_challenges_updated_at before update on public.challenges for each row execute function public.set_updated_at();
create trigger set_simulation_templates_updated_at before update on public.simulation_templates for each row execute function public.set_updated_at();
create trigger set_plan_assignments_updated_at before update on public.plan_assignments for each row execute function public.set_updated_at();
create trigger set_plan_assignment_steps_updated_at before update on public.plan_assignment_steps for each row execute function public.set_updated_at();
create trigger set_challenge_submissions_updated_at before update on public.challenge_submissions for each row execute function public.set_updated_at();
create trigger set_simulation_assignments_updated_at before update on public.simulation_assignments for each row execute function public.set_updated_at();
create trigger set_coaching_cards_updated_at before update on public.coaching_cards for each row execute function public.set_updated_at();
create trigger set_content_assets_updated_at before update on public.content_assets for each row execute function public.set_updated_at();
create trigger set_ai_provider_configs_updated_at before update on public.ai_provider_configs for each row execute function public.set_updated_at();

create or replace function public.get_profile_subtree(root_profile_id uuid)
returns table(id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with recursive org_tree as (
    select p.id
    from public.profiles p
    where p.manager_id = root_profile_id

    union all

    select child.id
    from public.profiles child
    join org_tree parent on child.manager_id = parent.id
  )
  select org_tree.id from org_tree;
$$;

create or replace function public.is_admin(check_profile_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = check_profile_id
      and p.role = 'admin'
  );
$$;

create or replace function public.can_access_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() = target_profile_id
    or public.is_admin(auth.uid())
    or exists (
      select 1
      from public.get_profile_subtree(auth.uid()) visible
      where visible.id = target_profile_id
    );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.log_challenge_submission_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.status in ('submitted', 'under_review', 'reviewed') then
    insert into public.activity_logs (user_id, actor_id, event_type, title, metadata)
    values (
      new.user_id,
      auth.uid(),
      'challenge_submitted',
      'Challenge submitted for review',
      jsonb_build_object('challenge_id', new.challenge_id, 'submission_id', new.id, 'status', new.status)
    );
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'reviewed' then
    insert into public.activity_logs (user_id, actor_id, event_type, title, metadata)
    values (
      new.user_id,
      auth.uid(),
      'manager_feedback_received',
      'Manager reviewed challenge submission',
      jsonb_build_object('challenge_id', new.challenge_id, 'submission_id', new.id, 'grade', new.manager_grade)
    );
  end if;

  return new;
end;
$$;

create trigger challenge_submission_activity
  after insert or update on public.challenge_submissions
  for each row execute function public.log_challenge_submission_activity();

create or replace function public.log_coaching_card_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity_logs (user_id, actor_id, event_type, title, metadata)
    values (
      new.user_id,
      auth.uid(),
      'simulation_completed',
      'Simulation coaching card created',
      jsonb_build_object('coaching_card_id', new.id, 'simulation_assignment_id', new.simulation_assignment_id)
    );
  elsif tg_op = 'UPDATE' and old.manager_review_status is distinct from new.manager_review_status and new.manager_review_status = 'reviewed' then
    insert into public.activity_logs (user_id, actor_id, event_type, title, metadata)
    values (
      new.user_id,
      auth.uid(),
      'coaching_card_reviewed',
      'Manager reviewed simulation coaching card',
      jsonb_build_object('coaching_card_id', new.id, 'grade', new.manager_grade)
    );
  end if;

  return new;
end;
$$;

create trigger coaching_card_activity
  after insert or update on public.coaching_cards
  for each row execute function public.log_coaching_card_activity();

alter table public.profiles enable row level security;
alter table public.competencies enable row level security;
alter table public.onboarding_plans enable row level security;
alter table public.plan_steps enable row level security;
alter table public.plan_assignments enable row level security;
alter table public.plan_assignment_steps enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_submissions enable row level security;
alter table public.simulation_templates enable row level security;
alter table public.simulation_assignments enable row level security;
alter table public.coaching_cards enable row level security;
alter table public.challenge_competencies enable row level security;
alter table public.coaching_card_competencies enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.content_assets enable row level security;
alter table public.ai_provider_configs enable row level security;

create policy "profiles_select_authorized_org"
on public.profiles for select
to authenticated
using (public.can_access_profile(id));

create policy "profiles_update_self_or_admin"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "profiles_insert_admin"
on public.profiles for insert
to authenticated
with check (public.is_admin());

create policy "competencies_select_authenticated"
on public.competencies for select
to authenticated
using (true);

create policy "competencies_manage_admin"
on public.competencies for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "onboarding_plans_select_visible"
on public.onboarding_plans for select
to authenticated
using (
  is_template
  or created_by = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.plan_assignments pa
    where pa.plan_id = onboarding_plans.id
      and public.can_access_profile(pa.user_id)
  )
);

create policy "onboarding_plans_manage_managers"
on public.onboarding_plans for all
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('manager', 'director')
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('manager', 'director')
  )
);

create policy "plan_steps_select_visible"
on public.plan_steps for select
to authenticated
using (
  exists (
    select 1 from public.onboarding_plans op
    where op.id = plan_steps.plan_id
      and (
        op.is_template
        or op.created_by = auth.uid()
        or public.is_admin()
        or exists (
          select 1 from public.plan_assignments pa
          where pa.plan_id = op.id
            and public.can_access_profile(pa.user_id)
        )
      )
  )
);

create policy "plan_steps_manage_plan_managers"
on public.plan_steps for all
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.onboarding_plans op
    join public.profiles p on p.id = auth.uid()
    where op.id = plan_steps.plan_id
      and p.role in ('manager', 'director')
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.onboarding_plans op
    join public.profiles p on p.id = auth.uid()
    where op.id = plan_steps.plan_id
      and p.role in ('manager', 'director')
  )
);

create policy "plan_assignments_select_authorized"
on public.plan_assignments for select
to authenticated
using (
  public.can_access_profile(user_id)
  or mentor_id = auth.uid()
  or assigned_by = auth.uid()
);

create policy "plan_assignments_insert_managers"
on public.plan_assignments for insert
to authenticated
with check (
  public.is_admin()
  or public.can_access_profile(user_id)
);

create policy "plan_assignments_update_authorized"
on public.plan_assignments for update
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
  or mentor_id = auth.uid()
  or public.can_access_profile(user_id)
)
with check (
  public.is_admin()
  or user_id = auth.uid()
  or mentor_id = auth.uid()
  or public.can_access_profile(user_id)
);

create policy "plan_assignment_steps_select_authorized"
on public.plan_assignment_steps for select
to authenticated
using (
  exists (
    select 1 from public.plan_assignments pa
    where pa.id = plan_assignment_steps.assignment_id
      and (public.can_access_profile(pa.user_id) or pa.mentor_id = auth.uid())
  )
);

create policy "plan_assignment_steps_update_authorized"
on public.plan_assignment_steps for update
to authenticated
using (
  exists (
    select 1 from public.plan_assignments pa
    where pa.id = plan_assignment_steps.assignment_id
      and (public.can_access_profile(pa.user_id) or pa.mentor_id = auth.uid())
  )
)
with check (
  exists (
    select 1 from public.plan_assignments pa
    where pa.id = plan_assignment_steps.assignment_id
      and (public.can_access_profile(pa.user_id) or pa.mentor_id = auth.uid())
  )
);

create policy "plan_assignment_steps_insert_managers"
on public.plan_assignment_steps for insert
to authenticated
with check (
  exists (
    select 1 from public.plan_assignments pa
    where pa.id = plan_assignment_steps.assignment_id
      and public.can_access_profile(pa.user_id)
  )
);

create policy "challenges_select_authenticated"
on public.challenges for select
to authenticated
using (true);

create policy "challenges_create_authenticated"
on public.challenges for insert
to authenticated
with check (created_by = auth.uid() or public.is_admin());

create policy "challenges_update_owner_manager_admin"
on public.challenges for update
to authenticated
using (
  created_by = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('manager', 'director')
  )
)
with check (
  created_by = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('manager', 'director')
  )
);

create policy "challenge_submissions_select_authorized"
on public.challenge_submissions for select
to authenticated
using (public.can_access_profile(user_id));

create policy "challenge_submissions_insert_self_or_manager"
on public.challenge_submissions for insert
to authenticated
with check (user_id = auth.uid() or public.can_access_profile(user_id));

create policy "challenge_submissions_update_self_or_manager"
on public.challenge_submissions for update
to authenticated
using (user_id = auth.uid() or public.can_access_profile(user_id))
with check (user_id = auth.uid() or public.can_access_profile(user_id));

create policy "simulation_templates_select_authenticated"
on public.simulation_templates for select
to authenticated
using (true);

create policy "simulation_templates_manage_admin_manager"
on public.simulation_templates for all
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('manager', 'director')
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('manager', 'director')
  )
);

create policy "simulation_assignments_select_authorized"
on public.simulation_assignments for select
to authenticated
using (public.can_access_profile(assigned_to) or assigned_by = auth.uid());

create policy "simulation_assignments_insert_manager"
on public.simulation_assignments for insert
to authenticated
with check (public.can_access_profile(assigned_to));

create policy "simulation_assignments_update_authorized"
on public.simulation_assignments for update
to authenticated
using (public.can_access_profile(assigned_to) or assigned_by = auth.uid())
with check (public.can_access_profile(assigned_to) or assigned_by = auth.uid());

create policy "coaching_cards_select_authorized"
on public.coaching_cards for select
to authenticated
using (public.can_access_profile(user_id));

create policy "coaching_cards_insert_self_or_manager"
on public.coaching_cards for insert
to authenticated
with check (user_id = auth.uid() or public.can_access_profile(user_id));

create policy "coaching_cards_update_self_or_manager"
on public.coaching_cards for update
to authenticated
using (user_id = auth.uid() or public.can_access_profile(user_id))
with check (user_id = auth.uid() or public.can_access_profile(user_id));

create policy "challenge_competencies_select_authenticated"
on public.challenge_competencies for select
to authenticated
using (true);

create policy "challenge_competencies_manage_admin_manager"
on public.challenge_competencies for all
to authenticated
using (public.is_admin() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director')))
with check (public.is_admin() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director')));

create policy "coaching_card_competencies_select_authorized"
on public.coaching_card_competencies for select
to authenticated
using (
  exists (
    select 1 from public.coaching_cards cc
    where cc.id = coaching_card_competencies.coaching_card_id
      and public.can_access_profile(cc.user_id)
  )
);

create policy "coaching_card_competencies_manage_authorized"
on public.coaching_card_competencies for all
to authenticated
using (
  exists (
    select 1 from public.coaching_cards cc
    where cc.id = coaching_card_competencies.coaching_card_id
      and public.can_access_profile(cc.user_id)
  )
)
with check (
  exists (
    select 1 from public.coaching_cards cc
    where cc.id = coaching_card_competencies.coaching_card_id
      and public.can_access_profile(cc.user_id)
  )
);

create policy "activity_logs_select_authorized"
on public.activity_logs for select
to authenticated
using (public.can_access_profile(user_id));

create policy "activity_logs_insert_authorized"
on public.activity_logs for insert
to authenticated
with check (actor_id = auth.uid() or public.can_access_profile(user_id));

create policy "notifications_select_own"
on public.notifications for select
to authenticated
using (user_id = auth.uid());

create policy "notifications_update_own"
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "notifications_insert_manager_or_admin"
on public.notifications for insert
to authenticated
with check (public.can_access_profile(user_id) or public.is_admin());

create policy "content_assets_select_authenticated"
on public.content_assets for select
to authenticated
using (true);

create policy "content_assets_manage_admin_manager"
on public.content_assets for all
to authenticated
using (
  public.is_admin()
  or created_by = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director'))
)
with check (
  public.is_admin()
  or created_by = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director'))
);

create policy "ai_provider_configs_select_admin"
on public.ai_provider_configs for select
to authenticated
using (public.is_admin());

create policy "ai_provider_configs_manage_admin"
on public.ai_provider_configs for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.competencies (name, category, description)
values
  ('ISC Workflows and Forms', 'Platform', 'Maps business process automation to Identity Security Cloud workflows, forms, and transforms.'),
  ('SLED Vertical Knowledge', 'Vertical', 'Understands public-sector lifecycle, compliance, procurement, and identity modernization drivers.'),
  ('Executive Demo Storytelling', 'Demo Skills', 'Frames demos around customer outcomes instead of feature tours.'),
  ('Objection Handling - Shadow AI', 'Discovery', 'Handles AI governance, SaaS sprawl, and privileged access risk objections.'),
  ('Entra ID / AD Connectors', 'Technical', 'Explains authoritative sources, aggregations, provisioning, and connector limits accurately.')
on conflict (name) do nothing;
