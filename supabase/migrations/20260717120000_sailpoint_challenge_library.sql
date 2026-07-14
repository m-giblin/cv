-- SailPoint curated challenge library (4 Basic, 3 Senior, 4 Advisory)

alter table public.challenges
  add column if not exists target_level public.se_level;

create index if not exists challenges_target_level_idx on public.challenges (target_level);

comment on column public.challenges.target_level is
  'Recommended SE career level for the challenge (Basic, Senior, Advisory).';

insert into public.challenges (
  id,
  title,
  description,
  steps,
  success_criteria,
  linked_solutions,
  difficulty,
  estimated_minutes,
  target_level,
  is_ai_generated,
  ai_metadata
)
values
  (
    'a1000001-0001-4000-8000-000000000001',
    'ISC Search: Find Stale Interactive Accounts',
    'Use Identity Security Cloud Search to investigate account activity and produce a manager-ready summary. You will practice the same search patterns SEs use before customer working sessions to validate aggregation health and dormant access risk.',
    '["Configure the SailPoint CLI (sail env create) or use Admin → Search in your lab tenant and run a query for interactive accounts inactive longer than 90 days (include source name and last login attributes).","Export or screenshot the top 10 results and annotate which sources appear authoritative vs downstream.","Write a one-page brief explaining what an IAM lead should remediate first and which follow-up workflow (certification vs automated disable) you would recommend."]'::jsonb,
    '["Search query returns account-level fields (source, native identity, last login or modified) with a clear inactivity filter.","Brief distinguishes aggregation/correlation symptoms from true access-risk findings.","Recommendation ties at least one finding to a SailPoint control (certification campaign, access request, or workflow)."]'::jsonb,
    array['Identity Security Cloud', 'ISC Search', 'SailPoint CLI'],
    'foundational',
    45,
    'Basic',
    false,
    '{"linkedResources":["https://developer.sailpoint.com/docs/tools/cli/","https://developer.sailpoint.com/docs/tools/cli/search"],"library":"sailpoint-challenge-library"}'::jsonb
  ),
  (
    'a1000001-0001-4000-8000-000000000002',
    'Workflow Inventory: Triggers, Steps, and Outcomes',
    'Map how ISC workflows automate identity lifecycle events. You will list existing workflows, identify their trigger types, and explain the business outcome each supports — the foundation for every deeper workflow challenge.',
    '["Run sail workflow list (or Admin → Workflows) and pick three workflows: one lifecycle (joiner/mover/leaver), one notification, and one approval-oriented flow.","For each workflow, document trigger event, first three steps, and the terminal action (provision, email, HTTP call, etc.).","Record a five-minute walkthrough video or written script explaining how a Basic SE would describe one workflow to a customer IAM manager."]'::jsonb,
    '["Inventory includes workflow IDs/names and correct trigger classification.","Step descriptions use ISC terminology (action, condition, define variable) accurately.","Customer narrative focuses on business outcome, not button clicks."]'::jsonb,
    array['Identity Security Cloud', 'Workflows', 'SailPoint CLI'],
    'foundational',
    40,
    'Basic',
    false,
    '{"linkedResources":["https://developer.sailpoint.com/docs/tools/cli/workflow","https://documentation.sailpoint.com/saas/help/workflows/index.html"],"library":"sailpoint-challenge-library"}'::jsonb
  ),
  (
    'a1000001-0001-4000-8000-000000000003',
    'Create a Lower Transform for Work Email',
    'Build a JSON transform that normalizes work email addresses during identity profile mapping. Transforms are the no-code building blocks ISC uses during aggregation and attribute promotion — no BeanShell required.',
    '["Draft a lower transform named Normalize Work Email that lowercases the incoming email attribute (implicit input) and document the JSON body per SailPoint transform syntax.","Create the transform via POST /transforms or Admin → Identities → Identity Profiles → Mappings, then map it to the work email attribute on a lab profile.","Preview identity data before/after and capture evidence showing at least two identities with mixed-case emails normalized."]'::jsonb,
    '["Transform JSON includes root-level name, type, and attributes per SailPoint docs.","Evidence shows lowercase output for mixed-case inputs without breaking null handling.","Write-up explains implicit vs explicit input and when an administrator would choose each."]'::jsonb,
    array['Identity Security Cloud', 'Transforms', 'Identity Profiles'],
    'intermediate',
    50,
    'Basic',
    false,
    '{"linkedResources":["https://developer.sailpoint.com/docs/extensibility/transforms/","https://developer.sailpoint.com/docs/api/v3/create-transform"],"library":"sailpoint-challenge-library"}'::jsonb
  ),
  (
    'a1000001-0001-4000-8000-000000000004',
    'JML Lifecycle Mapping Workshop',
    'Connect joiner-mover-leaver business language to ISC capabilities. Produce a customer-facing diagram that shows which lifecycle events become workflows, provisioning actions, and certifications in a typical ISC deployment.',
    '["List joiner, mover, and leaver scenarios for a 5,000-employee hybrid workforce (AD + SaaS apps) and note authoritative source for each attribute change.","Map each scenario to ISC features: workflow trigger, provisioning policy/transform, access request, and certification if applicable.","Deliver a one-page visual (Miro, Lucidchart, or slide) plus talk track a Basic SE could use in discovery."]'::jsonb,
    '["All three JML phases are covered with distinct ISC automation paths.","Diagram distinguishes aggregation/correlation from provisioning and governance controls.","Talk track uses customer outcomes (time-to-productivity, audit readiness, leaver risk) rather than feature names alone."]'::jsonb,
    array['Identity Security Cloud', 'Workflows', 'Provisioning'],
    'foundational',
    55,
    'Basic',
    false,
    '{"linkedResources":["https://developer.sailpoint.com/discuss/t/identity-security-cloud-extensibility-the-art-of-the-possible/38184","https://documentation.sailpoint.com/saas/help/provisioning/provisioning.html"],"library":"sailpoint-challenge-library"}'::jsonb
  ),
  (
    'b2000002-0002-4000-8000-000000000001',
    'Workflow HTTP Action: Location-to-Role Lookup',
    'Model the community pattern for using delimited-file source data inside workflows when transforms cannot run in a Define Variable step. Use the Accounts API filter pattern to resolve dynamic role values from a location key.',
    '["Stand up or document a delimited source where nativeIdentity equals location code and an attribute holds recommended entitlements (per SailPoint community guidance).","Add a workflow HTTP action that calls GET /accounts?filters=sourceId eq \"{id}\" and nativeIdentity eq \"{location}\" and capture sample JSON response.","Use a Define Variable step with JSONPath (e.g. $.hTTPRequest.body[0].attributes.roles) to pass roles into a downstream provisioning or notification step and document error handling if no account matches."]'::jsonb,
    '["HTTP action URL and filters match ISC API syntax with parameterized location input.","Variable mapping extracts entitlement/role array from response body correctly.","Design notes explain why lookup transforms are not used directly in workflows and when HTTP is appropriate."]'::jsonb,
    array['Identity Security Cloud', 'Workflows', 'REST API'],
    'intermediate',
    75,
    'Senior',
    false,
    '{"linkedResources":["https://developer.sailpoint.com/discuss/t/to-use-vlookup-table-in-workflows/128376","https://developer.sailpoint.com/docs/api/v3/list-accounts"],"library":"sailpoint-challenge-library"}'::jsonb
  ),
  (
    'b2000002-0002-4000-8000-000000000002',
    'Nested Transform for Provisioning Display Name',
    'Design a nested transform chain (Replace → Concat → Lower) for account create profiles. Senior SEs must show how provisioning policies calculate attributes beyond the Admin UI defaults.',
    '["Author JSON for a Replace transform that swaps a legacy department code, a Concat transform combining firstName and lastName, and an outer Lower transform — matching SailPoint nested transform guidance.","Attach the transform chain to a source account create profile (Admin → Sources → Accounts → Create Account or provisioning policy API).","Trigger a lab provisioning event (access request or role assignment creating a new account) and capture before/after attribute values."]'::jsonb,
    '["Nested JSON is valid, under documented size limits, and uses explicit inputs where sources differ.","Provisioning evidence shows transformed display/login attributes on the new account.","Explanation covers testing strategy for account-create transforms (new account required)."]'::jsonb,
    array['Identity Security Cloud', 'Transforms', 'Provisioning Policies'],
    'intermediate',
    70,
    'Senior',
    false,
    '{"linkedResources":["https://developer.sailpoint.com/docs/extensibility/transforms/","https://developer.sailpoint.com/docs/extensibility/transforms/operations/concat"],"library":"sailpoint-challenge-library"}'::jsonb
  ),
  (
    'b2000002-0002-4000-8000-000000000003',
    'Manager Certification Reminder Workflow',
    'Design an ISC workflow that escalates overdue certification decisions to people managers. Focus on trigger logic, manager notification, and audit-friendly logging — a common Senior SE deliverable in enterprise deployments.',
    '["Draft workflow JSON (or builder outline) triggered by certification campaign milestones with a condition for items pending longer than seven days.","Include steps: lookup certifier manager identity, send notification action, and optional HTTP action to post metrics to a ticketing webhook.","Run sail workflow create -f against a lab tenant OR walk through Admin → Workflows builder screenshots if CLI access is unavailable; document rollback plan."]'::jsonb,
    '["Trigger and condition steps reference certification objects and time thresholds accurately.","Notification content includes campaign name, due date, and deep link for reviewers.","Runbook covers test campaign, production promotion, and how to disable the workflow safely."]'::jsonb,
    array['Identity Security Cloud', 'Workflows', 'Certifications'],
    'advanced',
    90,
    'Senior',
    false,
    '{"linkedResources":["https://developer.sailpoint.com/docs/tools/cli/workflow","https://documentation.sailpoint.com/saas/help/certifications/certifications.html"],"library":"sailpoint-challenge-library"}'::jsonb
  ),
  (
    'c3000003-0003-4000-8000-000000000001',
    'Workflow Define Variable: dateCompare Threshold',
    'Implement the community pattern for normalizing inconsistent date strings and evaluating whether an account attribute is older than a sliding threshold using dateMath + dateCompare transforms inside a workflow Define Variable step.',
    '["Create transform variables thresholdISO (dateMath from now minus X days, wrapped to ISO-8601) and isOlderThanXDays (dateCompare against a normalized identity attribute) per SailPoint workflow guidance.","Wire the boolean output into a Condition step that branches between reminder vs escalation paths.","Document how you would test with both ISO and non-ISO source dates, including fallback via nested firstValid + dateFormat."]'::jsonb,
    '["Transform JSON uses dateMath and dateCompare types with ISO-8601 inputs as documented.","Condition branching matches business rule (e.g. disable vs notify) and references the boolean variable.","Testing notes cover identity attribute vs account attribute inputs and HTTP preview alternative."]'::jsonb,
    array['Identity Security Cloud', 'Workflows', 'Transforms'],
    'intermediate',
    80,
    'Advisory',
    false,
    '{"linkedResources":["https://developer.sailpoint.com/discuss/t/how-to-date-transform-in-a-workflow/186242","https://developer.sailpoint.com/docs/extensibility/transforms/"],"library":"sailpoint-challenge-library"}'::jsonb
  ),
  (
    'c3000003-0003-4000-8000-000000000002',
    'Onboarding Workflow: Form, Approval, Provision',
    'Architect an end-to-end joiner workflow that combines ISC forms, approval steps, and provisioning actions — the Advisory pattern for replacing manual onboarding checklists in regulated customers.',
    '["Whiteboard the workflow: Identity Created trigger → Form (manager supplies start date, department, equipment) → Approval → Provision accounts via configured sources → Confirmation email.","Produce workflow definition JSON fragments or Admin builder exports for each segment and note idempotency if the joiner event replays.","Deliver an executive summary slide tying the workflow to audit evidence (who approved what, when provisioning fired)."]'::jsonb,
    '["Workflow includes form capture, explicit approval, and provision actions with named sources.","Design addresses failure paths (approval rejected, provisioning error) with notifications.","Executive summary quantifies manual effort removed and compliance artifacts gained."]'::jsonb,
    array['Identity Security Cloud', 'Workflows', 'Forms'],
    'advanced',
    95,
    'Advisory',
    false,
    '{"linkedResources":["https://developer.sailpoint.com/discuss/t/identity-security-cloud-extensibility-the-art-of-the-possible/38184","https://developer.sailpoint.com/docs/tools/cli/workflow"],"library":"sailpoint-challenge-library"}'::jsonb
  ),
  (
    'c3000003-0003-4000-8000-000000000003',
    'Extensibility Decision Brief: Transforms vs Rules vs Workflows',
    'Produce an Advisory-level architecture brief that tells a customer when to use transforms, rules, workflows, and external HTTP orchestration. Ground recommendations in SailPoint documentation — not generic IAM theory.',
    '["Pick three real customer scenarios (attribute normalization, complex approval routing, bulk data enrichment) and assign each to transforms, rules, workflows, or external iPaaS with justification.","Include governance guidance: version control, who can author, SailPoint services involvement, and REST API authentication model (PAT/OAuth).","Present a 10-minute executive readout with risks of over-using rules and under-using workflows (or vice versa)."]'::jsonb,
    '["Each scenario cites specific SailPoint extensibility constraints from official docs or CLI capabilities.","Brief includes operational ownership (customer admin vs SailPoint services) for each artifact type.","Recommendations balance time-to-value with long-term maintainability."]'::jsonb,
    array['Identity Security Cloud', 'Transforms', 'Workflows', 'Rules'],
    'advanced',
    85,
    'Advisory',
    false,
    '{"linkedResources":["https://developer.sailpoint.com/docs/extensibility/transforms/","https://developer.sailpoint.com/docs/tools/cli/","https://developer.sailpoint.com/discuss/t/identity-security-cloud-extensibility-the-art-of-the-possible/38184"],"library":"sailpoint-challenge-library"}'::jsonb
  ),
  (
    'c3000003-0003-4000-8000-000000000004',
    'CLI Workflow Promotion Pipeline',
    'Demonstrate how Advisory SEs treat workflows as code: export from dev, review in Git, and promote to staging/production with the SailPoint CLI — reducing configuration drift across tenants.',
    '["Download workflows from a dev tenant (sail workflow download -f ./workflows) and check the JSON into a sample Git repo structure with README.","Modify a non-production workflow offline, run sail workflow update -f, and capture CLI output showing successful update.","Write a promotion checklist covering PAT/OAuth auth (sail set auth), environment variables for CI/CD, and rollback via sail workflow delete + redeploy."]'::jsonb,
    '["Repo layout documents environment naming (sail env create) and secrets handling via env vars.","Evidence shows create or update against API with matching workflow IDs.","Checklist addresses peer review, change window, and tenant-specific trigger validation."]'::jsonb,
    array['Identity Security Cloud', 'Workflows', 'SailPoint CLI'],
    'intermediate',
    75,
    'Advisory',
    false,
    '{"linkedResources":["https://developer.sailpoint.com/docs/tools/cli/workflow","https://developer.sailpoint.com/docs/tools/cli/"],"library":"sailpoint-challenge-library"}'::jsonb
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  steps = excluded.steps,
  success_criteria = excluded.success_criteria,
  linked_solutions = excluded.linked_solutions,
  difficulty = excluded.difficulty,
  estimated_minutes = excluded.estimated_minutes,
  target_level = excluded.target_level,
  is_ai_generated = excluded.is_ai_generated,
  ai_metadata = excluded.ai_metadata,
  updated_at = now();

-- Link competencies where names match
insert into public.challenge_competencies (challenge_id, competency_id)
select c.id, comp.id
from public.challenges c
join public.competencies comp on comp.name = 'ISC Workflows and Forms'
where c.id in (
  'a1000001-0001-4000-8000-000000000001',
  'a1000001-0001-4000-8000-000000000002',
  'a1000001-0001-4000-8000-000000000003',
  'a1000001-0001-4000-8000-000000000004',
  'b2000002-0002-4000-8000-000000000001',
  'b2000002-0002-4000-8000-000000000002',
  'b2000002-0002-4000-8000-000000000003',
  'c3000003-0003-4000-8000-000000000001',
  'c3000003-0003-4000-8000-000000000002',
  'c3000003-0003-4000-8000-000000000004'
)
on conflict do nothing;

insert into public.challenge_competencies (challenge_id, competency_id)
select c.id, comp.id
from public.challenges c
join public.competencies comp on comp.name = 'SLED Vertical Knowledge'
where c.id = 'a1000001-0001-4000-8000-000000000004'
on conflict do nothing;

insert into public.challenge_competencies (challenge_id, competency_id)
select c.id, comp.id
from public.challenges c
join public.competencies comp on comp.name = 'Executive Demo Storytelling'
where c.id in (
  'c3000003-0003-4000-8000-000000000001',
  'c3000003-0003-4000-8000-000000000002',
  'c3000003-0003-4000-8000-000000000003'
)
on conflict do nothing;

-- Wire existing plan step to library challenge when title matches
update public.plan_steps ps
set challenge_id = 'a1000001-0001-4000-8000-000000000001'
where ps.title ilike '%ISC discovery%'
  and ps.step_type = 'challenge'
  and ps.challenge_id is null;
