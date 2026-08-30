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
