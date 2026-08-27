# PawPing V7 import

This is one cumulative upgrade from the working V2.

## Included stages
- V3: installable PWA shell and offline fallback
- V4: unified finder/GPS location history and in-app alert center
- V5: secure GPS device registration and token-hash ingestion RPC
- V6: owner geofences and tracking workspace
- V7: CSV location export and privacy-oriented owner-only RLS

## Import
1. Tag the current version: `git tag v2-working && git push origin v2-working`.
2. Run `SUPABASE_V7.sql` in Supabase SQL Editor.
3. Upload every file and folder from this ZIP to the ROOT of GitHub and replace matching files.
4. Commit as `Import PawPing V7 cumulative`.
5. Keep the existing Vercel variables. The Supabase URL must not end in `/rest/v1/`.
6. Open the newest Vercel deployment and visit `/owner` and `/advanced`.

## Important limitations
- The package creates in-app alerts, not email or push delivery. Those require a provider account and private secret.
- GPS is backend-ready. Real hardware must call the `ingest_gps_location` Supabase RPC using the one-time device token.
- Geofences are saved and owner-protected. Automatic distance evaluation is intentionally not enabled until GPS hardware is connected and tested.
- The service worker provides a basic fallback cache only. Location submission still requires network access.

## Smoke test
1. Sign in at `/owner`.
2. Submit a finder report from a private browser window.
3. Open `/advanced`; verify the location and alert.
4. Export the CSV.
5. Create a GPS token and store it securely because it is displayed once.
