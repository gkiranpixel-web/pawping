# Migrations

`00000000000000_baseline_snapshot.sql` is a full snapshot of production's
schema (tables, functions, triggers, RLS policies, storage bucket/policies),
captured directly from the live project on 2026-09-01. It fills the gap
described below — everything before `v13` was applied by hand and never
saved as a migration file, so this baseline reconstructs it from the
running database rather than from history. It's written idempotently
(`IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP POLICY IF EXISTS` +
`CREATE POLICY`), so it's safe to run against production too, though it
never needs to be — production already has this schema. Its job is to
stand up a fresh project (staging, or disaster recovery) as an exact
structural replica.

Everything from `v13_generalize_items` onward is tracked here the normal
way: a new timestamped file per schema change, applied via the Supabase
MCP / `supabase db push`.

## Staging

There's a second, free Supabase project — **pawping-staging**
(`qygmwkdzsjabnxiwnjut.supabase.co`) — created from the baseline snapshot
above, in the same org as production. It's structurally identical to
production but starts with zero rows of real data.

Going forward: apply a new migration to `pawping-staging` first, check it
behaves, then apply the same file to production. Never develop directly
against production's data.

One thing staging does NOT inherit automatically: `is_beta_user()` and the
`cats` RLS policies gate the beta features (categories, i18n, reward, trust
badge) to one hardcoded `auth.users` id — production's owner account. That
id doesn't exist in staging's own, separate auth system. To test beta
features on staging, sign in there once (magic link, same email works —
staging has an entirely separate user table), then update the hardcoded
id in `is_beta_user()`, `get_public_item()`, and the two `cats` policies
in a staging-only migration (never touch production's copy of those).

Vercel wiring: staging is meant to be used through Vercel's **Preview**
environment (a separate scope from Production in Project Settings →
Environment Variables) — set `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (and `SUPABASE_SERVICE_ROLE_KEY` /
`ADMIN_EMAIL` for the admin routes) there to staging's values, scoped to
Preview only. Production's env vars, scoped to Production only, keep
pointing at the real project untouched. Push to any branch other than
`main` (or open a PR) to get a Preview deployment that runs against
staging automatically.
