# SE Enablement & Onboarding Platform

Internal SailPoint MVP for Sales Engineer onboarding, manager visibility, dynamic practice challenges, and AI-powered simulation coaching.

## Stack

- Next.js 15 App Router with strict TypeScript
- Tailwind CSS v4 with shadcn-style local UI primitives
- Supabase Auth, Postgres, Storage, RLS, and hierarchy helper functions
- Vercel AI SDK with xAI Grok as the default configurable provider and OpenAI as an alternate
- React Hook Form + Zod, TanStack Query, Sonner, date-fns, Lucide icons

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

The UI renders with realistic demo data only when Supabase is not configured. Once Supabase env vars are present, sign-in and mandatory MFA are enforced.

## Authentication and mandatory MFA

1. In Supabase Dashboard → **Authentication → Providers**, enable **Email** and create your user (or invite team members).
2. In **Authentication → Multi-Factor**, enable **TOTP (Authenticator app)**.
3. Run the MFA enforcement migration: `supabase/migrations/20260702120000_require_mfa_aal2.sql`
4. Start the app and visit `/login`.

Sign-in flow:

- `/login` — `@sailpoint.com` email + password only
- `/auth/mfa/enroll` — first-time TOTP setup (QR code + verification code)
- `/auth/mfa/verify` — enter authenticator code on every subsequent sign-in

Only `@sailpoint.com` accounts are accepted. Non-SailPoint sessions are signed out automatically.

Users cannot reach dashboards until they complete MFA (AAL2). Database RLS policies also require `aal2` in the JWT.

## Supabase

Apply the migration in `supabase/migrations/20260702000000_initial_schema.sql`.

The migration includes:

- `profiles.manager_id` self-reference
- Recursive `get_profile_subtree(root_profile_id)` helper
- `can_access_profile(target_profile_id)` RLS helper
- Core onboarding, challenge, simulation, coaching card, timeline, notification, content, competency, and AI config tables
- RLS policies on every table
- Timeline/audit triggers for challenge reviews and coaching-card reviews

After linking a Supabase project, replace `lib/database.types.ts` with generated types:

```bash
supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" > lib/database.types.ts
```

## Routes

- `/dashboard` - SE personal dashboard
- `/manager` - hierarchy-aware manager dashboard
- `/plans` - plan assignments and step tracking
- `/challenges` - curated + AI-generated challenge flow
- `/simulations` - role-play workspace + coaching-card generation
- `/admin` - user hierarchy, AI provider, content, and prompt configuration

## Verification

```bash
npm run typecheck
npm run build
```