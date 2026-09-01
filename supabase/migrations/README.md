# Migrations

Schema changes from `v13_generalize_items` onward are tracked here as
versioned SQL files, applied via the Supabase MCP / `supabase db push`.

Everything before `v13` (the root-level `SUPABASE*.sql` files, plus a `v10`
through `v12` series referenced in code comments — abuse protection,
token-gated public reads, server-only report inserts) was applied by hand
against the live project and was never saved as a migration file. Those
changes are real and live in production; they're just not reconstructable
from the repo. If you need the exact historical SQL, query the live
project's function/policy definitions directly (e.g. via
`pg_get_functiondef`) rather than trusting the root-level `.sql` files,
which are import snapshots, not an applied history.

Going forward: every schema change gets a new timestamped file here,
applied to a staging project before production once one exists (see
CHANGELOG.md's `1.0.0` bar).
