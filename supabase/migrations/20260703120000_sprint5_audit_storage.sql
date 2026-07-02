-- Sprint 5: audit logs, storage bucket, director admin parity, plan progress helper

-- Align DB is_admin with app RBAC (admin + director)
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
      and p.role in ('admin', 'director')
  );
$$;

-- Immutable admin audit trail (separate from user-facing activity_logs)
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index audit_logs_action_idx on public.audit_logs(action);
create index audit_logs_actor_id_idx on public.audit_logs(actor_id);

alter table public.audit_logs enable row level security;

create policy "audit_logs_select_admin"
on public.audit_logs for select
to authenticated
using (public.is_admin());

create or replace function public.insert_audit_log(
  p_action text,
  p_target_type text,
  p_target_id text default null,
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  insert into public.audit_logs (actor_id, action, target_type, target_id, details)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_details)
  returning id into new_id;
  return new_id;
end;
$$;

grant execute on function public.insert_audit_log(text, text, text, jsonb) to authenticated;

-- Evidence uploads bucket (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence',
  'evidence',
  false,
  52428800,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'text/plain', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
)
on conflict (id) do nothing;

create policy "evidence_upload_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "evidence_select_authorized"
on storage.objects for select
to authenticated
using (
  bucket_id = 'evidence'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.can_access_profile(((storage.foldername(name))[1])::uuid)
    or public.is_admin()
  )
);

create policy "evidence_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'evidence'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Recalculate plan assignment progress from step statuses
create or replace function public.recalculate_plan_progress(p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_steps integer;
  completed_steps integer;
  new_progress numeric(5,2);
  new_status public.assignment_status;
begin
  select count(*) into total_steps
  from public.plan_assignment_steps
  where assignment_id = p_assignment_id;

  if total_steps = 0 then
    return;
  end if;

  select count(*) into completed_steps
  from public.plan_assignment_steps
  where assignment_id = p_assignment_id
    and status in ('completed', 'reviewed');

  new_progress := round((completed_steps::numeric / total_steps::numeric) * 100, 2);

  if completed_steps = total_steps then
    new_status := 'completed';
  elsif completed_steps > 0 then
    new_status := 'in_progress';
  else
    new_status := 'not_started';
  end if;

  update public.plan_assignments
  set progress_percent = new_progress,
      status = new_status
  where id = p_assignment_id;
end;
$$;

grant execute on function public.recalculate_plan_progress(uuid) to authenticated;

-- MFA restrictive policy for audit_logs
create policy "require_mfa_aal2_audit_logs"
on public.audit_logs
as restrictive
for all
to authenticated
using (public.require_aal2())
with check (public.require_aal2());
