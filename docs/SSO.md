# SSO with SailPoint IdP

The platform supports **Supabase SAML SSO** alongside email/password + mandatory MFA.

## Enable in Supabase

1. **Authentication → Providers → SAML 2.0**
2. Configure your SailPoint (or corporate) IdP metadata
3. Set domain to `sailpoint.com`
4. Map attributes: email, name

## App configuration

Add to `.env.local` and Vercel:

```bash
NEXT_PUBLIC_SSO_DOMAIN=sailpoint.com
```

When set, the login page shows **Sign in with SailPoint SSO**.

## Auth flow

```
Login → Sign in with SSO → IdP → /auth/callback → MFA enroll/verify → App
```

Password login remains available for break-glass admin accounts.

## MFA after SSO

SSO satisfies primary auth; users still must complete TOTP MFA (AAL2) per platform policy.

## Redirect URLs

Add to Supabase Auth:

- `http://localhost:3000/auth/callback`
- `https://your-prod-domain/auth/callback`

See `docs/DEPLOY.md` for full production checklist.
