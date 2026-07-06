-- ISC Lab excellence: FTS knowledge index, interaction logging, pre-call briefs

create table if not exists public.isc_lab_knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('documentation', 'developer', 'marketing', 'battlecard', 'golden_pitch', 'platform')),
  url text,
  title text not null,
  body text not null,
  tags text[] not null default '{}',
  source_fetched_at timestamptz,
  content_version text,
  created_at timestamptz not null default now(),
  search_vector tsvector
);

create or replace function public.isc_lab_knowledge_chunks_search_vector()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.body, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(new.tags, ' '), '')), 'A');
  return new;
end;
$$;

drop trigger if exists isc_lab_knowledge_chunks_search_vector_trg on public.isc_lab_knowledge_chunks;
create trigger isc_lab_knowledge_chunks_search_vector_trg
before insert or update of title, body, tags on public.isc_lab_knowledge_chunks
for each row execute function public.isc_lab_knowledge_chunks_search_vector();

create index if not exists isc_lab_knowledge_chunks_fts_idx
  on public.isc_lab_knowledge_chunks using gin (search_vector);

create index if not exists isc_lab_knowledge_chunks_kind_idx
  on public.isc_lab_knowledge_chunks (kind);

create unique index if not exists isc_lab_knowledge_chunks_url_unique
  on public.isc_lab_knowledge_chunks (url)
  where url is not null;

create table if not exists public.isc_lab_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('chat', 'account_prep', 'voice_objection', 'battlecard', 'pre_call_brief')),
  query text not null,
  account_name text,
  reply_preview text,
  sources jsonb not null default '[]'::jsonb,
  model text,
  provider text,
  recommended_challenge_id text,
  recommended_cert_type text,
  saved_to_prep_session_id uuid references public.deal_prep_sessions(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists isc_lab_interactions_user_idx on public.isc_lab_interactions (user_id, created_at desc);
create index if not exists isc_lab_interactions_manager_idx on public.isc_lab_interactions (created_at desc);

create table if not exists public.isc_lab_precall_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  deal_prep_session_id uuid references public.deal_prep_sessions(id) on delete set null,
  account_name text not null,
  meeting_date date,
  brief_markdown text not null,
  sources jsonb not null default '[]'::jsonb,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists isc_lab_precall_briefs_user_meeting_idx
  on public.isc_lab_precall_briefs (user_id, meeting_date);

alter table public.isc_lab_knowledge_chunks enable row level security;
alter table public.isc_lab_interactions enable row level security;
alter table public.isc_lab_precall_briefs enable row level security;

create policy "isc_lab_knowledge_chunks_select_authenticated"
on public.isc_lab_knowledge_chunks for select to authenticated using (true);

create policy "isc_lab_interactions_select_own_or_manager"
on public.isc_lab_interactions for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = isc_lab_interactions.user_id and p.manager_id = auth.uid()
  )
);

create policy "isc_lab_interactions_insert_own"
on public.isc_lab_interactions for insert to authenticated
with check (user_id = auth.uid());

create policy "isc_lab_precall_briefs_select_own_or_manager"
on public.isc_lab_precall_briefs for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = isc_lab_precall_briefs.user_id and p.manager_id = auth.uid()
  )
);

create policy "isc_lab_precall_briefs_insert_own"
on public.isc_lab_precall_briefs for insert to authenticated
with check (user_id = auth.uid());

create or replace function public.search_isc_lab_chunks(search_query text, result_limit int default 8)
returns table (
  id uuid,
  kind text,
  url text,
  title text,
  body text,
  tags text[],
  rank real,
  source_fetched_at timestamptz,
  content_version text
)
language sql
stable
as $$
  select
    c.id,
    c.kind,
    c.url,
    c.title,
    c.body,
    c.tags,
    ts_rank(c.search_vector, websearch_to_tsquery('english', search_query))::real as rank,
    c.source_fetched_at,
    c.content_version
  from public.isc_lab_knowledge_chunks c
  where c.search_vector @@ websearch_to_tsquery('english', search_query)
  order by rank desc
  limit greatest(1, least(result_limit, 20));
$$;

-- Competitive battlecards (Phase 3 partial)
insert into public.isc_lab_knowledge_chunks (kind, title, body, tags, content_version)
select * from (values
  (
    'battlecard',
    'Microsoft Entra — Agent governance',
    'Acknowledge: Entra ID Protection and agent identities in Microsoft ecosystem. Gap: Entra optimizes directory SSO for humans and Microsoft-native agents — not cross-cloud agent lifecycle, MCP tool governance, certification campaigns for autonomous agents, or agent-to-agent delegation audit. Discovery: How do you certify agent access when the human owner leaves? What audit trail exists when Agent A delegates to Agent B? Landmine response: We complement Entra — ISC is the governance control plane across clouds and third-party agents.',
    array['entra', 'microsoft', 'competitive', 'agent', 'ais', 'okta'],
    '2026.1'
  ),
  (
    'battlecard',
    'Okta — Identity governance',
    'Acknowledge: Okta excels at workforce SSO and increasingly markets agent features. Gap: Okta lacks depth in access certification campaigns, non-employee risk, machine identity sprawl at enterprise scale, and SailPoint Agentic Fabric discover-govern-protect lifecycle. Discovery: Show me Okta certifying service principals across AWS and Salesforce with toxic combination policies. Position ISC outcomes: audit readiness, standing privilege reduction, unified human + machine + agent governance.',
    array['okta', 'competitive', 'governance', 'certification'],
    '2026.1'
  ),
  (
    'battlecard',
    'Build your own / Copilot policies only',
    'Acknowledge: Copilot policies and SIEM rules are necessary but not sufficient. Gap: Policies do not provide identity lifecycle for agents, certification, access request workflows, or MCP allow-lists with audit. DIY scripts break when agent sprawl hits hundreds of service principals. Position: Agentic Fabric operationalizes governance in the same platform as workforce IAM — faster time to proof, lower risk than bespoke middleware.',
    array['copilot', 'diy', 'build', 'shadow ai', 'agentic'],
    '2026.1'
  ),
  (
    'battlecard',
    'CyberArk / PAM-only approach',
    'Acknowledge: PAM is critical for vaulting credentials. Gap: PAM does not govern agent identity lifecycle, AI tool permissions (MCP), or certification of non-human identities at scale. Position: ISC integrates with PAM — vault the secret, govern the identity and entitlements in ISC, certify quarterly.',
    array['cyberark', 'pam', 'competitive', 'machine identity'],
    '2026.1'
  ),
  (
    'battlecard',
    'ServiceNow IGA modules',
    'Acknowledge: ServiceNow workflow strength. Gap: Identity correlation, AI agent governance, and cross-application entitlement depth. Discovery: How do you handle agent sprawl outside ServiceNow CMDB? Position ISC as identity system of record with ServiceNow fulfillment integration.',
    array['servicenow', 'competitive', 'workflow', 'iga'],
    '2026.1'
  )
) as v(kind, title, body, tags, content_version)
where not exists (
  select 1 from public.isc_lab_knowledge_chunks where kind = 'battlecard' limit 1
);
