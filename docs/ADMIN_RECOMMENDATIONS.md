# Administration Recommendations

This document outlines what the SE Enablement Platform already supports in **Admin → People** and what we recommend building next for a production-ready enablement program.

---

## Implemented (Admin console)

| Area | Capability |
|------|------------|
| **User lifecycle** | Create, edit, delete users (Auth + profile) without SQL |
| **Identity fields** | Full name, `@sailpoint.com` email, role, SE level, manager assignment |
| **Invites** | Optional password-reset email on create, or show one-time temp password |
| **AI & content** | Save simulation prompt templates and external content asset links |
| **Challenge library** | Save AI-generated challenges to Supabase (manager/admin) |

**Required config:** add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (server-only). Without it, user CRUD returns 503.

---

## High priority (Sprint 5+)

### 1. Plan assignment UI
Admins/managers need to assign onboarding plan templates to SEs, set start dates, mentors, and due dates — without SQL. Include bulk assign for cohorts.

### 2. Onboarding plan builder
CRUD for plan templates: steps (content, challenge, simulation, shadow log), ordering, linked competencies, and default due offsets.

### 3. Competency framework management
Edit competency categories, map competencies to plan steps and coaching cards, and define proficiency rubrics (1–5) used in reviews.

### 4. Audit log & compliance export
Immutable log of admin actions (user create/delete, role changes, plan assignments). CSV export for quarterly reviews.

### 5. Evidence storage (Supabase Storage)
Replace evidence URL text fields with signed uploads (decks, recordings). Bucket policies by org/manager scope.

### 6. Notification center
In-app inbox with mark-read, plus optional email digests for managers (daily review queue summary).

---

## Medium priority

### 7. Bulk user import
CSV upload: name, email, role, level, manager email. Validate `@sailpoint.com`, report row-level errors.

### 8. SSO / SailPoint IdP
Replace password invites with SAML/OIDC via Supabase Auth + corporate IdP. Keeps MFA policy centralized.

### 9. AI prompt administration
Versioned system prompts per use case (challenge gen, simulation persona, coaching card). Admin UI instead of env-only keys.

### 10. Analytics dashboard
Adoption (DAU/WAU), plan completion rates, time-to-ready, manager review SLA, competency gap trends.

### 11. Content library enhancements
File upload, tagging by solution (ISC, IDN, NHI, etc.), link assets to specific plan steps.

### 12. Simulation template library browser
List/edit/archive templates; assign templates to SEs from manager view.

---

## Operational / security

| Item | Why |
|------|-----|
| **Environment separation** | Dev/staging/prod Supabase projects with separate service keys |
| **RLS verification pass** | Automated tests that SEs cannot read other SEs’ submissions |
| **Director vs admin DB parity** | Align `is_admin()` SQL with app RBAC (`director` = admin tier) |
| **Session & MFA policy** | Document recovery flows; optional step-up auth for admin actions |
| **Backup & retention** | Supabase PITR; define retention for transcripts and evidence |

---

## Suggested admin navigation (future)

```
Admin
├── People          ✅ (CRUD)
├── Plans             assign + template builder
├── Competencies      rubrics + mappings
├── Content           assets + storage
├── AI settings       prompts + model config
├── Audit log         export
└── Analytics         program health
```

---

## Quick wins you can do today (no code)

1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` and restart the dev server.
2. Create SE accounts via **Admin → People**; assign managers in the same card.
3. Set redirect URLs in Supabase for password reset and auth callback.
4. Seed plan templates and challenges in Supabase (until plan builder ships).
