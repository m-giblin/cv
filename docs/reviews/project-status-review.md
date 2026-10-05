# SE Enablement Platform: Project Status Review

Reviewed 2026-10-04 on branch `cursor/se-enablement-platform-8a95` (read-only; no source modified). Last commit: 2026-07-17 (`49ed7b0`). Uncertainty is flagged inline.

## 1. What it is

An internal SailPoint Sales Engineer onboarding, enablement and manager-coaching platform (`README.md`, `docs/PRODUCT_AND_SECURITY_REVIEW.md`). SEs follow ramp plans, practice challenges and AI role-play simulations, record pitches, build deal-prep briefs and take certifications. Managers get a command center, action inbox, readiness map, plan assignment and coaching sign-offs. Admins get content, people and security settings. A super-admin Platform Console handles multi-tenant operations.

**Stack:** Next.js 15.5 App Router, React 19, strict TypeScript 6, Tailwind 4, Supabase (Auth, Postgres, RLS, Storage), Vercel AI SDK (xAI default, OpenAI alternate), Zod, TanStack Query. Deployed on Vercel (`vercel.json`: two crons, `manager-digest` weekly and `review-reminders` daily).

**Layout:** `app/` has 35 pages and 148 `route.ts` handlers. API areas: admin, ai, assessments, buyer-shares, certifications, challenges, coaching-notes, corpus, cron, deal-prep, dev-plans, integrations (Gong), isc-lab, learn, manager, market-pulse, mentor, plans, platform, simulations, uat-bugs and others. `lib/` holds domain logic per feature, `components/` holds UI per feature, `supabase/migrations/` has 58 files, `tests/` has 17 files, `scripts/` has seed and ops scripts.

**Auth and tenancy:**
- Email and password for `@sailpoint.com` accounts, plus mandatory TOTP MFA (AAL2) enforced in `middleware.ts` and by RESTRICTIVE RLS policies.
- Roles include basic_se, senior_se, advisory, manager, director, admin and super_admin, plus "workspace hats" (`lib/auth/workspace.ts`).
- Multi-tenant via `tenant_id` and the helpers `can_access_profile`, `can_access_tenant_row`, `is_super_admin` and `current_tenant_id`. Super admins can "shadow" a tenant (`lib/auth/shadow-tenant.ts`).
- Per-tenant SSO metadata (`lib/platform/tenant-sso.ts`, `docs/SSO.md`). AI keys are encrypted with `PLATFORM_SECRETS_ENCRYPTION_KEY`.

**Integrations:** Gong (OAuth, brief and intel routes), Forge bug tracker (UAT widget and session-replay SDK), Resend email for digests, xAI and OpenAI.

