-- Run this entire file in Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.cats (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 photo_url text,
 age text,
 color text,
 temperament text,
 health_note text,
 status text not null default 'safe' check (status in ('safe','missing')),
 public_token text unique not null,
 created_at timestamptz not null default now()
);

create table if not exists public.finder_reports (
 id uuid primary key default gen_random_uuid(),
 cat_id uuid not null references public.cats(id) on delete cascade,
 latitude double precision not null check (latitude between -90 and 90),
 longitude double precision not null check (longitude between -180 and 180),
 accuracy_m double precision,
 message text check (char_length(message) <= 500),
 created_at timestamptz not null default now()
);

alter table public.cats enable row level security;
alter table public.finder_reports enable row level security;

drop policy if exists "public read cat by token" on public.cats;
create policy "public read cat by token" on public.cats for select to anon using (true);

drop policy if exists "public submit finder report" on public.finder_reports;
create policy "public submit finder report" on public.finder_reports for insert to anon with check (true);

grant select on public.cats to anon;
grant insert on public.finder_reports to anon;

insert into public.cats(name,age,color,temperament,health_note,status,public_token)
values ('Luna','3 years','Black','Friendly, but may be frightened','None','missing','luna123')
on conflict (public_token) do update set name=excluded.name;
