# TagPing ready-to-deploy starter

Upload the contents of this ZIP to the ROOT of your GitHub repository. Do not upload the enclosing tagping-ready folder.

Required Vercel variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Never use the Supabase service_role or secret key in Vercel NEXT_PUBLIC variables or GitHub.

Optional (error monitoring via Sentry's free plan — app works fine without them, just without error reports):
- NEXT_PUBLIC_SENTRY_DSN
- SENTRY_DSN (same value; can be omitted if NEXT_PUBLIC_SENTRY_DSN is set, since the server config falls back to it)

Staging: there's a second, free Supabase project ("pawping-staging") for testing
schema/RLS changes before they touch real pet data — see supabase/migrations/README.md
for details. In Vercel, set the Supabase variables above to staging's values, but
scoped to the **Preview** environment only (Project Settings → Environment Variables) —
Production stays pointed at the real project. Any branch other than main (or a PR)
then gets a Preview deployment that runs against staging automatically.
