# Security Audit — SE Enablement Platform (Multi-Tenant)

**Date:** 2026-07-09  
**Scope:** Full platform — tenant isolation, authZ, data leakage, secrets, input validation, uploads  
**Status:** Phase 1–3 remediation complete

---

## Executive summary

The platform has a solid multi-tenant foundation (RLS, `tenant_id` columns, super-admin platform console, shadow mode). **Super-admin RLS bypass** plus **inconsistent application-layer tenant scoping** created real cross-tenant data leakage — notably Analytics showing main-tenant counts in an empty AE tenant while shadowing.

All Phase 1–3 remediations are complete. Operational docs and pentest checklist are in `docs/SUPER-ADMIN-PLAYBOOK.md` and `docs/SECURITY-PENTEST.md`.

| Severity | Open | Fixed |
|----------|------|-------|
| Critical | 0    | 3     |
| High     | 0    | 10    |
| Medium   | 0    | 8     |
| Low      | 0    | 5     |

---

## Architecture: tenant isolation model

```
┌─────────────────────────────────────────────────────────────┐
│  Request                                                     │
│    → middleware (auth, MFA, email domain, page + API RBAC)    │
│    → API route (require*Session + tenantTable)                │
│    → Data layer (tenant-scoped fetch / service-role + filter) │
│    → Postgres RLS (can_access_tenant_row + effective_tenant)  │
└─────────────────────────────────────────────────────────────┘
```

**Key risk (mitigated):** `is_super_admin()` in RLS grants read/write across all tenants. Shadow mode sets `app.tenant_id` via `set_session_tenant()` when super-admins shadow, and all admin/shadow paths use `tenantTable(tenantId)` / `fetchTenantDashboard()`.

**Defense in depth:** Admin and shadow paths use `tenantTable(tenantId)`; super-admin shadow sessions call `applySessionTenant()` to scope RLS at the DB layer.

---

## Findings

### CRITICAL

#### C1 — Super-admin RLS bypass without app-layer tenant filter
- **Status:** **MITIGATED** — `tenantTable()` + `effective_tenant_id()` / `set_session_tenant()`; platform console retains cross-tenant visibility by design.

#### C2 — Legacy `getDashboardData()` loads global dataset
- **Status:** **FIXED** — `fetchTenantDashboard()` scopes by tenant + role.

#### C3 — Demo data fallback masks empty tenant / auth failures
- **Status:** **FIXED**

---

### HIGH

#### H1–H10 — Admin/manager isolation, API RBAC, email domains, login disclosure
- **Status:** **FIXED** (see prior audit entries)

---

### MEDIUM

#### M1 — `database.types.ts` missing `tenant_id`
- **Status:** **FIXED** — `npm run db:types:patch`

#### M2 — Shadow cookies client-controlled
- **Status:** **MITIGATED**

#### M3 — Shadow auto-activates provisioning tenants
- **Status:** **FIXED** — gated in production

#### M4 — `savePlatformSettings` uses user client
- **Status:** **FIXED** — service-role admin client

#### M5 — Dashboard loaders unscoped
- **Status:** **FIXED**

#### M6 — Public share endpoints
- **Status:** **MITIGATED** — rate limiting in middleware

#### M7 / M8 — Cron secret / dev email bypass
- **Status:** **OK** — ops checklist in playbook

---

### LOW

| ID | Finding | Status |
|----|---------|--------|
| L1 | CSRF mitigation | OK |
| L2 | MFA AAL2 | OK |
| L3 | Upload limits | OK |
| L4 | API key encryption | OK — verify key in prod |
| L5 | Audit logging coverage | **FIXED** — all admin/manager mutations; `tests/audit-coverage.test.ts` |

---

## Remediation plan

### Phase 1 — Immediate ✅
- [x] Tenant-scope admin analytics, audit log, competencies, content assets, simulation templates
- [x] Tenant-scope admin page data + plans bundle
- [x] Remove demo fallback for authenticated users
- [x] Shadow-aware manager session

### Phase 2 — Before next tenant ✅
- [x] Patch `database.types.ts` with `tenant_id`
- [x] Scope `getDashboardData()` via `fetchTenantDashboard()`
- [x] Per-tenant email domains (login / invite / middleware)
- [x] API route security matrix + tests
- [x] DB `effective_tenant_id` + `set_session_tenant`

### Phase 3 — Hardening ✅
- [x] Rate limit `/api/share/*`
- [x] Audit coverage on all admin/manager mutations (`tests/audit-coverage.test.ts`)
- [x] Pentest checklist + automated invariants (`docs/SECURITY-PENTEST.md`, `tests/security-pentest.test.ts`)
- [x] Super-admin operational playbook (`docs/SUPER-ADMIN-PLAYBOOK.md`)

---

## Verification

```bash
npm run typecheck && npm test
npm run test:pentest   # live DB + API RBAC + rate limit checks
```

Manual sign-off: `docs/SECURITY-PENTEST.md` (shadow into empty AE tenant in browser).

---

## Change log

| Date | Author | Notes |
|------|--------|-------|
| 2026-07-09 | Security audit | Phase 1: tenant scoping, demo fallback removal |
| 2026-07-09 | Security audit | Phase 2: dashboard loader, API RBAC, email domains, DB session tenant |
| 2026-07-09 | Security audit | Phase 3: audit coverage, pentest docs/tests, super-admin playbook |
