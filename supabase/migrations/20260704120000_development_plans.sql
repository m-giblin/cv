-- Sprint 6: Annual development plans, quarterly goal reviews, competency linkage

create type public.goal_status as enum ('not_started', 'on_track', 'at_risk', 'achieved');

create table public.development_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  manager_id uuid references public.profiles(id) on delete set null,
  year integer not null check (year >= 2020 and year <= 2100),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, year)
);

create index development_plans_user_id_idx on public.development_plans(user_id);
create index development_plans_manager_id_idx on public.development_plans(manager_id);
create index development_plans_year_idx on public.development_plans(year);

create table public.development_goals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.development_plans(id) on delete cascade,
  competency_id uuid references public.competencies(id) on delete set null,
  title text not null,
  description text,
  evidence_type text not null default 'other' check (
    evidence_type in ('demo_recording', 'customer_reference', 'certification', 'deal_support', 'shadow_notes', 'other')
  ),
  sort_order integer not null default 1,
  overall_status public.goal_status not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index development_goals_plan_id_idx on public.development_goals(plan_id);
create index development_goals_competency_id_idx on public.development_goals(competency_id);

create table public.goal_quarterly_reviews (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.development_goals(id) on delete cascade,
  quarter text not null check (quarter in ('Q1', 'Q2', 'Q3', 'Q4')),
  year integer not null,
  due_date date not null,
  status public.goal_status not null default 'not_started',
  se_evidence text,
  se_evidence_url text,
  manager_comments text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(goal_id, quarter, year)
);

create index goal_quarterly_reviews_goal_id_idx on public.goal_quarterly_reviews(goal_id);
create index goal_quarterly_reviews_due_date_idx on public.goal_quarterly_reviews(due_date);
create index goal_quarterly_reviews_status_idx on public.goal_quarterly_reviews(status);

create trigger set_development_plans_updated_at
  before update on public.development_plans
  for each row execute function public.set_updated_at();

create trigger set_development_goals_updated_at
  before update on public.development_goals
  for each row execute function public.set_updated_at();

create trigger set_goal_quarterly_reviews_updated_at
  before update on public.goal_quarterly_reviews
  for each row execute function public.set_updated_at();

alter table public.development_plans enable row level security;
alter table public.development_goals enable row level security;
alter table public.goal_quarterly_reviews enable row level security;

-- Development plans: SE owns, manager/admin in org can access
create policy "development_plans_select"
on public.development_plans for select to authenticated
using (
  user_id = auth.uid()
  or manager_id = auth.uid()
  or public.can_access_profile(user_id)
  or public.is_admin()
);

create policy "development_plans_insert"
on public.development_plans for insert to authenticated
with check (
  public.can_access_profile(user_id)
  or user_id = auth.uid()
  or public.is_admin()
);

create policy "development_plans_update"
on public.development_plans for update to authenticated
using (
  user_id = auth.uid()
  or manager_id = auth.uid()
  or public.can_access_profile(user_id)
  or public.is_admin()
)
with check (
  user_id = auth.uid()
  or manager_id = auth.uid()
  or public.can_access_profile(user_id)
  or public.is_admin()
);

create policy "development_goals_select"
on public.development_goals for select to authenticated
using (
  exists (
    select 1 from public.development_plans dp
    where dp.id = development_goals.plan_id
      and (
        dp.user_id = auth.uid()
        or dp.manager_id = auth.uid()
        or public.can_access_profile(dp.user_id)
        or public.is_admin()
      )
  )
);

create policy "development_goals_all_managers"
on public.development_goals for all to authenticated
using (
  exists (
    select 1 from public.development_plans dp
    where dp.id = development_goals.plan_id
      and (
        dp.user_id = auth.uid()
        or dp.manager_id = auth.uid()
        or public.can_access_profile(dp.user_id)
        or public.is_admin()
      )
  )
)
with check (
  exists (
    select 1 from public.development_plans dp
    where dp.id = development_goals.plan_id
      and (
        dp.user_id = auth.uid()
        or dp.manager_id = auth.uid()
        or public.can_access_profile(dp.user_id)
        or public.is_admin()
      )
  )
);

create policy "goal_reviews_select"
on public.goal_quarterly_reviews for select to authenticated
using (
  exists (
    select 1 from public.development_goals dg
    join public.development_plans dp on dp.id = dg.plan_id
    where dg.id = goal_quarterly_reviews.goal_id
      and (
        dp.user_id = auth.uid()
        or dp.manager_id = auth.uid()
        or public.can_access_profile(dp.user_id)
        or public.is_admin()
      )
  )
);

create policy "goal_reviews_all_authorized"
on public.goal_quarterly_reviews for all to authenticated
using (
  exists (
    select 1 from public.development_goals dg
    join public.development_plans dp on dp.id = dg.plan_id
    where dg.id = goal_quarterly_reviews.goal_id
      and (
        dp.user_id = auth.uid()
        or dp.manager_id = auth.uid()
        or public.can_access_profile(dp.user_id)
        or public.is_admin()
      )
  )
)
with check (
  exists (
    select 1 from public.development_goals dg
    join public.development_plans dp on dp.id = dg.plan_id
    where dg.id = goal_quarterly_reviews.goal_id
      and (
        dp.user_id = auth.uid()
        or dp.manager_id = auth.uid()
        or public.can_access_profile(dp.user_id)
        or public.is_admin()
      )
  )
);

create policy "require_mfa_aal2_development_plans"
on public.development_plans as restrictive for all to authenticated
using (public.require_aal2()) with check (public.require_aal2());

create policy "require_mfa_aal2_development_goals"
on public.development_goals as restrictive for all to authenticated
using (public.require_aal2()) with check (public.require_aal2());

create policy "require_mfa_aal2_goal_quarterly_reviews"
on public.goal_quarterly_reviews as restrictive for all to authenticated
using (public.require_aal2()) with check (public.require_aal2());

-- Quarterly due dates for a plan year
create or replace function public.quarter_due_date(p_year integer, p_quarter text)
returns date
language sql immutable
as $$
  select case p_quarter
    when 'Q1' then make_date(p_year, 3, 31)
    when 'Q2' then make_date(p_year, 6, 30)
    when 'Q3' then make_date(p_year, 9, 30)
    when 'Q4' then make_date(p_year, 12, 31)
  end;
$$;
