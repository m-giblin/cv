# Demo users (@example.com)

For local testing without real SailPoint accounts, `@example.com` is allowed alongside `@sailpoint.com`.

## Create demo accounts

Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`:

```bash
npm run seed:demo
```

| Role | Email | Password |
|------|-------|----------|
| SE | `demo.se@example.com` | `DemoSE2026!` |
| Manager | `demo.manager@example.com` | `DemoMgr2026!` |

The demo SE reports to the demo manager so simulation coaching cards route to the manager review queue.

## MFA

Demo users still go through TOTP MFA enrollment on first login — use an authenticator app as usual.
