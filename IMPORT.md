# PawPing Finder Reports + Recent Sightings import

1. Run SUPABASE_SIGHTINGS.sql in Supabase SQL Editor.
2. In the workspace, delete pages/admin.js and pages/advanced.js if present.
3. Extract this ZIP and copy all contents into the project root, replacing matching files.
4. Delete package-lock.json once, then run npm install.
5. Run npm run build locally.
6. Commit: git add . && git commit -m "Import finder reports and recent sightings"
7. Push: git push origin main
8. Vercel deploys the main branch.

Existing pets: after signing in once, assign unowned pets with:
update public.cats set owner_id=(select id from auth.users where email='YOUR_EMAIL') where owner_id is null;

Smoke test:
- /owner login
- open a pet profile privately
- submit a sighting
- owner dashboard > Recent sightings
- choose sighting and verify map
- filter by pet
