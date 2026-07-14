-- Sprint 7 & 8: certifications, competency rubrics, content bucket

create type public.certification_type as enum (
  'solo_discovery',
  'executive_demo',
  'competitive_bakeoff',
  'customer_workshop',
  'advisory_readiness'
);

create type public.certification_status as enum (
  'not_started',
  'submitted',
  'approved',
  'revoked'
);

create table public.readiness_certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  certification_type public.certification_type not null,
  status public.certification_status not null default 'not_started',
  evidence_text text,
  evidence_url text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  manager_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, certification_type)
);

create index readiness_certifications_user_id_idx on public.readiness_certifications(user_id);
create index readiness_certifications_status_idx on public.readiness_certifications(status);

alter table public.competencies add column if not exists rubric jsonb not null default '[]'::jsonb;

create trigger set_readiness_certifications_updated_at
  before update on public.readiness_certifications
  for each row execute function public.set_updated_at();

alter table public.readiness_certifications enable row level security;

create policy "certifications_select"
on public.readiness_certifications for select to authenticated
using (
  user_id = auth.uid()
  or public.can_access_profile(user_id)
  or public.is_admin()
);

create policy "certifications_insert_se"
on public.readiness_certifications for insert to authenticated
with check (user_id = auth.uid() or public.can_access_profile(user_id));

create policy "certifications_update"
on public.readiness_certifications for update to authenticated
using (
  user_id = auth.uid()
  or public.can_access_profile(user_id)
  or public.is_admin()
)
with check (
  user_id = auth.uid()
  or public.can_access_profile(user_id)
  or public.is_admin()
);

create policy "require_mfa_aal2_readiness_certifications"
on public.readiness_certifications as restrictive for all to authenticated
using (public.require_aal2()) with check (public.require_aal2());

insert into storage.buckets (id, name, public, file_size_limit)
values ('content', 'content', false, 52428800)
on conflict (id) do nothing;

create policy "content_upload_admin_manager"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'content'
  and (
    public.is_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director', 'mentor'))
  )
);

create policy "content_select_authenticated"
on storage.objects for select to authenticated
using (bucket_id = 'content');
