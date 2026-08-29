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

## 0.5.0

- Reset the version scheme (see above) — this is not a feature release on its own,
  it's the baseline the new numbering starts counting from.
- Added a collar-sized printable tag (`/tag/[token]`) as an alternative to the large
  QR download — pick a physical size (25mm/35mm/45mm) and print it at true size for
  an actual cat or dog collar, instead of the oversized default QR export.
