# Changelog

## Versioning scheme (starting now)

Every earlier build used ad-hoc version strings (`7.0.0-weekend`, `8.0.0-admin-tools`,
`9.0.0-owner-experience`, `9.1.0-help-and-fixes`) that counted *rounds of work*, not
product maturity — a `9.x` number implied a mature, launched product, which PawPing
isn't yet. Starting at **0.5.0**, versions follow standard semantic versioning and
mean something specific:

- **0.x.y — pre-launch.** The app is still evolving under one operator (you), with no
  formal privacy policy/terms, no abuse or rate-limiting protection, and no automated
  tests. Anything can still change shape. PawPing starts at `0.5.0` rather than
  `0.0.x` because the core product loop already works end-to-end in production: add a
  pet → generate a tag → a stranger finds them and reports a sighting with a photo/
  location → you get a push alert → you resolve it from the admin tools. That's half
  the distance to a real "would hand this to a stranger" launch — hence `0.5`, not `0.1`.
- **1.0.0 — first real launch.** Bump to `1.0.0` when PawPing is ready for people
  *outside* your own testing to rely on it without you watching closely: at minimum,
  a privacy policy/terms page, basic abuse protection on the public report form, and
  the planned GPS tracking milestone.
- **MINOR (0.X.0)** — a new feature area ships (GPS tracking, the collar-tag sizing
  added in this release, offline support, etc.).
- **PATCH (0.X.Y)** — bug fixes, copy tweaks, small UI polish — no new capability.

The version shown in the footer of every page (bottom of the screen) always matches
`package.json`, so a mismatch between what you see live and what's in this file means
the latest deploy hasn't gone out yet.

## 0.8.2

- Fixed a real bug reported by GK: the "add/edit" form on the owner
  dashboard always showed age/color/temperament/health note as
  pet-labeled inputs, no matter which category was selected — so adding
  a key, a rental tag, or a medical ID still asked for a pet's
  "temperament." Those fields are now category-aware (`coreFieldsFor` in
  lib/categories.ts):
  - Pet: color, age, temperament, health note (unchanged).
  - Item: color, a finder note, and an important note — no age, which
    was never actually shown anywhere for an item.
  - Property and medical: just one field, relabeled "Important note" —
    the only one of the four ever rendered on their info pages; age,
    color, and temperament were dead inputs for these two categories.
  - The form's heading and submit button also now say "Add pet" /
    "Add item" / "Add property tag" / "Add medical ID" instead of always
    "Add pet," and the Safe/Missing status toggle — meaningless for an
    informational category — only shows for pet/item.
- No schema change and no data migration: existing rows are untouched,
  this only changes which inputs the form shows.
- +5 unit tests (42 total) covering the new field set per category.

## 0.8.1

- Caught up the in-app marketing flyer (`/features`) and Help/FAQ page to
  the 0.8.0 category feature expansion, which had shipped without either
  being updated:
  - Features page gets a new "Just added" section: ownership transfer,
    the private serial number field, welcome guide & host contact for
    rentals, multiple emergency contacts for medical IDs, and the new
    scan-activity log.
  - Help page gets two new FAQ entries: how to transfer a pet to a new
    owner, and what the scan-activity log on the dashboard shows.
- No NFC-related code — confirmed there's nothing to add. Physical NFC
  tags need only be written with the same public URL a QR code already
  encodes; the browser handles the rest natively. That's a hardware step,
  not an app feature.

## 0.8.0

