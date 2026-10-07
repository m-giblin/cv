-- Practice drills generated from capability playbooks, and video / voice / typed pitch answers.

-- Pitch scenarios made from a playbook keep the guide's pitch as the reference the AI scores
-- against, remember their source version, and stay out of automatic queue filling.
alter table public.pitch_scenario_templates
  add column if not exists reference_text text,
  add column if not exists source_playbook_id uuid references public.capability_playbooks(id) on delete set null,
  add column if not exists source_version integer,
  add column if not exists response_modes text[] not null default '{video}',
  add column if not exists auto_queue boolean not null default true;

create index if not exists pitch_scenario_templates_source_idx
  on public.pitch_scenario_templates (source_playbook_id)
  where source_playbook_id is not null;

alter table public.simulation_templates
  add column if not exists source_playbook_id uuid references public.capability_playbooks(id) on delete set null,
  add column if not exists source_version integer;

create index if not exists simulation_templates_source_idx
  on public.simulation_templates (source_playbook_id)
  where source_playbook_id is not null;

-- A pitch can be recorded on video, recorded as voice, or typed. Typed pitches have no file.
alter table public.pitch_submissions
  add column if not exists response_mode text not null default 'video',
  add column if not exists transcript text,
  add column if not exists duration_sec integer;

alter table public.pitch_submissions alter column evidence_path drop not null;

do $$ begin
  alter table public.pitch_submissions
    add constraint pitch_submissions_response_mode_check check (response_mode in ('video', 'voice', 'text'));
exception
  when duplicate_object then null;
end $$;

alter table public.pitch_practice_sessions
  add column if not exists response_mode text not null default 'video',
  add column if not exists transcript text,
  add column if not exists duration_sec integer;

do $$ begin
  alter table public.pitch_practice_sessions
    add constraint pitch_practice_sessions_response_mode_check check (response_mode in ('video', 'voice', 'text'));
exception
  when duplicate_object then null;
end $$;
