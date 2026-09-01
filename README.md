# TagPing ready-to-deploy starter

Upload the contents of this ZIP to the ROOT of your GitHub repository. Do not upload the enclosing tagping-ready folder.

Required Vercel variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Never use the Supabase service_role or secret key in Vercel NEXT_PUBLIC variables or GitHub.

Optional (error monitoring via Sentry's free plan — app works fine without them, just without error reports):
- NEXT_PUBLIC_SENTRY_DSN
- SENTRY_DSN (same value; can be omitted if NEXT_PUBLIC_SENTRY_DSN is set, since the server config falls back to it)
