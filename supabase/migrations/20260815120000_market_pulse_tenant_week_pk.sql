-- Scope market pulse weeks per tenant (week_id alone was globally unique).

update public.market_pulse_weeks
set tenant_id = '00000000-0000-4000-8000-000000000001'::uuid
where tenant_id is null;

update public.market_pulse_results mpr
set tenant_id = p.tenant_id
from public.profiles p
where p.id = mpr.user_id and mpr.tenant_id is null;

update public.market_pulse_results
set tenant_id = '00000000-0000-4000-8000-000000000001'::uuid
where tenant_id is null;

alter table public.market_pulse_weeks
  alter column tenant_id set not null;

alter table public.market_pulse_results
  alter column tenant_id set not null;

alter table public.market_pulse_results
  drop constraint if exists market_pulse_results_week_id_fkey;

alter table public.market_pulse_weeks
  drop constraint if exists market_pulse_weeks_pkey;

alter table public.market_pulse_weeks
  add constraint market_pulse_weeks_pkey primary key (tenant_id, week_id);

alter table public.market_pulse_results
  add constraint market_pulse_results_week_fkey
  foreign key (tenant_id, week_id)
  references public.market_pulse_weeks (tenant_id, week_id)
  on delete cascade;

drop policy if exists "market_pulse_weeks_admin_insert" on public.market_pulse_weeks;
drop policy if exists "market_pulse_weeks_admin_upsert" on public.market_pulse_weeks;

create policy "market_pulse_weeks_manager_write"
on public.market_pulse_weeks for insert
to authenticated
with check (
  public.can_access_tenant_row(tenant_id)
  and (
    public.is_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('manager', 'mentor', 'director', 'admin')
    )
  )
);

create policy "market_pulse_weeks_manager_update"
on public.market_pulse_weeks for update
to authenticated
using (public.can_access_tenant_row(tenant_id))
with check (public.can_access_tenant_row(tenant_id));
