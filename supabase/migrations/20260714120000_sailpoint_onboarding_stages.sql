-- SailPoint onboarding stages (from On-Boarding stages.docx) — week-based plan templates

insert into public.onboarding_plans (name, description, is_template, created_by)
select v.name, v.description, true, null
from (
  values
    (
      'Week 1–2 — Boots on the ground',
      'Stage 1: SailPoint tools, DemoHub, travel, Slack, Keeper, SLED/FED intro, and shadow SE meetings.'
    ),
    (
      'Week 2–3 — First steps',
      'Stage 2: Elevator pitch, ISC platform, DemoHub tenant, JML basics, RFP/Loopio, and corporate demo deck.'
    ),
    (
      'Week 3–4 — Second step',
      'Stage 3: Pitch and demo presentations, role management, RFP work, iLab tenant setup, and continued shadowing.'
    ),
    (
      'Week 5–6 — Third step',
      'Stage 4: Team demos, audit/compliance, AIC, reporting, certifications, and presentation practice.'
    ),
    (
      'Week 7–8 — Fourth step',
      'Stage 5: Advanced demos, transforms, RFP collaboration, and mentor readiness sign-off.'
    )
) as v(name, description)
where not exists (
  select 1 from public.onboarding_plans op where op.name = v.name and op.is_template = true
);

