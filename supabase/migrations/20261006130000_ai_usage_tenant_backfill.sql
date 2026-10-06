-- ai_usage_logs.tenant_id was added without a default and only backfilled once, so rows logged
-- since then have no tenant and are invisible to the usage dashboards and tenant-scoped reads.
-- The app now sets tenant_id on insert (lib/ai/log-usage.ts); this recovers the earlier rows.
update public.ai_usage_logs aul
set tenant_id = p.tenant_id
from public.profiles p
where aul.tenant_id is null
  and aul.user_id = p.id
  and p.tenant_id is not null;
