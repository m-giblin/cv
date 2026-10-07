-- A pending rewrite of a playbook chapter or guide (for example a sector-neutral version), kept
-- beside the published text until an admin reviews it, then published or discarded.
alter table public.capability_playbooks add column if not exists draft_body jsonb;
alter table public.capability_playbooks add column if not exists draft_note text;
alter table public.playbook_guides add column if not exists draft_body jsonb;
alter table public.playbook_guides add column if not exists draft_note text;