**Env:** `.env.example` lists Supabase URL, anon key and service-role key, AI keys, `PLATFORM_SECRETS_ENCRYPTION_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, SSO domain, and `FORGE_*`. Gong client vars are not in `.env.example` (unverified; check the Gong route code).

## 2. Current state

### Feature maturity

Ratings come from commit history, `docs/SPRINTS.md` and the smoke-test report. I did not run the app myself, so "done" means "exercised by the 2026-07-29 smoke run, or shipped in commits".

| Area | Rating | Evidence |
|---|---|---|
| Auth, MFA, middleware, RBAC | Done | Smoke run: RBAC denials correct, MFA flow works (local) |
| SE dashboard, ramp plans, plan calendar | Done | Smoke run; calendar nav bug fixed |
| Manager command center, inbox, coaching sign-offs, assign plans | Done | Smoke run, UI pass |
| Challenges, pitch studio, certifications | Done | Smoke run |
| Simulations and AI coaching cards | Done, with a fixed 500 bug | Smoke #11 |
| Deal prep | Done, with a fixed 500 bug | Smoke #4 |
| Learn modules progress | Was broken, fix uncommitted | Smoke #5, `20260819140000` |
| Admin (people, content, settings) | Mostly done | Security panel is new and uncommitted |
| Platform Console and super-admin ops | Done but being reworked | `components/platform/platform-console.tsx` (about 300 changed lines) |
| Tenant SSO | Partial. Metadata is stored encrypted; I did not verify an actual SSO login flow | `docs/SSO.md` |
| Gong integration | Partial. Token encryption is uncommitted. Needs live Gong credentials, untested in smoke | `lib/integrations/oauth-tokens.ts` |
| Readiness map v2, competency expansion | Partial (WIP, uncommitted) | See below |
| Growth readiness (SE-facing) | Partial (WIP, new) | `app/growth/readiness`, `app/api/growth` |
| Market pulse, ISC Lab, corpus | Present; not covered by the smoke run | not assessed in depth |
| Sprint 9 "production harden" | Not done | `docs/SPRINTS.md` still lists it as NEXT: prod redirect URLs, Resend, AI prompt versioning, RLS integration tests against staging |

### Uncommitted work-in-progress

There are 68 changed paths: 38 modified files (+1134/-387) plus untracked files.

1. **Security audit remediation** (smoke-test report, 2026-07-29), and it looks complete.
   - Migrations `20260819130000_rls_cross_tenant_fixes.sql`, `20260818120000_rls_tenant_scoping_hardening.sql`, `20260818130000_encrypt_tenant_sso_metadata.sql`, `20260819120000_data_api_grants.sql`, `20260819140000_smoke_test_fixes.sql`.
   - `lib/integrations/oauth-tokens.ts` and the Gong routes.
   - `app/api/admin/security`, `components/admin/admin-security-panel.tsx`.
   - Fixes in `app/api/deal-prep/sessions/route.ts`, `app/api/simulations/coaching-cards/route.ts`, `lib/plans/step-prerequisites.ts` and `lib/auth/workspace.ts`.
   - The critical self-promotion-to-super_admin fix (SEC-03) lives only in these uncommitted files.
2. **Migration bootstrap fixes** so an empty DB can be provisioned: `20260702110000_tenants_bootstrap.sql` (new), edits to `20260702000000_initial_schema.sql` and `20260710140000_activity_tenant_id.sql`, and `supabase/config.toml` (TOTP enabled).
3. **Readiness v2:** `20260817120000_expand_competencies.sql`, `20260817130000_readiness_v2.sql`, `lib/competencies/`, `lib/manager/readiness-map-data.ts` (+365 lines), `readiness-map-fetch.ts`, `readiness-nudges.ts`, `components/manager/readiness-map.tsx`, `app/api/manager/readiness-flags`, `app/api/admin/readiness-outcome-correlation`, `components/growth/my-readiness-card.tsx`, `manager-priority-digest.tsx`. Typecheck and tests pass with it, but I could not confirm product completeness.
4. **Platform console UX:** `platform-tenant-table.tsx`, `platform-unsaved-banner.tsx`, `use-dirty-form.ts`, `components/ui/confirm-dialog.tsx`, and the tenant-ops panels. It looks like a refactor in progress.
5. **Tenant offboarding:** `20260818140000_tenant_offboarded_status.sql`, `lib/tenant/*`, `tenant-health.ts`.
6. **Scratch and evidence:** `.smoke/`, `Smoke Tests 101.md`, `Security Audit Findings.xlsx`, `.claude/launch.json`.

**Risk of leaving it uncommitted:** all of it lives only on one machine, with a Critical privilege-escalation fix among it. `git status` shows the branch tracking origin with nothing pushed for this work.

**Highest-risk item:** `.smoke/` is not in `.gitignore`. It contains `totp-secrets.json` (TOTP seeds for the seeded accounts), `env.local.remote-backup` (the original remote Supabase env values, likely including keys), and `out/*.json` run logs. A careless `git add .` would commit them. The seeded accounts use a shared password documented in plain text in `Smoke Tests 101.md`. The accounts are local only, but the backup env file is the real concern.

## 3. Health checks

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Pass, no errors |
| `npm test` (vitest) | Pass: 17 files, 152 tests, 1.2 s |
| `npm run lint` | No errors; 59 warnings, nearly all unused vars/imports (e.g. `lib/plans/program-tracker-view.ts`, `lib/data/*`) |
| `next build` | Not run (needs env). Last commit message says a lint-error build blocker was fixed |
| `npm outdated` | Minor/patch drift across the board (next 15.5.20 vs 15.5.27, supabase-js 2.110 vs 2.117, ai 7.0.11 vs 7.0.127). Majors available: next 16, eslint 10, vitest 5, typescript 7, `@ai-sdk/xai` 5. No audit run (`npm audit` not executed) |

**Test coverage is thin.** The tests are pure unit and policy-string checks. There are no integration tests against a database, so RLS correctness is verified only by the ad-hoc `.smoke/` scripts, which are not wired into `npm test`. No CI config was found in the repo (no `.github`; unverified).

### Environment: the Supabase project is gone

`Smoke Tests 101.md` reports that the project in `.env.local` (`nznsjskqyupzlahivlwg`, also hard-coded in `package.json` `db:link`) returned NXDOMAIN on 2026-07-29. I did not re-check. If true, production has no database until a new project is provisioned or the old one is restored (it may be a paused project, possibly restorable). `.env.local` now points to a local Supabase stack. This is the single largest unknown.

### Migration hygiene

- Two already-applied migrations were edited in place (`20260702000000_initial_schema.sql`, `20260710140000_activity_tenant_id.sql`). A new migration was inserted at `20260702110000`, earlier than migrations already applied remotely. `supabase db push` will likely refuse out-of-order versions without `--include-all`. Verify with `supabase migration list` against the real target.
- 58 files, mostly idempotent. The security migrations are large (`20260819130000` is 335 lines) and need a reviewed apply on staging first.
- `20260819120000_data_api_grants.sql` matters: per the smoke report, Supabase removes the auto-expose default on 2026-10-30, which is about four weeks away. Without these grants a new or re-provisioned project returns "permission denied".
- The smoke report recommends a CI `supabase db reset` job; none exists.
- `supabase/config.toml` change (TOTP on) is correct and needed.
- `lib/database.types.ts` was hand-patched (`db:types:patch`); regenerate once a DB exists.

### Security audit (`Security Audit Findings.xlsx`; the sheet and the doc disagree slightly on counts)

The workbook summary says 19 findings: 1 Critical, 7 High, 7 Medium, 4 Low, with 15 fixed and 3 open. The markdown says 1/7/6/5. Treat the exact counts as approximate.

- **Fixed in uncommitted work:** SEC-03 (tenant admin to super_admin), cross-tenant leaks and writes (SEC-01, 02, 05, 06, 07, 08, 09, 13, 18, 19), SEC-15 (plaintext Gong tokens), SEC-21 to 23 (migrations, grants, MFA config). Re-test of 13 isolation checks passed locally.
- **Open (recommendation only):**
  - SEC-16: `evidence` storage readable by any admin in any tenant.
  - SEC-17: `content` bucket readable by any authenticated user. The fix requires migrating object paths to tenant-keyed paths.
  - SEC-24: Forge SDK session replay is enabled globally and records `/login` and the MFA pages (`components/forge/forge-sdk-init.tsx` line 45, `sessionReplay: true`, loaded from `app/layout.tsx`).
  - SEC-20: about 30 policies target `public` rather than `authenticated` (low; mitigated by the grants file not granting `anon`).
- **Issues #8, #9, #12** (smoke doc) are logged, not fixed: `/api/simulations/assignments` GET returns templates; `PATCH /api/plans/templates/[id]` requires full `steps`; coaching sign-off is not modelled in the Zod schema.
- **Earlier reviews:** `docs/SECURITY-AUDIT.md`, `docs/SECURITY-PENTEST.md` and `docs/PRODUCT_AND_SECURITY_REVIEW.md` exist; I only skimmed them.

### Smoke test summary

Dana (manager) plus six employees ran about 600 checks against a local rebuild. Real bugs were found and fixed (#1 to #7, #11); all are in uncommitted changes. Pattern to grep for: best-effort side effects after the primary write with no try/catch (`submit*PlanSteps(`, `link*PlanSteps(`).

## 4. Code-quality notes

- **TODO/FIXME/HACK:** none found in `app/`, `lib/`, `components/` or `scripts/`. Open work is tracked in docs instead (`docs/SPRINTS.md`, `docs/ADMIN_RECOMMENDATIONS.md`).
- **Dead code:** 59 lint warnings for unused symbols; `DEMO_GROWTH_PLAN` and `lib/demo-data.ts` suggest a demo-data fallback path that renders when Supabase is not configured (README). Consider whether that fallback is a production risk.
- **Repo clutter:** `Design Archive/`, `design_handoff_*/` folders (about 1.5 MB), `Contact.html`, `index.html` (leftover "cv website" files from the initial commit; `package.json` repository URL points to `m-giblin/cv`), five `.zip` design files (gitignored), `tsconfig.tsbuildinfo`.
- **Duplication:** unverified at depth. `readiness-map-data.ts` was refactored to share logic with the API (`readiness-map/route.ts` lost 81 lines), a good sign.
- **Docs:** README is stale (lists a handful of routes; says apply one migration; omits tenancy, Gong, platform console). `docs/SPRINTS.md` is stale. No architecture or runbook doc on the tenant model beyond `SUPER-ADMIN-PLAYBOOK.md`, `SUPABASE_MIGRATIONS.md` and `DEPLOY.md`.
- **Tests missing for:** RLS and tenant isolation (only manual `.smoke/` scripts), API route handlers, the Gong flow, the readiness v2 logic, middleware.

## 5. Prioritized roadmap

### P0 (blockers, security, data loss)

| # | Item | Effort | Paths |
|---|---|---|---|
| 1 | Confirm whether the Supabase project `nznsjskqyupzlahivlwg` exists (dashboard, restore if paused). Decide: restore or reprovision. Update `package.json` `db:link` and Vercel env. | S to M | `package.json`, `.env.local`, Vercel settings |
| 2 | Add `.smoke/` to `.gitignore` and move `env.local.remote-backup` and `totp-secrets.json` out of the repo before any commit. Rotate any keys in the backup env if they are still live. | S | `.gitignore`, `.smoke/` |
| 3 | Commit and push the security remediation as its own commits (migrations, oauth-tokens, route fixes, config.toml). Includes the SEC-03 critical fix. | S | files listed in section 2.1/2.2 |
| 4 | Apply the security migrations to staging, then prod, in order (`supabase migration list`; resolve the out-of-order `20260702110000`; handle edited-in-place migrations). Re-run `.smoke/tenant-isolation-test.mjs` and `.smoke/rls-audit.mjs`. | M | `supabase/migrations/20260818*`, `20260819*` |
| 5 | Ensure grants migration lands before 2026-10-30 (Supabase default change). | S | `20260819120000_data_api_grants.sql` |
| 6 | Existing Gong tokens are plaintext in any live DB: run a one-time re-encrypt or force reconnect after the SEC-15 code ships. | S to M | `lib/integrations/oauth-tokens.ts`, `app/api/integrations/gong/*` |
| 7 | Decide on SEC-24 session replay of login/MFA pages: disable or mask. | S | `components/forge/forge-sdk-init.tsx`, `app/layout.tsx` |

### P1

| # | Item | Effort | Paths |
|---|---|---|---|
| 8 | Close SEC-16/17 (storage policies; tenant-keyed paths plus data migration). | M to L | storage policies, `lib/evidence`, `app/api/uploads`, `app/api/content` |
| 9 | Finish and commit readiness v2 and the platform console refactor in themed commits; review for completeness first. | M | section 2.3 and 2.4 files |
| 10 | CI: typecheck, lint, test, `supabase db reset`, and a smoke/isolation job. | M | new `.github/workflows` |
| 11 | Wire `.smoke/` isolation and RLS tests into a proper repeatable suite (non-secret fixtures). | M | `.smoke/*`, `tests/` |
| 12 | Dependency patch/minor upgrade, then `npm audit`; `next build` verification. | S | `package.json` |
| 13 | Sprint 9 items: prod redirect URLs, Resend, AI prompt versioning, staging RLS tests. | M | `docs/SPRINTS.md` |

### P2

| # | Item | Effort | Paths |
|---|---|---|---|
| 14 | API contract cleanups #8, #9, #12 and SEC-20 (`public` to `authenticated` policy roles). | M | `app/api/simulations/assignments`, `app/api/plans/templates/[id]`, review routes |
| 15 | Clear 59 lint warnings and dead demo code; remove stray `index.html`, `Contact.html`, fix repo URL. | S | various |
| 16 | Refresh README, SPRINTS and add an architecture/tenancy doc. | S to M | `README.md`, `docs` |
| 17 | Regenerate `lib/database.types.ts` from a real DB. | S | `lib/database.types.ts` |
| 18 | Major upgrades (Next 16, ESLint 10, vitest 5) when stable. | M | `package.json` |

## 6. Recommended first week back

- **Day 1:** Items 1 and 2. Check that the Supabase project exists, fix `.gitignore` for `.smoke/`, rotate anything sensitive. Do nothing else until you know whether prod has a database.
- **Day 2:** Review the uncommitted diff, commit in themed commits (security, migrations, readiness, platform console, docs/evidence), push the branch, and open a PR.
- **Day 3:** Stand up a staging Supabase (via `supabase db reset` to prove the migration set), run `npm run build`, run the `.smoke/` isolation scripts.
- **Day 4:** Apply to prod with a backup; handle the Gong token re-encryption and the grants migration. Decide on SEC-24.
- **Day 5:** Add a minimal CI workflow, patch-level dependency bump, and plan SEC-16/17 and the Sprint 9 items.

## Uncertainties

I did not run the app or `next build`. I did not verify the remote Supabase status, whether prod already has any of these migrations applied, or whether the Vercel deployment is live. The feature ratings rely on the smoke report and commit history. Finding counts differ between the xlsx and the markdown.
