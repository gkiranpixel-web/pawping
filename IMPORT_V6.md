# PawPing V6 stable import

This is a complete replacement package, not a patch.

1. In Supabase SQL Editor run only `SUPABASE_V6.sql`.
2. Extract this ZIP and upload all contents to the ROOT of the existing GitHub repository, replacing matching files.
3. Delete `pages/advanced.js` if it still exists in GitHub. V6 does not use it.
4. Commit as `Import PawPing V6 stable`.
5. Keep Vercel variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
6. Deploy the new commit.

If existing pets have no owner, sign in once and then run:
update public.cats set owner_id=(select id from auth.users where email='YOUR_EMAIL') where owner_id is null;

Smoke test: sign in, open pets tab, download QR, submit finder report privately, refresh locations and alerts, export CSV, create a GPS token.

GPS note: V6 registers secure device tokens but does not yet accept physical GPS telemetry. Keep the displayed token private.
