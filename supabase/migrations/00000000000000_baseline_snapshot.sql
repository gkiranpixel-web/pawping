-- Baseline schema snapshot, captured directly from the live "pawping"
-- production project on 2026-09-01. This retroactively documents the
-- pre-v13 schema that this folder's README flagged as an unrecorded gap,
-- and is the exact file used to stand up the "pawping-staging" project
-- as a structural replica of production.
--
-- Written idempotently (IF NOT EXISTS / OR REPLACE / DROP+CREATE POLICY)
-- so it is SAFE TO RUN AGAINST PRODUCTION TOO without side effects — but
-- it should never need to be, since production already has this schema.
-- Its real purpose is (a) documentation and (b) applying to any fresh
-- project (staging today, disaster recovery if it's ever needed).
--
-- One known gap: get_public_item/is_beta_user/the cats RLS policies below
-- hardcode the production owner's auth.users id (834086ae-...) to gate
-- the beta features (categories, i18n, reward, trust badge) to just you.
-- That id is production-specific — on a fresh project (staging) nobody
-- matches it until you've signed in there once. See supabase/README.md
-- (staging section) for how to fix that once you have.

-- ── Extensions ──────────────────────────────────────────────────────────
create extension if not exists pgcrypto with schema extensions;

-- ── Tables ──────────────────────────────────────────────────────────────

create table if not exists public.cats (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  age text,
  color text,
  temperament text,
  health_note text,
  status text default 'safe'::text,
  public_token text not null unique default encode(extensions.gen_random_bytes(10), 'hex'::text),
  created_at timestamptz default now(),
  owner_id uuid references auth.users(id),
  status_changed_at timestamptz not null default now(),
  contact_phone text,
  category text not null default 'pet'::text
    check (category = any (array['pet'::text, 'item'::text, 'medical'::text, 'property'::text])),
  details jsonb not null default '{}'::jsonb
);
create index if not exists idx_cats_owner_id on public.cats using btree (owner_id);
create index if not exists idx_cats_status on public.cats using btree (status);

create table if not exists public.finder_reports (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid references public.cats(id),
  latitude numeric,
  longitude numeric,
  accuracy_m numeric,
  message text,
  created_at timestamptz default now(),
  resolved_at timestamptz,
  report_type text not null default 'saw'::text
    check (report_type = any (array['saw'::text, 'have'::text]))
);
create index if not exists idx_finder_reports_cat_id on public.finder_reports using btree (cat_id);
create index if not exists idx_finder_reports_created_at on public.finder_reports using btree (created_at desc);

-- Dormant GPS-tracking schema — not wired into any app code yet (GPS is
-- deliberately the last planned feature phase), but already present in
-- production, so replicated here for a faithful staging copy.

create table if not exists public.location_events (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats(id),
  source text not null check (source = any (array['finder'::text, 'gps'::text, 'manual'::text])),
  latitude double precision not null check (latitude >= -90::double precision and latitude <= 90::double precision),
  longitude double precision not null check (longitude >= -180::double precision and longitude <= 180::double precision),
  accuracy_m double precision,
  battery_percent integer check (battery_percent >= 0 and battery_percent <= 100),
  message text,
  recorded_at timestamptz not null default now()
);

create table if not exists public.tracker_devices (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats(id),
  owner_id uuid not null references auth.users(id),
  name text not null,
  token_hash text not null unique,
  is_active boolean not null default true,
  battery_percent integer,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.geofences (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats(id),
  owner_id uuid not null references auth.users(id),
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius_m integer not null check (radius_m >= 25),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.owner_alerts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  cat_id uuid references public.cats(id),
  kind text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ── Functions ───────────────────────────────────────────────────────────

create or replace function public.owns_cat(p_cat uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$select exists(select 1 from public.cats where id=p_cat and owner_id=auth.uid())$function$;

create or replace function public.is_beta_user()
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select auth.uid() = '834086ae-dec1-4764-a7f9-376de83a26c5'::uuid;
$function$;

create or replace function public.get_public_item(p_token text)
 returns table(name text, photo_url text, age text, color text, temperament text, health_note text, status text, category text, details jsonb, created_at timestamp with time zone, is_owner_beta boolean)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select name, photo_url, age, color, temperament, health_note, status, category, details,
    created_at, (owner_id = '834086ae-dec1-4764-a7f9-376de83a26c5'::uuid)
  from public.cats
  where public_token = p_token;
$function$;

create or replace function public.check_finder_report_abuse()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare recent_count int;
begin
  if new.message is not null and char_length(new.message) > 500 then
    raise exception 'Message is too long.';
  end if;
  if new.latitude is not null and (new.latitude < -90 or new.latitude > 90) then
    raise exception 'Invalid latitude.';
  end if;
  if new.longitude is not null and (new.longitude < -180 or new.longitude > 180) then
    raise exception 'Invalid longitude.';
  end if;

  select count(*) into recent_count from public.finder_reports
    where cat_id = new.cat_id and created_at > now() - interval '10 minutes';
  if recent_count >= 5 then
    raise exception 'Too many reports for this pet recently. Please wait a few minutes and try again.';
  end if;

  return new;
end;
$function$;

create or replace function public.on_finder_report()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$declare oid uuid;cn text;begin select owner_id,name into oid,cn from public.cats where id=new.cat_id;insert into public.location_events(cat_id,source,latitude,longitude,accuracy_m,message,recorded_at) values(new.cat_id,'finder',new.latitude,new.longitude,new.accuracy_m,new.message,new.created_at);if oid is not null then insert into public.owner_alerts(owner_id,cat_id,kind,title,body) values(oid,new.cat_id,'found',cn||' was found',coalesce(new.message,'A finder shared a location.'));end if;return new;end$function$;

create or replace function public.create_tracker_device(p_cat_id uuid, p_name text)
 returns text
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare token text:=encode(gen_random_bytes(24),'hex'); owner uuid;
begin
 select owner_id into owner from public.cats where id=p_cat_id;
 if owner is null or owner<>auth.uid() then raise exception 'not owner'; end if;
 insert into public.tracker_devices(cat_id,owner_id,name,token_hash)
 values(p_cat_id,auth.uid(),p_name,encode(digest(token,'sha256'),'hex'));
 return token;
end$function$;

create or replace function public.ingest_gps_location(p_token text, p_latitude double precision, p_longitude double precision, p_accuracy_m double precision default null::double precision, p_battery integer default null::integer, p_recorded_at timestamp with time zone default now())
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare d public.tracker_devices; eid uuid;
begin
  select * into d from public.tracker_devices
    where token_hash = encode(digest(p_token,'sha256'),'hex') and is_active = true;
  if d.id is null then raise exception 'invalid device token'; end if;

  if d.last_seen_at is not null and d.last_seen_at > now() - interval '5 seconds' then
    raise exception 'Reporting too frequently — please slow down.';
  end if;
  if p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180 then
    raise exception 'Invalid coordinates.';
  end if;

  insert into public.location_events(cat_id,source,latitude,longitude,accuracy_m,battery_percent,recorded_at)
    values (d.cat_id,'gps',p_latitude,p_longitude,p_accuracy_m,p_battery,p_recorded_at)
    returning id into eid;
  update public.tracker_devices set last_seen_at = now(), battery_percent = p_battery where id = d.id;
  return eid;
end;
$function$;

-- Function execute grants — matches production exactly: trigger-only
-- functions (check_finder_report_abuse, on_finder_report) are not
-- callable directly by anon/authenticated, only by the trigger itself.
revoke all on function public.owns_cat(uuid) from public;
grant execute on function public.owns_cat(uuid) to authenticated;

revoke all on function public.is_beta_user() from public;
grant execute on function public.is_beta_user() to anon, authenticated;

revoke all on function public.get_public_item(text) from public;
grant execute on function public.get_public_item(text) to anon, authenticated;

revoke all on function public.check_finder_report_abuse() from public;

revoke all on function public.on_finder_report() from public;

revoke all on function public.create_tracker_device(uuid, text) from public;
grant execute on function public.create_tracker_device(uuid, text) to authenticated;

revoke all on function public.ingest_gps_location(text, double precision, double precision, double precision, integer, timestamptz) from public;
grant execute on function public.ingest_gps_location(text, double precision, double precision, double precision, integer, timestamptz) to anon, authenticated;

-- ── Triggers ────────────────────────────────────────────────────────────

create or replace trigger trg_finder_report_abuse_guard
  before insert on public.finder_reports
  for each row execute function public.check_finder_report_abuse();

create or replace trigger trg_finder_report_v7
  after insert on public.finder_reports
  for each row execute function public.on_finder_report();

-- ── Row Level Security ──────────────────────────────────────────────────

alter table public.cats enable row level security;
alter table public.finder_reports enable row level security;
alter table public.location_events enable row level security;
alter table public.tracker_devices enable row level security;
alter table public.geofences enable row level security;
alter table public.owner_alerts enable row level security;
alter table public.push_subscriptions enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete, truncate, references, trigger
  on all tables in schema public to anon, authenticated;

drop policy if exists "Owners delete cats" on public.cats;
create policy "Owners delete cats" on public.cats for delete to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Owners insert cats" on public.cats;
create policy "Owners insert cats" on public.cats for insert to authenticated
  with check (owner_id = (select auth.uid()) and (category = 'pet'::text or owner_id = '834086ae-dec1-4764-a7f9-376de83a26c5'::uuid));

drop policy if exists "Owners read own cats" on public.cats;
create policy "Owners read own cats" on public.cats for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Owners update cats" on public.cats;
create policy "Owners update cats" on public.cats for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and (category = 'pet'::text or owner_id = '834086ae-dec1-4764-a7f9-376de83a26c5'::uuid));

drop policy if exists "Owner reads own reports" on public.finder_reports;
create policy "Owner reads own reports" on public.finder_reports for select to authenticated
  using (exists (select 1 from public.cats c where c.id = finder_reports.cat_id and c.owner_id = (select auth.uid())));

drop policy if exists "Owners update own reports" on public.finder_reports;
create policy "Owners update own reports" on public.finder_reports for update to authenticated
  using (exists (select 1 from public.cats where cats.id = finder_reports.cat_id and cats.owner_id = auth.uid()))
  with check (exists (select 1 from public.cats where cats.id = finder_reports.cat_id and cats.owner_id = auth.uid()));

drop policy if exists "owners insert geofences" on public.geofences;
create policy "owners insert geofences" on public.geofences for insert to authenticated
  with check (owner_id = auth.uid() and owns_cat(cat_id));

drop policy if exists "owners read geofences" on public.geofences;
create policy "owners read geofences" on public.geofences for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "owners read locations" on public.location_events;
create policy "owners read locations" on public.location_events for select to authenticated
  using (owns_cat(cat_id));

drop policy if exists "Owners read alerts" on public.owner_alerts;
create policy "Owners read alerts" on public.owner_alerts for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Owners update alerts" on public.owner_alerts;
create policy "Owners update alerts" on public.owner_alerts for update to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Owners manage own push subscriptions" on public.push_subscriptions;
create policy "Owners manage own push subscriptions" on public.push_subscriptions for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Owners read devices" on public.tracker_devices;
create policy "Owners read devices" on public.tracker_devices for select to authenticated
  using (owner_id = (select auth.uid()));

-- ── Storage (pet photos) ────────────────────────────────────────────────
-- Production accumulated several duplicate storage.objects policies with
-- identical predicates over time (from different work sessions — "Weekend
-- upload photos", "Sightings owner uploads photos", etc.). Collapsed here
-- into one clean pair with the same net effect: no behavior change.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pet-photos', 'pet-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Public reads pet photos" on storage.objects;
create policy "Public reads pet photos" on storage.objects for select to anon, authenticated
  using (bucket_id = 'pet-photos');

drop policy if exists "Owners upload pet photos" on storage.objects;
create policy "Owners upload pet photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'pet-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
