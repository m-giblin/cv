# Supabase migrations

The Supabase CLI is **not** required globally. Use the npm scripts in this repo (they run the local `supabase` dev dependency via `npx`).

## One-time setup

1. **Log in** (opens browser — do this once on your Mac):

```bash
cd ~/Projects/se-enablement-platform
npm install
npm run db:login
```

2. **Link** this repo to your cloud project (`nznsjskqyupzlahivlwg`):

```bash
npm run db:link
```

When prompted for the database password, use the password from **Supabase Dashboard → Project Settings → Database**.

## Apply migrations

```bash
npm run db:push
```

Check what’s applied:

```bash
npm run db:status
```

## If `db push` fails with "already exists"

Your remote database was likely set up before migration history was tracked. **Do not re-run the initial schema.**

1. Mark already-applied migrations as applied (adjust the list if you know fewer were run manually):

```bash
npx supabase migration repair --linked --status applied --yes \
  20260702000000 20260702120000 20260703120000 20260704120000 \
  20260705120000 20260706120000 20260706130000 20260707120000
```

2. Push again:

```bash
npm run db:push
```

3. If a later migration fails because objects already exist (e.g. `manager_coaching_notes`), mark that version applied and push again:

```bash
npx supabase migration repair --linked --status applied --yes 20260709120000
npm run db:push
```

`migration repair` only updates Supabase’s history table — it does not run SQL. Use it when the schema is already on the remote DB.

## If you can’t use the CLI

Paste the combined SQL into **Supabase Dashboard → SQL Editor → New query → Run**:

- `supabase/migrations/20260708120000_review_status_needs_revision.sql`
- `supabase/migrations/20260709120000_manager_coaching_notes.sql`
- `supabase/migrations/20260710120000_security_hardening.sql`

Run each file in order. Skip any that error with “already exists” (those were applied earlier).

## Troubleshooting

| Error | Fix |
|-------|-----|
| `command not found: supabase` | Use `npm run db:push`, not bare `supabase` |
| `Access token not provided` | Run `npm run db:login` |
| `Have you run supabase link?` | Run `npm run db:link` |
| `Cannot find project ref` | Same — link step |
