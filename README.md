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

The UI renders with realistic demo data if Supabase and AI keys are not configured. AI endpoints return deterministic structured fallback payloads without provider secrets.

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