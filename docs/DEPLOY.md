# Deploying the SE Enablement Platform

This guide covers Vercel deployment and Supabase production configuration for Sprint 5.

---

## 1. Prerequisites

- GitHub repo connected to Vercel
- Supabase project (production or staging)
- All migrations applied, including:
  - `supabase/migrations/20260702000000_initial_schema.sql`
  - `supabase/migrations/20260702120000_require_mfa_aal2.sql`
  - `supabase/migrations/20260703120000_sprint5_audit_storage.sql`

---

## 2. Vercel environment variables

In **Vercel → Project → Settings → Environment Variables**, set:

| Variable | Scope | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production only | Server-only — Admin user CRUD |
| `NEXT_PUBLIC_SITE_URL` | Production | e.g. `https://se-enablement.yourdomain.com` |
| `XAI_API_KEY` or `OPENAI_API_KEY` | Production | Fallback when no admin-managed key is stored |
| `AI_PROVIDER` | Production | `xai` or `openai` |
| `PLATFORM_SECRETS_ENCRYPTION_KEY` | Production only | Server-only AES key for admin-managed AI API keys in Supabase. Generate with `openssl rand -base64 32`. Never store in the database. |
| `FORGE_API_KEY` | Production, Preview | Server-only — UAT bug tracker writes to Forge (project SEENA). Never expose to the browser. |
| `FORGE_API_BASE_URL` | Production, Preview | Optional; defaults to `https://forge-nu-ochre.vercel.app` |
| `FORGE_PROJECT_KEY` | Production, Preview | Optional; defaults to `SEENA` |
| `FORGE_ASSIGNEE_EMAIL` | Production, Preview | Optional; defaults to `matt.j.giblin@gmail.com` |

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `PLATFORM_SECRETS_ENCRYPTION_KEY` to the browser or commit them to git.

### Admin-managed AI keys

When an admin saves a vendor/model/key in **Admin → AI & prompts**, the raw API key is encrypted with **AES-256-GCM** before it is written to `platform_settings.api_key_ciphertext`. Only ciphertext is stored in Postgres. Decryption happens on the server at request time using `PLATFORM_SECRETS_ENCRYPTION_KEY`.

If that env var is missing, saving a new key from the admin UI will fail. Existing env-based keys (`XAI_API_KEY` / `OPENAI_API_KEY`) still work as a fallback.

---

## 3. Supabase Auth redirect URLs

In **Supabase → Authentication → URL configuration**, add:

**Site URL (production):**
```
https://your-vercel-domain.vercel.app
```

**Redirect URLs:**
```
https://your-vercel-domain.vercel.app/auth/callback
https://your-vercel-domain.vercel.app/auth/reset-password
http://localhost:3000/auth/callback
http://localhost:3000/auth/reset-password
```

---

## 4. Deploy to Vercel

### Option A — Vercel CLI

```bash
cd ~/Projects/se-enablement-platform
npx vercel
npx vercel --prod
```

### Option B — Git push

Push to the connected branch; Vercel builds automatically via `vercel.json`.

---

## 5. Post-deploy checklist

- [ ] Sign in with a `@sailpoint.com` test account
- [ ] Complete MFA enrollment
- [ ] Admin → People: create a test SE user
- [ ] Admin → Plans: create template and assign to SE
- [ ] SE submits challenge with file upload (evidence bucket)
- [ ] Manager reviews submission; plan progress updates
- [ ] Admin → Audit log: verify entries + CSV export
- [ ] Admin → Analytics: verify metrics load

---

## 6. Storage bucket

Sprint 5 migration creates a private `evidence` bucket. SEs upload to `{userId}/{filename}`; managers in their org can read via signed URLs.

If uploads fail with "Bucket not found", re-run:
```sql
-- From supabase/migrations/20260703120000_sprint5_audit_storage.sql
```

---

## 7. Troubleshooting

| Issue | Fix |
|-------|-----|
| Admin user CRUD returns 503 | Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel env |
| MFA redirect loop | Ensure AAL2 migration applied + TOTP enabled in Supabase Auth |
| MFA QR shows `localhost:3000` | Set Supabase **Site URL** to your production domain; app passes `issuer` on enroll — reset MFA and re-scan after changing |
| Password reset link invalid | Add prod URL to Supabase redirect URLs |
| File upload fails | Run Sprint 5 migration; check bucket policies |
| Audit log empty | Run Sprint 5 migration; perform an admin action |

---

## 8. Recommended next steps

- Custom domain + HTTPS
- Separate Supabase projects for staging vs production
- Email digest for manager review queue (SendGrid/Resend)
- SSO via SailPoint IdP (SAML/OIDC)
