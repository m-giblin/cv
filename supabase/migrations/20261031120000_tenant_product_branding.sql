-- Per-tenant app name in the header, page titles and emails ("SE Enablement Demo", "AE Enablement").
-- Null means the product default ("SE Enablement" / "Field readiness").
alter table public.tenants
  add column if not exists product_name text,
  add column if not exists product_tagline text;

alter table public.tenants
  drop constraint if exists tenants_product_name_length,
  add constraint tenants_product_name_length check (product_name is null or char_length(product_name) between 1 and 40),
  drop constraint if exists tenants_product_tagline_length,
  add constraint tenants_product_tagline_length check (product_tagline is null or char_length(product_tagline) between 1 and 40);

-- Competency names and knowledge-chunk URLs were unique across the whole platform, so a second
-- tenant (or a cloned one) could not hold the same competency or link. Make them unique per tenant.
alter table public.competencies drop constraint if exists competencies_name_key;
create unique index if not exists competencies_tenant_name_unique
  on public.competencies (tenant_id, name) nulls not distinct;

drop index if exists public.isc_lab_knowledge_chunks_url_unique;
create unique index if not exists isc_lab_knowledge_chunks_tenant_url_unique
  on public.isc_lab_knowledge_chunks (tenant_id, url) nulls not distinct
  where url is not null;
