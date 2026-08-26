-- PawPing owner dashboard migration. Run once in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.cats (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid references auth.users(id) on delete cascade,
 name text not null,
 photo_url text,
 age text,
 color text,
 temperament text,
 health_note text,
 status text not null default 'safe' check(status in ('safe','missing')),
 public_token text unique not null default encode(gen_random_bytes(10),'hex'),
 created_at timestamptz not null default now()
);

alter table public.cats add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.cats alter column public_token set default encode(gen_random_bytes(10),'hex');

create table if not exists public.finder_reports (
 id uuid primary key default gen_random_uuid(),
 cat_id uuid not null references public.cats(id) on delete cascade,
 latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180),
 accuracy_m double precision,
 message text check(char_length(message)<=500),
 created_at timestamptz not null default now()
);

alter table public.cats enable row level security;
alter table public.finder_reports enable row level security;

-- Remove old policies so only this clear policy set remains.
drop policy if exists "public read cat by token" on public.cats;
drop policy if exists "public read cats" on public.cats;
drop policy if exists "Public can find cat by token" on public.cats;
drop policy if exists "Owners manage own cats" on public.cats;
drop policy if exists "Public profiles are readable" on public.cats;
drop policy if exists "Owners insert cats" on public.cats;
drop policy if exists "Owners update cats" on public.cats;
drop policy if exists "Owners delete cats" on public.cats;

create policy "Public profiles are readable" on public.cats for select to anon,authenticated using(true);
create policy "Owners insert cats" on public.cats for insert to authenticated with check(owner_id=(select auth.uid()));
create policy "Owners update cats" on public.cats for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy "Owners delete cats" on public.cats for delete to authenticated using(owner_id=(select auth.uid()));

drop policy if exists "public submit finder report" on public.finder_reports;
drop policy if exists "public submit finder reports" on public.finder_reports;
drop policy if exists "Public can submit finder reports" on public.finder_reports;
drop policy if exists "Owner reads own reports" on public.finder_reports;
create policy "Public can submit finder reports" on public.finder_reports for insert to anon,authenticated with check(exists(select 1 from public.cats c where c.id=cat_id));
create policy "Owner reads own reports" on public.finder_reports for select to authenticated using(exists(select 1 from public.cats c where c.id=cat_id and c.owner_id=(select auth.uid())));

grant usage on schema public to anon,authenticated;
grant select on public.cats to anon,authenticated;
grant insert,update,delete on public.cats to authenticated;
grant insert on public.finder_reports to anon,authenticated;
grant select on public.finder_reports to authenticated;

-- Optional: after signing in once, claim existing unowned cats by replacing EMAIL below.
-- update public.cats set owner_id=(select id from auth.users where email='YOUR_EMAIL') where owner_id is null;
