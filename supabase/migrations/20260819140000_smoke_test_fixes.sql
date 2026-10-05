-- Functional fixes found during the full-scenario smoke test (see "Smoke Tests 101").

-- ---------------------------------------------------------------------------
-- Issue #5 — "mark learning module complete" always fails.
--
-- POST /api/learn/progress uses .upsert(..., { onConflict: "user_id,module_id" }), which
-- PostgREST issues as INSERT ... ON CONFLICT DO UPDATE. Postgres checks the table's UPDATE
-- policy when planning that statement, and learn_module_progress only had SELECT and INSERT
-- policies — so the call failed with "new row violates row-level security policy (USING
-- expression)" on the very first attempt, not just on repeats. The feature was completely
-- non-functional for every user.
--
-- Owners may update their own progress rows; RLS still prevents touching anyone else's.
-- ---------------------------------------------------------------------------
drop policy if exists learn_progress_update_own on public.learn_module_progress;
create policy learn_progress_update_own on public.learn_module_progress
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
