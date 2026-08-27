# PawPing V2 - import instructions

## 0. Preserve the working V1
In the GitHub Codespace terminal run:
```bash
git tag v1-working
git push origin v1-working
```

## 1. Supabase
Open `SUPABASE_V2.sql`, copy the complete file into Supabase > SQL Editor > New query, and Run.

If existing pets do not appear in the owner dashboard, sign in once and then run this separately after replacing the email:
```sql
update public.cats
set owner_id=(select id from auth.users where email='YOUR_EMAIL')
where owner_id is null;
```

## 2. GitHub import
Extract this ZIP. Upload the CONTENTS of its folder to the ROOT of the existing `pawping` repository and replace matching files. `package.json` must be at repository root. Commit message: `Import PawPing V2`.

## 3. Vercel
Keep these variables:
- `NEXT_PUBLIC_SUPABASE_URL` = base project URL only, with no `/rest/v1/`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = publishable/anon key

The GitHub commit triggers a deployment. Open the deployment for `Import PawPing V2`.

## 4. Smoke test
1. Open `/owner` and sign in.
2. Create a test pet with a real image file.
3. Download its generated QR PNG.
4. Open its public profile in a private window.
5. Submit a finder location.
6. Refresh `/owner`, choose `Show map`, and verify the marker.

## Included in V2
- Dynamic pets, no hard-coded names or tokens
- Dashboard statistics
- Downloadable QR PNG per pet
- Direct photo upload to Supabase Storage
- Finder report table and embedded OpenStreetMap
- Safe/missing toggle
- Responsive owner and finder views

## Deliberately not included
Email delivery is not included in this import because a mail provider account, verified sender and private API key are required. Do not place a mail-service secret in GitHub or in any `NEXT_PUBLIC_` variable.
