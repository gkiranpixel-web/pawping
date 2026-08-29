-- PawPing V8: Admin Tools + Pet Management
-- Safe to run more than once.

-- Let owners mark a sighting as reviewed so the dashboard can separate
-- "needs attention" from history.
alter table public.finder_reports add column if not exists resolved_at timestamptz;

-- Track when a pet's safe/missing status last changed, so the admin
-- "Missing pets" board can show how long a pet has been missing.
alter table public.cats add column if not exists status_changed_at timestamptz not null default now();

-- Helpful indexes now that reports/cats are queried and filtered more often.
create index if not exists idx_finder_reports_cat_id on public.finder_reports(cat_id);
create index if not exists idx_finder_reports_created_at on public.finder_reports(created_at desc);
create index if not exists idx_cats_owner_id on public.cats(owner_id);
create index if not exists idx_cats_status on public.cats(status);

-- Owners can update their own reports (needed to set resolved_at).
-- Admin actions go through the service-role key in the API routes, so they
-- bypass RLS entirely and do not need a policy here.
drop policy if exists "Owners update own reports" on public.finder_reports;
create policy "Owners update own reports" on public.finder_reports
  for update to authenticated
  using (exists(select 1 from public.cats where id = cat_id and owner_id = auth.uid()))
  with check (exists(select 1 from public.cats where id = cat_id and owner_id = auth.uid()));

grant update on public.finder_reports to authenticated;
