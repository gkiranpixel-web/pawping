-- v15_drop_unused_admin_users
--
-- Closes a security-advisor finding: admin_users had RLS enabled with no
-- policy attached. Verified unused before dropping — zero references in
-- the app codebase, zero dependent views/policies. Admin authorization
-- actually runs through ADMIN_EMAIL (see lib/admin.js, requireAdmin()),
-- checked server-side with the service-role key, which bypasses RLS
-- entirely. This table was superseded by that approach and never cleaned
-- up.

drop table if exists public.admin_users;
