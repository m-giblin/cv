-- Security hardening: several tables had tenant_id backfilled by the
-- multi-tenant migration but their RLS policies were never updated to
-- actually check it, leaving them scoped by role only. That means any
-- admin/manager/director in ANY tenant could read or write another
-- tenant's rows. Fixes mirror the working pattern already used for
-- competencies/challenges in 20260809120000_multi_tenant_phase2_phase3_audit.sql.

-- challenge_competencies: was `using (true)` for select, role-only for manage.
drop policy if exists "challenge_competencies_select_authenticated" on public.challenge_competencies;
create policy "challenge_competencies_select_authenticated"
on public.challenge_competencies for select
to authenticated
using (public.can_access_tenant_row(tenant_id));

drop policy if exists "challenge_competencies_manage_admin_manager" on public.challenge_competencies;
create policy "challenge_competencies_manage_admin_manager"
on public.challenge_competencies for all
to authenticated
using (
  (public.is_admin() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director')))
  and public.can_access_tenant_row(tenant_id)
)
with check (
  (public.is_admin() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director')))
  and public.can_access_tenant_row(tenant_id)
);

-- content_assets: select policy was already fixed; manage/write policy was not.
drop policy if exists "content_assets_manage_admin_manager" on public.content_assets;
create policy "content_assets_manage_admin_manager"
on public.content_assets for all
to authenticated
using (
  (
    public.is_admin()
    or created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director'))
  )
  and public.can_access_tenant_row(tenant_id)
)
with check (
  (
    public.is_admin()
    or created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director'))
  )
  and public.can_access_tenant_row(tenant_id)
);

-- ai_provider_configs: role-only on both select and manage; may hold API keys.
drop policy if exists "ai_provider_configs_select_admin" on public.ai_provider_configs;
create policy "ai_provider_configs_select_admin"
on public.ai_provider_configs for select
to authenticated
using (public.is_admin() and public.can_access_tenant_row(tenant_id));

drop policy if exists "ai_provider_configs_manage_admin" on public.ai_provider_configs;
create policy "ai_provider_configs_manage_admin"
on public.ai_provider_configs for all
to authenticated
using (public.is_admin() and public.can_access_tenant_row(tenant_id))
with check (public.is_admin() and public.can_access_tenant_row(tenant_id));

-- corpus_asset_feedback: select/update were role-only; insert stays self-scoped.
drop policy if exists "corpus_feedback_select_own_or_admin" on public.corpus_asset_feedback;
create policy "corpus_feedback_select_own_or_admin"
on public.corpus_asset_feedback for select to authenticated
using (
  (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director', 'admin')))
  and public.can_access_tenant_row(tenant_id)
);

drop policy if exists "corpus_feedback_update_admin" on public.corpus_asset_feedback;
create policy "corpus_feedback_update_admin"
on public.corpus_asset_feedback for update to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director', 'admin'))
  and public.can_access_tenant_row(tenant_id)
);

-- corpus_routing_rules: select/manage were role-only.
drop policy if exists "corpus_routing_select_manager_admin" on public.corpus_routing_rules;
create policy "corpus_routing_select_manager_admin"
on public.corpus_routing_rules for select to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director', 'admin'))
  and public.can_access_tenant_row(tenant_id)
);

drop policy if exists "corpus_routing_manage_admin" on public.corpus_routing_rules;
create policy "corpus_routing_manage_admin"
on public.corpus_routing_rules for all to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'director'))
  and public.can_access_tenant_row(tenant_id)
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'director'))
  and public.can_access_tenant_row(tenant_id)
);

-- corpus_qa_inquiries: select was role-only; insert stays self-scoped.
drop policy if exists "corpus_qa_select_own_or_manager" on public.corpus_qa_inquiries;
create policy "corpus_qa_select_own_or_manager"
on public.corpus_qa_inquiries for select to authenticated
using (
  (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director', 'admin')))
  and public.can_access_tenant_row(tenant_id)
);

-- segment_unlock_overrides: select/insert were role-only.
drop policy if exists "segment_unlock_overrides_select_manager" on public.segment_unlock_overrides;
create policy "segment_unlock_overrides_select_manager" on public.segment_unlock_overrides for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director', 'admin'))
    and public.can_access_tenant_row(tenant_id)
  );

drop policy if exists "segment_unlock_overrides_insert_manager" on public.segment_unlock_overrides;
create policy "segment_unlock_overrides_insert_manager" on public.segment_unlock_overrides for insert to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'director', 'admin'))
    and public.can_access_tenant_row(tenant_id)
  );
