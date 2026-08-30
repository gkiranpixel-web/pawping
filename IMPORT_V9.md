# PawPing V9 — Owner Experience & Notifications import

Cumulative on top of V8. Adds: emergency contact phone, sighting report type
(saw / have them safe), a printable missing-pet poster, a first-run
onboarding checklist, a proper landing page, an installable-app polish
pass (icons, install prompt), and real-time browser push notifications.

## 1. Supabase
Run `SUPABASE_V9_NOTIFICATIONS.sql` in Supabase → SQL Editor. It only adds
columns, one new table (`push_subscriptions`), and its RLS policy — no
existing data is touched.

## 2. Vercel environment variables
Push notifications need a VAPID key pair (this is what lets your server
prove to the browser it's allowed to send a notification — no third-party
account required). Generate your own pair and add these three as Vercel
environment variables — do **not** paste real key values into this file
or any other file that gets committed:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY = <generate your own — see below>
VAPID_PRIVATE_KEY = <generate your own — see below>
VAPID_SUBJECT = mailto:you@example.com
```

Generate a pair with `npx web-push generate-vapid-keys`, or ask Claude to
generate one for you in chat (never in a file). Set the values directly
in Vercel → Project → Settings → Environment Variables, for Production
(and Preview/Development if you use them), then redeploy.

Treat `VAPID_PRIVATE_KEY` like any other secret — never commit it to
GitHub, only set it as a Vercel environment variable. `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
is safe to expose to the browser (that's what "public" means here), but
still shouldn't be hardcoded into a committed file — read it from
`process.env` as the app already does.

> **Note:** an earlier version of this file committed a real VAPID key
> pair here, which GitGuardian flagged as an exposed secret on 2026-08-30.
> That pair was rotated immediately and must never be reused.

## 3. Files changed in this release
Modified: `package.json`, `pages/_app.js`, `pages/_document.js`,
`pages/c/[token].js`, `pages/index.js`, `pages/owner.js`,
`public/manifest.json`, `public/sw.js`, `styles/globals.css`.

New: `SUPABASE_V9_NOTIFICATIONS.sql`, `lib/InstallBanner.js`,
`lib/webpush.js`, `pages/api/notify.js`, `pages/c/[token]/poster.js`,
`public/apple-touch-icon.png`, `public/icon-192.png`, `public/icon-512.png`,
`public/icon-maskable-512.png`.

`package.json` adds one new dependency, `web-push` — running `npm install`
locally (or letting Vercel install it on deploy) picks it up automatically.

## 4. Commit and push
From your local `pawping` folder, once the files above are in place:

```bash
git add -A
git commit -m "Import PawPing V9 Owner Experience & Notifications"
git push
```

## 5. Smoke test
1. Open `/` — confirm the new landing page and "How it works" steps show up.
2. Sign in at `/owner` with a fresh account (or a pet-less one) and confirm the onboarding checklist appears.
3. Add a pet with a contact phone number.
4. Tap **🔔 Enable alerts**, allow the browser permission prompt.
5. Open the pet's public link in a private window, submit a sighting, and confirm a browser notification arrives even with the dashboard tab closed.
6. Check the "Missing poster" link from the pet's card and print it.
7. On mobile, confirm the "Install PawPing" bar appears and installing adds a home-screen icon.

## Notes
- iOS only delivers push notifications to a PWA that's been added to the Home Screen first (a Safari tab alone won't get them) — this is an Apple platform restriction, not a bug in this build.
- `/api/notify` is intentionally unauthenticated, same as the existing sighting-submission endpoint — anyone with a pet's QR link can already trigger both. If you start seeing abuse, that's the first place to add rate limiting (see the Technical Assessment doc for details).
