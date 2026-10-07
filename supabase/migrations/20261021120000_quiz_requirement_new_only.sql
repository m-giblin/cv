-- Only chapter assignments made from now on require the knowledge check; earlier ones keep their original parts.
update public.playbook_assignments
set require_quiz = false
where created_at < '2026-10-07T23:59:59Z';
