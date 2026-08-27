# PawPing Weekend Complete import

Included: owner dashboard, multi-user isolation, pet creation, photos, QR download, status, public finder report, recent sightings timeline/filter/map, installable PWA, read-only admin dashboard for users/cats/reports.
Excluded: GPS, Stripe, subscriptions, AI.

1. Run SUPABASE_WEEKEND_COMPLETE.sql in Supabase SQL Editor.
2. Delete old pages/admin.js and pages/advanced.js before importing.
3. Upload all files and folders from this package to the GitHub repository root, replacing matching files.
4. Delete package-lock.json so Vercel installs cleanly.
5. Add Vercel server variables: SUPABASE_SERVICE_ROLE_KEY and ADMIN_EMAIL. Do NOT prefix the service key with NEXT_PUBLIC_.
6. Keep NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
7. Commit directly to main as: Import PawPing Weekend Complete
8. Test /owner, finder report, Recent sightings and /admin.

Existing pets after owner login:
update public.cats set owner_id=(select id from auth.users where email='YOUR_EMAIL') where owner_id is null;
