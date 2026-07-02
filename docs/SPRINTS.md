# SE Enablement Platform — Sprint Roadmap

## Sprints 1–6 (DONE)

Foundation through growth operating system (development plans, accountability, analytics).

---

## Sprint 7 — Scale & integrate (DONE)

- [x] Readiness certification gates (`/certifications`)
- [x] Deal-context AI prep (`/prep`, `/api/ai/deal-prep`)
- [x] Bulk user CSV import (Admin → People)
- [x] SSO login button + `docs/SSO.md`
- [x] Simulation assign from manager UI (`/simulations`)
- [x] Coaching card persistence to DB + manager notification
- [x] Vitest test suite (`npm run test`)

---

## Sprint 8 — Admin depth & content (DONE)

- [x] Competency framework CRUD (Admin → Competencies)
- [x] Simulation template library browser (Admin → AI)
- [x] Analytics CSV export
- [x] Content storage bucket (`content`) for future file uploads
- [x] Competency rubric column on DB

---

## Sprint 9 — Production harden (NEXT)

- [ ] Production Vercel deploy + prod Supabase redirect URLs
- [ ] Resend email for weekly digest in prod
- [ ] Readiness certification roster view for directors
- [ ] Deal prep save/history per account
- [ ] AI prompt versioning in admin UI
- [ ] Full RLS integration tests against staging Supabase

---

## Migrations to run

1. `20260703120000_sprint5_audit_storage.sql`
2. `20260704120000_development_plans.sql`
3. `20260705120000_sprint7_s8.sql`

## Env vars

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Weekly manager digest cron |
| `RESEND_API_KEY` | Optional digest email |
| `NEXT_PUBLIC_SSO_DOMAIN` | Show SSO button on login |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin user CRUD + bulk import |

## Commands

```bash
npm run dev
npm run test
npm run typecheck
npm run build
```
