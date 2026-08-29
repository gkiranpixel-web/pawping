-- PawPing V9: Notifications, contact phone, report type, missing posters
-- Safe to run more than once.

-- Let a finder call/text the owner directly instead of only messaging in-app.
alter table public.cats add column if not exists contact_phone text;

-- Distinguish "I saw them" (a sighting) from "I have them safe" (much more
-- urgent) so owners can triage at a glance.
alter table public.finder_reports add column if not exists report_type text not null default 'saw' check (report_type in ('saw','have'));

-- Browser push subscriptions, one row per device an owner has enabled
-- notifications on. Populated by the owner dashboard, read by the server
-- when a new sighting comes in.
create table if not exists public.push_subscriptions(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;

drop policy if exists "Owners manage own push subscriptions" on public.push_subscriptions;
create policy "Owners manage own push subscriptions" on public.push_subscriptions
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- The /api/notify route reads subscriptions with the service-role key
-- (bypassing RLS by design, same pattern as the admin API routes), so no
-- extra policy is needed for that path.
