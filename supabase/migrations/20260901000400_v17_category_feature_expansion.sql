-- v17_category_feature_expansion
--
-- Adds schema for a batch of category features:
--  - Owner-private fields (e.g. an item's serial number) now have a real
--    place to live: `private_details` jsonb, deliberately NOT selected by
--    get_public_item — unlike `details`, which the public RPC returns in
--    full and the frontend just chooses what to render from. Anything
--    that must never reach a finder's browser goes in private_details.
--  - Ownership transfer: `transfer_token` + `transfer_created_at` on cats,
--    plus accept_transfer() — a security-definer RPC that lets a NEW
--    owner claim a cat by token (their own auth.uid() isn't the row's
--    owner_id yet, so the normal "Owners update cats" RLS policy can't
--    cover this; the function validates the token/expiry itself instead).
--    Guards against a null auth.uid() explicitly — this project's default
--    privileges grant EXECUTE on new functions to anon as well as
--    authenticated, so "revoke all ... from public" alone doesn't stop an
--    anonymous caller; without the guard, an anonymous call would run
--    "set owner_id = auth.uid()" with auth.uid() = null, nulling out a
--    cat's owner_id for anyone who has (or intercepts) a live
--    transfer_token. Belt-and-suspenders: the guard makes it safe
--    regardless of grants, and EXECUTE is also revoked from anon
--    explicitly below.
--  - scan_events: a lightweight, anonymous scan log (cat_id + city/region/
--    country + timestamp, no IP stored) so an owner gets a rough sense of
--    where/when their tag gets scanned. Written server-side only (via the
--    service-role key from pages/api/scan.ts, same pattern as
--    finder_reports) — no anon/authenticated INSERT policy exists, only a
--    SELECT policy scoping an owner to their own cats' events.

alter table public.cats
  add column if not exists private_details jsonb not null default '{}'::jsonb,
  add column if not exists transfer_token text unique,
  add column if not exists transfer_created_at timestamptz;

create table if not exists public.scan_events (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats(id) on delete cascade,
  city text,
  region text,
  country text,
  scanned_at timestamptz not null default now()
);
create index if not exists idx_scan_events_cat_id on public.scan_events using btree (cat_id, scanned_at desc);

alter table public.scan_events enable row level security;

grant select, insert, update, delete, truncate, references, trigger
  on public.scan_events to anon, authenticated;

drop policy if exists "Owners read scan events" on public.scan_events;
create policy "Owners read scan events" on public.scan_events for select to authenticated
  using (exists (select 1 from public.cats c where c.id = scan_events.cat_id and c.owner_id = (select auth.uid())));

-- No insert/update/delete policy for anon/authenticated on purpose — only
-- the service-role key (which bypasses RLS entirely) writes scan events,
-- from pages/api/scan.ts.

create or replace function public.accept_transfer(p_token text)
returns table(name text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_cat_id uuid;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to accept a transfer.';
  end if;

  select id, cats.name into v_cat_id, v_name
  from public.cats
  where transfer_token = p_token
    and transfer_created_at > now() - interval '7 days';

  if v_cat_id is null then
    raise exception 'This transfer link is invalid or has expired.';
  end if;

  update public.cats
    set owner_id = auth.uid(), transfer_token = null, transfer_created_at = null
    where id = v_cat_id;

  return query select v_name;
end;
$function$;

revoke all on function public.accept_transfer(text) from public, anon;
grant execute on function public.accept_transfer(text) to authenticated;
