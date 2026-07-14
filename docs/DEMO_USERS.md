# Demo users (@example.com)

`@example.com` accounts are for demos and UAT without real SailPoint logins.

## Local development

`@example.com` is allowed automatically when `NODE_ENV` is not `production`.

## Production (Vercel)

Production only allows `@sailpoint.com` unless you set:

```bash
ALLOW_DEV_EMAIL_DOMAIN=true
```

Add that in **Vercel → Project → Settings → Environment Variables** for Production (and Preview if needed), then redeploy. The login page will show both `@sailpoint.com` and `@example.com`.

## Create demo accounts

Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`:

```bash
npm run seed:demo
```

| Role | Email | Password |
|------|-------|----------|
| SE | `demo.se@example.com` | `DemoSE2026!` |
| Manager | `demo.manager@example.com` | `DemoMgr2026!` |

Demo SEs report to real SailPoint managers (`john.barrett@sailpoint.com`, `matt.giblin@sailpoint.com`) — not duplicate `@example.com` manager accounts.

## Sign in as yourself (Matt / John)

Use your real `@sailpoint.com` account. Super-admins can open **Manager → Command Center** to demo their assigned `@example.com` SE roster without a separate manager login.

## MFA

Demo users still go through TOTP MFA enrollment on first login — use an authenticator app as usual.
