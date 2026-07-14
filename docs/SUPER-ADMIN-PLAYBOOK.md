# Super-Admin Operational Playbook

**Audience:** Platform operators (`super_admin` role, `tenant_id = null`)  
**App:** SE Enablement Platform — `http://localhost:3000` (dev)

---

## Roles & access model

| Mode | Where | Tier | Data visibility |
|------|-------|------|-----------------|
| **Platform console** | `/platform` | `super_admin` | All tenants (by design) |
| **Shadow admin** | `/admin` (after shadow) | `admin` (effective) | Single shadowed tenant only |
| **Shadow SE** | `/dashboard` (after shadow) | `se` (effective) | Personal SE view in shadowed tenant |

Super-admins bypass RLS at the database layer. **Shadow mode** compensates via:

1. HttpOnly cookies (`shadow_tenant_id`, `shadow_tenant_name`, `shadow_mode`)
2. App-layer `tenantTable(tenantId)` on every admin query
3. `set_session_tenant()` RPC to scope Postgres RLS during shadow sessions

---

## Environment variables (production)

| Variable | Purpose |
|----------|---------|
| `NODE_ENV=production` | Disables dev email domain bypass (`example.com`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client, audit logs, tenant provisioning |
| `PLATFORM_SECRETS_ENCRYPTION_KEY` | Encrypts stored API keys |
| `CRON_SECRET` | Protects `/api/cron/*` endpoints |
| `ALLOW_SHADOW_PROVISIONING_ACTIVATE` | Set `true` only if shadowing into `provisioning` tenants should auto-activate them in prod |

---

## Tenant lifecycle

### 1. Create tenant

**UI:** Platform → Tenants → Create  
**API:** `POST /api/platform/tenants`

```json
{
  "name": "Acme Corp",
  "slug": "acme",
  "adminEmail": "admin@acme.com",
  "adminFullName": "Acme Admin",
  "sendAdminInvite": true,
  "branding": {
    "primaryColor": "#CC27B0",
    "allowedEmailDomains": ["acme.com"]
  }
}
```

- Tenant starts as `provisioning`, then moves to `active` after admin invite step completes.
- Default `platform_settings` row is created automatically.
- Audit: `tenant.created`, optionally `tenant.admin_invited`.

### 2. Invite additional tenant admin

**UI:** Platform → Tenant detail → Invite admin  
**API:** `POST /api/platform/tenants/{id}` with `{ email, fullName, sendInvite }`

If the email belongs to an existing **super_admin**, provisioning fails by design — use shadow mode instead.

### 3. Configure branding & email domains

**API:** `PATCH /api/platform/tenants/{id}` with `branding` payload.

`allowed_email_domains` is enforced at:

- Login callback
- Every authenticated request (middleware)
- User invite/create in admin console

### 4. Feature flags

**UI:** Platform → Tenant → Entitlements (presets + per-flag toggles)  
**API:** `PATCH /api/platform/tenants/{id}/settings` with `{ featureFlags: { ... } }`

Presets: **Full platform**, **SE only**, **AE pilot**, **Manager lite**. The entitlements tab shows a diff from defaults and warns on unsaved changes.

Tenant admins can **view** entitlements in Admin → Settings → Feature flags (read-only). Changes require a support request via Admin → Help.

Audit: `tenant.feature_flags.updated`

### 5. Suspend / reactivate tenant

**UI:** Platform → Tenants → tenant header → Suspend / Reactivate  
**API:** `PATCH /api/platform/tenants/{id}` with `{ status: "suspended" }` or `{ status: "active" }`

Audit: `tenant.status_updated`

### 6. Operator notes

**UI:** Platform → Tenants → Operator notes tab  
**API:** `PATCH /api/platform/tenants/{id}` with `{ operatorNotes: "..." }`

Internal-only context for platform operators (not visible to tenant admins).

---

## Support requests

### Tenant admin submits request

**UI:** Admin → Help → New request  
**API:** `POST /api/admin/support`

```json
{
  "subject": "Enable Gong integration",
  "body": "We need Gong for the Q3 pilot cohort.",
  "priority": "medium"
}
```

Audit: `support.request_created`

### Platform operator triages

**UI:** Platform → Support (global queue) or Tenant → Support tab  
**API:** `GET /api/platform/support`, `PATCH /api/platform/support/{id}`

```json
{ "status": "in_progress", "operatorNotes": "Queued for next release." }
```

Audit: `support.request_updated`

---

## Platform overview (mission control)

**UI:** Platform → **Now** (default landing)  
**API:** `GET /api/platform/mission-control`

Returns:
- **Now** panel — critical/SLA-breached tickets, tenant alerts, maintenance tenants, active shadow count
- **Onboarding funnel** — per-tenant stage (created → admin invited → accepted → users → first activity)
- **Shadow log** — paired `tenant.shadow_started` / `tenant.shadow_ended` audit events
- **Operator digest** — super-admin actions in the last 24h
- **Health + activity** — `lastUserActivityAt`, `lastAiCallAt`, `lastAdminActionAt` per tenant

Legacy overview: `GET /api/platform/overview` (still available).

### Support inbox (operator)

- Assign tickets to operators (`assigned_to`)
- SLA labels by priority (critical 1h, high 4h, medium 24h, low 72h)
- **Operator reply** — tenant-visible in Admin → Help
- **Internal notes** — operator-only
- In-app notifications to tenant on reply/status change; super-admins notified on new tickets

### Maintenance mode

**UI:** Platform → Tenants → Maintenance  
**API:** `PATCH /api/platform/tenants/{id}` with `{ maintenanceMode, maintenanceMessage }`

Non–super-admin users are redirected to `/maintenance` for that tenant.

### Bulk tenant actions

**API:** `POST /api/platform/tenants/bulk`

```json
{ "tenantIds": ["..."], "action": "suspend" | "activate" | "apply_preset", "presetId": "ae-pilot" }
```

### Global search

**UI:** Search bar at top of platform console  
**API:** `GET /api/platform/search?q=acme`

---

## Shadow mode

### Start shadow (admin view)

**UI:** Platform → Tenant → Shadow as admin  
**API:** `POST /api/platform/shadow`

```json
{ "tenantId": "<uuid>", "mode": "admin" }
```

Sets cookies and redirects to `/admin`. All admin APIs use the shadowed `tenantId`.

### Start shadow (SE training view)

```json
{ "tenantId": "<uuid>", "mode": "se" }
```

Redirects to `/dashboard` with SE-tier navigation.

### End shadow

**UI:** Exit shadow banner / Platform nav  
**API:** `DELETE /api/platform/shadow`

Clears cookies; audit: `tenant.shadow_ended`.

### Provisioning tenants

In **production**, shadowing a `provisioning` tenant is **blocked** unless `ALLOW_SHADOW_PROVISIONING_ACTIVATE=true`. In dev, shadow auto-activates provisioning tenants for support convenience.

---

## Verification after shadow (empty tenant)

Shadow into a tenant with **zero users** and confirm:

| Surface | Expected |
|---------|----------|
| Admin → Analytics | 0 users, 0 plans |
| Admin → Users | Empty |
| Admin → Competencies / Corpus / Sims | Empty |
| Admin → Audit log | Only shadow/tenant events for that tenant |
| Manager Command Center (shadow SE) | No cross-tenant roster |

---

## Audit log

All admin/manager/platform mutations write to `audit_logs` via `insert_audit_log` RPC.

**View:** Admin → Audit log (tenant-scoped) or Platform → Audit (cross-tenant).

Key actions: `user.*`, `tenant.*`, `competency.*`, `content_asset.*`, `simulation_template.*`, `corpus.*`, `plan.*`, `tenant.shadow_*`, `coaching_card.reviewed`, `coaching_note.updated`.

---

## Incident response

### Suspected cross-tenant data leak

1. Confirm user role and shadow cookie state (browser devtools → Application → Cookies).
2. Check API response in Network tab — counts should match shadowed tenant.
3. Review `audit_logs` for unexpected `tenant_id` on actor's actions.
4. File issue with route path + user email + shadow state.

### Revoke super-admin access

Update `profiles.role` away from `super_admin` via Supabase dashboard or service-role script. User loses platform console access immediately; existing sessions expire on next MFA-gated request.

### Suspend tenant

Update `tenants.status` to `suspended`. Shadow and tenant member login should fail `canShadowTenantStatus` / access checks.

---

## Database migrations

```bash
npm run db:status    # compare local vs remote
npm run db:push      # apply pending migrations
npm run db:types:patch  # patch tenant_id into database.types.ts after schema changes
```

---

## Support contacts

- **Security audit:** `docs/SECURITY-AUDIT.md`
- **Pentest checklist:** `docs/SECURITY-PENTEST.md`
- **Test gate:** `npm run typecheck && npm test`
