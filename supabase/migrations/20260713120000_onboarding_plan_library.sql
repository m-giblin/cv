-- Standard onboarding plan library: Week 2–4 + 60/90-day ramps

insert into public.onboarding_plans (name, description, is_template, created_by)
select v.name, v.description, true, null
from (
  values
    (
      'Week 2 — building depth',
      'Deepen ISC skills: workflows, offline challenge, deal prep, shadow session, mentor review.'
    ),
    (
      'Week 3 — customer ready',
      'Pitch practice, solo deal prep, competitive challenge, and mentor readiness check.'
    ),
    (
      'Week 4 — first customer motions',
      'Deal prep for live account, advanced simulation, exec shadow, mentor sign-off.'
    ),
    (
      '60-day ramp check-in',
      'Mid-ramp milestone: certification progress, customer workshop prep, manager review.'
    ),
    (
      '90-day SE readiness',
      'Full readiness gate: advisory demo prep, competitive bakeoff challenge, final mentor review.'
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
    ('Week 2 — building depth', 'ISC workflow deep dive', 'Review forms, transforms, and provisioning patterns in ISC.', 'content_review', 1, '{"dueOffsetDays": 3}'),
    ('Week 2 — building depth', 'Connector & transform challenge', 'Complete an offline connector/transform artifact and submit evidence.', 'challenge', 2, '{"dueOffsetDays": 7}'),
    ('Week 2 — building depth', 'Deal prep for upcoming call', 'Generate account-specific prep before your first supported customer call.', 'deal_prep', 3, '{"dueOffsetDays": 10}'),
    ('Week 2 — building depth', 'Shadow a technical call', 'Log takeaways from a shadow session with your manager or mentor.', 'shadow_meeting_log', 4, '{"dueOffsetDays": 12}'),
    ('Week 2 — building depth', 'Week 2 mentor check-in', 'Review progress and gaps with your mentor.', 'mentor_review', 5, '{"dueOffsetDays": 14}'),

    ('Week 3 — customer ready', 'Elevator pitch simulation', 'Practice a concise executive pitch and save your coaching card.', 'simulation', 1, '{"dueOffsetDays": 5}'),
    ('Week 3 — customer ready', 'Solo deal prep brief', 'Prep independently for a customer meeting your manager assigns.', 'deal_prep', 2, '{"dueOffsetDays": 7}'),
    ('Week 3 — customer ready', 'Competitive positioning challenge', 'Prepare a competitive response artifact for Okta / Microsoft scenarios.', 'challenge', 3, '{"dueOffsetDays": 10}'),
    ('Week 3 — customer ready', 'Customer-ready mentor review', 'Confirm readiness for low-risk customer participation.', 'mentor_review', 4, '{"dueOffsetDays": 14}'),

    ('Week 4 — first customer motions', 'Live account deal prep', 'Full deal prep for an account you will support on a call this week.', 'deal_prep', 1, '{"dueOffsetDays": 3}'),
    ('Week 4 — first customer motions', 'Advanced roleplay', 'Run a medium-difficulty roleplay and submit for manager review.', 'simulation', 2, '{"dueOffsetDays": 7}'),
    ('Week 4 — first customer motions', 'Shadow executive readout', 'Observe and log notes from an executive-level customer conversation.', 'shadow_meeting_log', 3, '{"dueOffsetDays": 10}'),
    ('Week 4 — first customer motions', 'Week 4 sign-off', 'Mentor review of first-month readiness.', 'mentor_review', 4, '{"dueOffsetDays": 14}'),

    ('60-day ramp check-in', 'Certification gate review', 'Review certification progress and next gate requirements.', 'content_review', 1, '{"dueOffsetDays": 45}'),
    ('60-day ramp check-in', 'Customer workshop prep', 'Deal prep for a workshop or POC kickoff.', 'deal_prep', 2, '{"dueOffsetDays": 50}'),
    ('60-day ramp check-in', 'Mid-ramp simulation', 'Practice a challenging persona scenario and submit coaching feedback.', 'simulation', 3, '{"dueOffsetDays": 55}'),
    ('60-day ramp check-in', '60-day manager review', 'Manager checkpoint on ramp progress and focus areas.', 'mentor_review', 4, '{"dueOffsetDays": 60}'),

    ('90-day SE readiness', 'Advisory demo readiness', 'Review executive demo flow and success criteria.', 'content_review', 1, '{"dueOffsetDays": 75}'),
    ('90-day SE readiness', 'Competitive bakeoff challenge', 'Prepare for a competitive evaluation scenario.', 'challenge', 2, '{"dueOffsetDays": 82}'),
    ('90-day SE readiness', 'Full-cycle deal prep', 'End-to-end prep for a strategic account engagement.', 'deal_prep', 3, '{"dueOffsetDays": 86}'),
    ('90-day SE readiness', '90-day readiness sign-off', 'Final mentor/manager validation of SE readiness.', 'mentor_review', 4, '{"dueOffsetDays": 90}')
) as step(plan_name, title, description, step_type, sort_order, metadata)
where p.name = step.plan_name and p.is_template = true
  and not exists (select 1 from public.plan_steps ps where ps.plan_id = p.id);
