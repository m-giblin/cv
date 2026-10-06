-- Expand the canonical competencies table to cover names already in use
-- across Flight Check, Pitch Studio, and the manager team-readiness heatmap,
-- so cross-feature competency aggregation (Readiness Map) has a real row to
-- resolve onto instead of falling back to synthetic keys.
insert into public.competencies (name, category, description)
values
  ('Discovery', 'Discovery', 'Uncovers business pain, stakeholders, and success criteria before demoing.'),
  ('Objection Handling', 'Discovery', 'Handles pricing, complexity, timeline, and competitive objections.'),
  ('Governance', 'Platform', 'Applies zero standing privilege and lifecycle governance concepts correctly.'),
  ('Agentic AI', 'Platform', 'Explains agent identity, governed action, and non-human identity risk.'),
  ('Competitive Positioning', 'Competitive', 'Positions against directory-only and point-solution competitors.')
on conflict (name) do nothing;