insert into public.plan_steps (plan_id, title, description, step_type, sort_order, content_url, metadata)
select p.id, step.title, step.description, step.step_type::public.plan_step_type, step.sort_order, null, step.metadata::jsonb
from public.onboarding_plans p
cross join (
  values
    -- Week 1–2 — Boots on the ground
    ('Week 1–2 — Boots on the ground', 'SailPoint tools overview', 'Compass, developer portal, and Developer Days YouTube channel.', 'content_review', 1, '{"dueOffsetDays": 3}'),
    ('Week 1–2 — Boots on the ground', 'DemoHub submission & management', 'Learn DemoHub submission workflow and tenant management basics.', 'content_review', 2, '{"dueOffsetDays": 5}'),
    ('Week 1–2 — Boots on the ground', 'Booking travel', 'Complete travel booking and expense policy orientation.', 'content_review', 3, '{"dueOffsetDays": 6}'),
    ('Week 1–2 — Boots on the ground', 'Slack communication', 'Join key channels and confirm daily communication norms.', 'content_review', 4, '{"dueOffsetDays": 4}'),
    ('Week 1–2 — Boots on the ground', 'Keeper access & review', 'Request Keeper access and review credential management practices.', 'content_review', 5, '{"dueOffsetDays": 7}'),
    ('Week 1–2 — Boots on the ground', 'SLED & FED team meet-and-greet', 'Individual intro meeting with SLED and FED team leads.', 'mentor_review', 6, '{"dueOffsetDays": 10}'),
    ('Week 1–2 — Boots on the ground', 'Start shadowing SE meetings', 'Log takeaways from initial shadow sessions with field SEs.', 'shadow_meeting_log', 7, '{"dueOffsetDays": 14}'),

    -- Week 2–3 — First steps
    ('Week 2–3 — First steps', 'Perfect the elevator pitch', 'Draft and refine your executive elevator pitch.', 'simulation', 1, '{"dueOffsetDays": 3}'),
    ('Week 2–3 — First steps', 'ISC platform discussion & video', 'Open discussion on SailPoint Identity Security Cloud; watch assigned platform video.', 'content_review', 2, '{"dueOffsetDays": 4}'),
    ('Week 2–3 — First steps', 'Request ISC Demo Ready tenant', 'Submit DemoHub request for an ISC demo-ready tenant.', 'challenge', 3, '{"dueOffsetDays": 5}'),
    ('Week 2–3 — First steps', '#help-product-org-answers review', 'Daily review of product org answers channel for ramp context.', 'content_review', 4, '{"dueOffsetDays": 7}'),
    ('Week 2–3 — First steps', 'Joiner–Mover–Leaver walkthrough', 'Discuss basic JML lifecycle and provisioning patterns.', 'content_review', 5, '{"dueOffsetDays": 6}'),
    ('Week 2–3 — First steps', 'Watch LCS video (part 1)', 'Complete assigned Lifecycle Services training video.', 'content_review', 6, '{"dueOffsetDays": 8}'),
    ('Week 2–3 — First steps', 'Watch LCS video (part 2)', 'Complete second assigned LCS training video.', 'content_review', 7, '{"dueOffsetDays": 9}'),
    ('Week 2–3 — First steps', 'RFP review — Loopio & questions', 'Review Loopio workflow and sample RFP question patterns.', 'challenge', 8, '{"dueOffsetDays": 10}'),
    ('Week 2–3 — First steps', 'Shadow SE meetings', 'Continue shadowing SE meetings; log discovery and demo notes.', 'shadow_meeting_log', 9, '{"dueOffsetDays": 12}'),
    ('Week 2–3 — First steps', 'Corporate demo deck — draft', 'Begin corporate demo deck; align to standard storyline.', 'challenge', 10, '{"dueOffsetDays": 14}'),

    -- Week 3–4 — Second step
    ('Week 3–4 — Second step', 'Elevator pitch — mentor feedback', 'Present elevator pitch to mentor and incorporate feedback.', 'simulation', 1, '{"dueOffsetDays": 2}'),
    ('Week 3–4 — Second step', 'Elevator pitch — team feedback', 'Present elevator pitch to team for broader feedback.', 'simulation', 2, '{"dueOffsetDays": 4}'),
    ('Week 3–4 — Second step', 'Corporate demo deck — mentor review', 'Perfect corporate demo deck and present to mentor.', 'simulation', 3, '{"dueOffsetDays": 5}'),
    ('Week 3–4 — Second step', 'JML demo in tenant — mentor review', 'Demo Joiner/Mover/Leaver use case in demo tenant for mentor feedback.', 'simulation', 4, '{"dueOffsetDays": 7}'),
    ('Week 3–4 — Second step', 'Fine-tune JML talking points', 'Refine Joiner/Mover/Leaver narrative and objection responses.', 'content_review', 5, '{"dueOffsetDays": 8}'),
    ('Week 3–4 — Second step', '#help-product-org-answers review', 'Continue daily product org channel review.', 'content_review', 6, '{"dueOffsetDays": 3}'),
    ('Week 3–4 — Second step', 'Role management discussion', 'Building roles, dynamic roles, and role mining concepts.', 'content_review', 7, '{"dueOffsetDays": 6}'),
    ('Week 3–4 — Second step', 'Watch — Why Roles', 'Complete Why Roles training video.', 'content_review', 8, '{"dueOffsetDays": 9}'),
    ('Week 3–4 — Second step', 'Watch — Dynamic Roles', 'Complete Dynamic Roles training video.', 'content_review', 9, '{"dueOffsetDays": 10}'),
    ('Week 3–4 — Second step', 'Watch — Exxon Mobile Roles', 'Complete Exxon Mobile Roles case study video.', 'content_review', 10, '{"dueOffsetDays": 11}'),
    ('Week 3–4 — Second step', 'Watch — ID Attributes', 'Complete ID Attributes training video.', 'content_review', 11, '{"dueOffsetDays": 12}'),
    ('Week 3–4 — Second step', 'Work on RFP questions', 'Draft responses to assigned RFP question set.', 'challenge', 12, '{"dueOffsetDays": 13}'),
    ('Week 3–4 — Second step', 'Automated roles from JML data', 'Create roles from Joiner/Mover data with automation criteria; test in tenant.', 'challenge', 13, '{"dueOffsetDays": 12}'),
    ('Week 3–4 — Second step', 'Demo new roles with mentor', 'Demo new roles with Joiner/Mover scenarios for mentor feedback.', 'simulation', 14, '{"dueOffsetDays": 14}'),
    ('Week 3–4 — Second step', 'Continue shadowing SE meetings', 'Shadow demo, discovery, and general customer discussions.', 'shadow_meeting_log', 15, '{"dueOffsetDays": 10}'),
    ('Week 3–4 — Second step', 'Request DemoHub iLab tenant', 'Submit request for DemoHub iLab tenant.', 'challenge', 16, '{"dueOffsetDays": 11}'),
    ('Week 3–4 — Second step', 'Basic iLab setup & configuration', 'Complete basic iLab setup and configuration walkthrough.', 'challenge', 17, '{"dueOffsetDays": 14}'),

    -- Week 5–6 — Third step
    ('Week 5–6 — Third step', 'JML team demo with new roles', 'Demo Joiner/Mover/Leaver with new roles to team for feedback.', 'simulation', 1, '{"dueOffsetDays": 3}'),
    ('Week 5–6 — Third step', 'Corporate demo deck — team review', 'Present corporate demo deck to team for feedback.', 'simulation', 2, '{"dueOffsetDays": 5}'),
    ('Week 5–6 — Third step', 'Demo presentation deck — start', 'Begin customer-facing demo presentation deck.', 'challenge', 3, '{"dueOffsetDays": 6}'),
    ('Week 5–6 — Third step', 'Continue shadowing SE meetings', 'Shadow demo, discovery, and general customer discussions.', 'shadow_meeting_log', 4, '{"dueOffsetDays": 8}'),
    ('Week 5–6 — Third step', 'Work on RFP questions', 'Continue RFP question responses and Loopio submissions.', 'challenge', 5, '{"dueOffsetDays": 10}'),
    ('Week 5–6 — Third step', '#help-product-org-answers review', 'Continue daily product org channel review.', 'content_review', 6, '{"dueOffsetDays": 4}'),
    ('Week 5–6 — Third step', 'Developer Days YouTube — explore', 'Explore Developer Days channel for advanced topics.', 'content_review', 7, '{"dueOffsetDays": 7}'),
    ('Week 5–6 — Third step', 'Audit & compliance discussion', 'Discuss audit and compliance drivers with mentor or enablement.', 'content_review', 8, '{"dueOffsetDays": 9}'),
    ('Week 5–6 — Third step', 'Certification discussion & demo', 'Review certification campaigns and demo attestation flow.', 'content_review', 9, '{"dueOffsetDays": 10}'),
    ('Week 5–6 — Third step', 'Achieving compliance — video', 'Watch Achieving Compliance training content.', 'content_review', 10, '{"dueOffsetDays": 11}'),
    ('Week 5–6 — Third step', 'General reporting via Search', 'Learn search-based reporting patterns in ISC.', 'content_review', 11, '{"dueOffsetDays": 12}'),
    ('Week 5–6 — Third step', 'Access Intelligence Center overview', 'Review AIC capabilities and use cases.', 'content_review', 12, '{"dueOffsetDays": 13}'),
    ('Week 5–6 — Third step', 'AIC watch — training video', 'Complete Access Intelligence Center training video.', 'content_review', 13, '{"dueOffsetDays": 13}'),
    ('Week 5–6 — Third step', 'Reports & certifications in demo', 'Generate reports and certifications in demo environment; review output.', 'challenge', 14, '{"dueOffsetDays": 12}'),
    ('Week 5–6 — Third step', 'New DemoHub iLab tenant', 'Request fresh iLab tenant and repeat setup process.', 'challenge', 15, '{"dueOffsetDays": 11}'),
    ('Week 5–6 — Third step', 'Presentation practice', 'Practice presenting demo deck with classwork / peer session.', 'simulation', 16, '{"dueOffsetDays": 14}'),

    -- Week 7–8 — Fourth step
    ('Week 7–8 — Fourth step', 'Continue shadowing SE meetings', 'Shadow demo, discovery, and general customer discussions.', 'shadow_meeting_log', 1, '{"dueOffsetDays": 3}'),
    ('Week 7–8 — Fourth step', 'Work on RFP questions', 'Continue RFP responses and peer collaboration.', 'challenge', 2, '{"dueOffsetDays": 5}'),
    ('Week 7–8 — Fourth step', '#help-product-org-answers review', 'Continue daily product org channel review.', 'content_review', 3, '{"dueOffsetDays": 4}'),
    ('Week 7–8 — Fourth step', 'Developer Days YouTube — explore', 'Explore advanced Developer Days content.', 'content_review', 4, '{"dueOffsetDays": 6}'),
    ('Week 7–8 — Fourth step', 'Demo presentation — mentor feedback', 'Present demo presentation to mentor and incorporate feedback.', 'simulation', 5, '{"dueOffsetDays": 8}'),
    ('Week 7–8 — Fourth step', 'JML demo with roles & certifications', 'Demo Joiner–Mover–Leaver with roles and certifications to mentor.', 'simulation', 6, '{"dueOffsetDays": 10}'),
    ('Week 7–8 — Fourth step', 'Assist teammates on RFP', 'Collaborate on teammate RFP question responses.', 'challenge', 7, '{"dueOffsetDays": 11}'),
    ('Week 7–8 — Fourth step', 'Transforms — open discussion', 'Open discussion on transforms and lifecycle rules.', 'content_review', 8, '{"dueOffsetDays": 12}'),
    ('Week 7–8 — Fourth step', 'LCS transforms — video', 'Watch LCS transforms training video.', 'content_review', 9, '{"dueOffsetDays": 13}'),
    ('Week 7–8 — Fourth step', 'Create example transforms', 'Build and test example transforms in demo tenant.', 'challenge', 10, '{"dueOffsetDays": 13}'),
    ('Week 7–8 — Fourth step', 'Week 7–8 mentor readiness sign-off', 'Final mentor review of ramp readiness before graduation.', 'mentor_review', 11, '{"dueOffsetDays": 14}')
) as step(plan_name, title, description, step_type, sort_order, metadata)
where p.name = step.plan_name and p.is_template = true
  and not exists (select 1 from public.plan_steps ps where ps.plan_id = p.id);
