-- Agentic AI challenge library batch 3 (2 Basic, 2 Senior, 2 Advisory)

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
    'e5000001-0005-4000-8000-000000000001',
    'GenAI vs Agentic AI: Customer One-Pager',
    'Produce a crisp one-pager that helps customers understand why GenAI assistants and Agentic AI systems require different governance postures.',
    '["Draft a two-column comparison: GenAI vs Agentic AI.","Add three SailPoint-specific bullets on agent identity governance.","Record a three-minute talk track for a skeptical IAM director."]'::jsonb,
    '["Uses customer-risk language.","Agentic column mentions governed actions and lifecycle.","Handles Copilot objection with identity framing."]'::jsonb,
    array['Agent Identity Security', 'Agentic Fabric', 'Identity Security Cloud'],
    'foundational',
    40,
    'Basic',
    false,
    '{"library":"sailpoint-challenge-library-batch3","tags":["Agentic AI","GenAI vs Agentic"]}'::jsonb
  ),
  (
    'e5000001-0005-4000-8000-000000000002',
    'Shadow AI Discovery Workshop Prep',
    'Prepare a facilitator guide for a workshop that helps customers inventory AI agents touching production data.',
    '["List eight discovery questions mapped to Agentic Fabric Discover.","Build a 45-minute workshop agenda with roles and outputs.","Identify two realistic agent examples from cloud platforms."]'::jsonb,
    '["Questions force ownership and audit answers.","Agenda ends with prioritized agent inventory.","Examples are enterprise-realistic."]'::jsonb,
    array['Agentic Fabric', 'Agent Identity Security'],
    'foundational',
    50,
    'Basic',
    false,
    '{"library":"sailpoint-challenge-library-batch3","tags":["Agentic AI","Discovery"]}'::jsonb
  ),
  (
    'e5000001-0005-4000-8000-000000000003',
    'AIS Agent Registration Lab',
    'Walk through how AIS aggregates agents from a cloud platform and ties them to human owners.',
    '["Identify where AIS surfaces agents from a connector.","Screenshot agent metadata and owner attribution.","Write a customer email on governed lifecycle after registration."]'::jsonb,
    '["Agent treated as identity with owner.","Email distinguishes AIS from CMDB inventory.","Notes mention certification path."]'::jsonb,
    array['Agent Identity Security', 'Identity Security Cloud'],
    'intermediate',
    55,
    'Senior',
    false,
    '{"library":"sailpoint-challenge-library-batch3","tags":["AIS","Agentic AI"]}'::jsonb
  ),
  (
    'e5000001-0005-4000-8000-000000000004',
    'MCP Server Governance Story',
    'Explain SailPoint MCP Server as the governed bridge for third-party agents calling ISC APIs.',
    '["Diagram external agent to MCP Server to ISC API with audit.","List three risks without governance.","Draft competitive positioning vs DIY middleware."]'::jsonb,
    '["Diagram labels auth, authz, and audit.","Risks tie to board concerns.","Positioning emphasizes SailPoint-native policy."]'::jsonb,
    array['Agentic Fabric', 'Identity Security Cloud'],
    'intermediate',
    45,
    'Senior',
    false,
    '{"library":"sailpoint-challenge-library-batch3","tags":["Agentic Fabric","Governance"]}'::jsonb
  ),
  (
    'e5000001-0005-4000-8000-000000000005',
    'Zero Standing Privilege for Agents',
    'Build an executive briefing on ZSP applied to high-risk AI agents.',
    '["Define ZSP vs standing agent permissions.","Map ZSP to a customer scenario.","Prepare three board-ready metrics."]'::jsonb,
    '["Uses ZSP language consistently.","Scenario includes human owner accountability.","Metrics are measurable from ISC/AIS."]'::jsonb,
    array['Agent Identity Security', 'Data Access Security'],
    'advanced',
    60,
    'Advisory',
    false,
    '{"library":"sailpoint-challenge-library-batch3","tags":["ZSP","Governance"]}'::jsonb
  ),
  (
    'e5000001-0005-4000-8000-000000000006',
    'Agentic Fabric Competitive Takeout',
    'Prepare a competitive moment: why directory IAM and standalone AI security tools fail on agent lifecycle.',
    '["Create Entra/Okta vs Agentic Fabric comparison.","Document two competitor landmines and reframes.","Write a CISO closing one-liner."]'::jsonb,
    '["Table is factual.","Landmines include agents-as-apps and Copilot admin center.","Close ties to audit and blast radius."]'::jsonb,
    array['Agentic Fabric', 'Agent Identity Security', 'Identity Security Cloud'],
    'advanced',
    55,
    'Advisory',
    false,
    '{"library":"sailpoint-challenge-library-batch3","tags":["Agentic AI","Competitive"]}'::jsonb
  )
on conflict (id) do nothing;