- A round of category features, one per category:
  - **Pets**: behavior/handling notes for a finder (e.g. "nervous around
    strangers"), a friendlier "Mark {name} safe" button when a pet is
    missing, and ownership transfer — generate a one-time link
    (`/transfer/{token}`, valid 7 days) to hand a tag to a new owner
    without reprinting it.
  - **Items**: a no-contact drop-off option, and a private serial number /
    proof-of-ownership field. Private fields are a new thing: they save to
    a `private_details` column that `get_public_item` never selects, so —
    unlike the existing `details` field, which a finder's browser receives
    in full and the page just chooses what to render — this one never
    leaves the server for a public request.
  - **Property/rental**: a welcome guide, checkout time, and a maintenance/
    host contact with its own "tap to call" button (the same deliberate
    exception to "never show contact info to a finder" that medical IDs
    already use, extended to a second category).
  - **Medical ID**: multiple emergency contacts (was one fixed field, now
    a list — old single-contact data still displays via a fallback), a
    named physician contact, and a proper multi-line field for medications
    and dosage.
  - **All categories**: a lightweight, anonymous scan log — city/region/
    country and a timestamp per scan, no IP address stored, backed by
    Vercel's free edge geo headers (no external service, no cost). Visible
    per pet on the owner dashboard as an expandable "N scans" list.
  - The reward note (existing) now only shows while an item is actually
    marked missing, instead of always.
- New `accept_transfer()` database function for the transfer flow above.
  Caught and fixed a real bug in it before it reached production: this
  Supabase project grants function EXECUTE to `anon` by default, so
  without an explicit signed-in check, an unauthenticated caller could
  have nulled out a cat's owner_id using nothing but a valid (or guessed)
  transfer link. Fixed with an explicit auth check plus a tightened grant
  — verified via the security advisor on staging before it ever touched
  production.
- Also fixed a small pre-existing data bug found while adding new i18n
  keys: the Hindi "brand / model" label had a corrupted character from an
  earlier edit.
- Schema applied to staging first, then production, per the usual
  workflow — see supabase/migrations/20260901000400_v17_category_feature_expansion.sql.

## 0.7.7

- Added an in-app features page (`/features`) — a short marketing flyer
  showing what TagPing does: the four category "brands" (PawPing, TagPing,
  StayPing, VitalPing) with a one-line pitch each, the platform features
  that come free with every tag (instant alerts, auto-detected language,
  privacy-first scan pages, install-to-home-screen), and a clearly marked
  "Coming soon" section (GPS live tracking) so people know what's built
  vs. what's next. Linked from the homepage and from the owner dashboard
  header ("What's new").
- Fixed two leftover "PAWPING" strings (homepage eyebrow, help page
  heading) that survived the PawPing → TagPing rename and were still
  showing the old all-caps brand name.

## 0.7.6

- Added a staging environment: a second, free Supabase project
  ("pawping-staging") that's a structural replica of production — same
  tables, functions, triggers, RLS policies — but with zero real data.
  Future schema/RLS changes get tried there first. Also fills a
  documentation gap: supabase/migrations/00000000000000_baseline_snapshot.sql
  is a full snapshot of the schema that existed before this repo started
  tracking migrations (v13 onward), captured directly from the live
  database.
- No cost: this uses Supabase's standard 2-free-projects-per-org allowance,
  not paid branching. See supabase/migrations/README.md for how staging
  connects to Vercel Preview deployments.

## 0.7.5

- Added Sentry error monitoring (their free "Developer" plan — 5,000
  errors/month, no cost, no card on file). Unhandled errors in the browser,
  the server, and API routes (like /api/report) now get reported instead
  of failing silently. Kept deliberately minimal: no source-map upload, no
  performance tracing, just error capture — set NEXT_PUBLIC_SENTRY_DSN (and
  optionally SENTRY_DSN) in Vercel to turn it on; the app works exactly the
  same without them, just without error reports.
- Note: adding the required _error.js page (so Sentry also catches SSR
  crashes) means the 404 page is now server-rendered instead of static —
  a negligible cost for a page almost nobody hits directly.

## 0.7.4

- **Fixed a real bug found while writing the tests below:** the Medical ID
  and Property/rental info pages always rendered "No additional details
  have been added yet." — even when the owner had filled in a blood type,
  allergies, Wi-Fi password, etc. Those fields are stored in the `details`
  jsonb column, but the display config was reading them as if they were
  plain columns, so they silently never showed up. Fixed the category
  config, and added a permanent test that would have caught it.
- Added Playwright end-to-end tests covering the two journeys a finder
  actually goes through: viewing and reporting on a pet, and viewing a
  Medical ID with its emergency-call button. Every test mocks the network
  calls, so the suite needs no real Supabase project and no secrets — runs
  in CI on every push/PR alongside the existing type-check/unit-test/build
  job.
- Minor: the report form's "situation" dropdown and message box are now
  properly linked to their labels (a small accessibility fix, noticed while
  writing the above tests).

## 0.7.3

- The owner dashboard title now tracks the category filter above your pet
  list, as a beta-only touch: filter to "Pet" and it reads PawPing, "Property"
  reads StayPing, "Medical ID" reads VitalPing, "Item" or "All categories"
  stays TagPing. Non-beta owners never see this move (the filter itself is
  beta-gated), so the title always reads TagPing for them, same as before.

## 0.7.2

- Each category now has its own public-facing brand shown on the scan page, instead
  of always saying "TagPing": Pet keeps the original **PawPing** name, Item stays
  **TagPing** (the generic/default), Property/rental is **StayPing**, and Medical ID
  is **VitalPing**. Only affects the trust badge line a finder sees ("Registered on
  X since Y") — the app's own identity (dashboard, PWA install, etc.) is unchanged.
- Added TypeScript (incremental — .js and .ts coexist), a GitHub Actions CI pipeline
  (type-check, tests, build on every push/PR to main), and a first real automated
  test suite (Vitest) covering lib/categories.ts and lib/i18n.ts, including a
  permanent check that every language has the same translation keys as English.

## 0.7.1

- **PawPing is now TagPing.** The app is expanding beyond pets (see 0.7.0),
  so the name changed to match — "Ping" stays, since the instant
  notification-on-scan is the actual core of the product; "Paw" is gone
  since this isn't pet-only anymore. Renamed everywhere in the app itself
  (page titles, manifest, footer, service worker cache, install prompts,
  notification copy) and in package.json. **Not** renamed: the GitHub repo
  or the live `pawping.vercel.app` domain — that's a separate decision,
  since changing it would break the URL already encoded in any physical
  QR tags printed so far.
- The category system, multi-language public page, reward field, and
  trust badge added in 0.7.0 are now gated to the app owner's own account
  only (enforced server-side via RLS, not just hidden in the UI) — a
  deliberate soft launch, not a permanent restriction. Every other
  registered user's experience is unchanged from before 0.7.0.
- Fixed a stale Help page answer that still said a finder sees a
  contact-phone call/text option — that was removed in 0.6.0; the phone
  field has been a private, owner-only note ever since.

## 0.7.0

- **PawPing is no longer pet-only.** Added a `category` field (pet, generic
  lost item, medical ID, property/rental tag) and a `details` field for
  category-specific info, so one account can now issue a QR tag for keys,
  a bag, a bike, a medical ID bracelet, or a rental property — not just an
  animal. Adding a category going forward is mostly configuration
  (`lib/categories.js`), not new page logic.
- The public scan page now branches by category: pet/item keep the
  existing "report a sighting" flow with generalized copy; medical ID and
  property tags show a curated info panel instead (no report form). A
  medical ID additionally shows a tap-to-call emergency contact button —
  the one deliberate exception to PawPing's "never show contact info to a
  finder" rule, since that's the entire point of a medical ID.
- Added a "Registered on PawPing since <month year>" trust badge to every
  public scan page, and an optional reward note owners can set that shows
  as a highlighted callout to finders.
- The scan page (`/c/[token]`) is now available in English, Spanish,
  French, German, and Hindi — auto-detected from the visitor's browser,
  with a manual switcher. The owner dashboard stays English; this only
  covers the page a stranger who may not share the owner's language
  actually lands on.
- Owner dashboard: category selector and per-category detail fields on
  the add/edit form, category filter on the item list, category icon/label
  shown per item.
- Schema changes are now tracked as versioned files under
  `supabase/migrations/` going forward (see that folder's README for why
  everything before this release isn't reconstructable from the repo).

## 0.6.1

- **Rotated a leaked secret**: an earlier import doc (`IMPORT_V9.md`) had a real VAPID
  key pair pasted directly into it and committed to the public GitHub repo. GitGuardian
  flagged it; the key pair has been rotated (a fresh one generated, the old one is
  permanently retired) and the doc no longer contains real secret values — it points
  to generating your own instead of ever hardcoding one into a committed file again.
- The owner dashboard now detects when a browser's push subscription was signed with a
  now-retired VAPID key (e.g. after a rotation like this one) and treats it as
  unsubscribed instead of silently reporting alerts as "on" when they'd actually fail
  to deliver — you get prompted to re-enable, and the new subscription just works.

## 0.6.0

- **Closed a real privacy gap**: the database let anyone with the app's public key read
  every pet's row directly — including phone numbers — with no QR token needed at all.
  Public pages now go through a database function that only ever returns the handful
  of fields a finder should see (name, photo, age, color, temperament, a health note,
  status) — never a phone number, email, or the owner's identity.
- Removed the owner's phone number from every public/finder-facing page (the scan page
  and the printable poster). The phone field is now a private note for the owner only —
  it was never shown anywhere by finders again, so its label was updated to say so.
- **Closed an abuse gap**: `/api/notify` used to accept a POST from anyone with any
  cat_id and push a message straight to that pet's owner — no proof a sighting ever
  happened. It's removed; a push notification now only ever fires as a side effect of
  a real, validated report going through the new `/api/report` endpoint.
- Added real rate-limiting and validation at the database level (not just in the
  browser, which anyone can bypass): a pet can receive at most 5 finder reports every
  10 minutes, messages are capped server-side, and coordinates are range-checked.
  Applies no matter how the request reaches the database.
- Added a honeypot field and a minimum-time-on-page check to the public report form to
  filter out scripted spam before it reaches the database.
- Fixed a live bug (found while auditing the above): two duplicate database triggers
  were both firing on every finder report, double-inserting into an internal alerts
  table.
- Tightened several database functions that a security scan flagged as callable by
  anonymous visitors with no reason to be.
- The public scan page (`/c/[token]`) no longer opens straight into an urgent report
  form for every scan — a healthy pet gets a warm "say hello" page with the report
  form tucked behind a "something wrong?" link; a missing pet still opens straight
  into it, with a softer amber urgency tone instead of alarm-red.
- The owner dashboard now explains, right on the page, that push alerts are the only
  instant way to hear about a sighting now that finders can't see your phone or email —
  and prompts you to turn them on if they're off.

## 0.5.0

- Reset the version scheme (see above) — this is not a feature release on its own,
  it's the baseline the new numbering starts counting from.
- Added a collar-sized printable tag (`/tag/[token]`) as an alternative to the large
  QR download — pick a physical size (25mm/35mm/45mm) and print it at true size for
  an actual cat or dog collar, instead of the oversized default QR export.
