create table if not exists public.plan_holidays (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  holiday_date date not null,
  label text not null default 'Blocked day',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenant_id, holiday_date)
);

create index if not exists plan_holidays_tenant_date_idx
  on public.plan_holidays (tenant_id, holiday_date);

alter table public.plan_holidays enable row level security;

create policy "plan_holidays_select_tenant"
  on public.plan_holidays for select
  using (
    tenant_id = coalesce(
      (select tenant_id from public.profiles where id = auth.uid()),
      tenant_id
    )
  );

create policy "plan_holidays_manager_insert"
  on public.plan_holidays for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.tenant_id = plan_holidays.tenant_id
        and p.role in ('manager', 'director', 'admin', 'super_admin', 'mentor')
    )
  );

create policy "plan_holidays_manager_delete"
  on public.plan_holidays for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.tenant_id = plan_holidays.tenant_id
        and p.role in ('manager', 'director', 'admin', 'super_admin')
    )
  );

comment on table public.plan_holidays is 'Tenant non-working days shown on the plan calendar.';
