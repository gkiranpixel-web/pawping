-- PawPing stable cumulative V6 migration. Run once in Supabase SQL Editor.
create extension if not exists pgcrypto;
alter table public.cats add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.cats add column if not exists photo_url text;
alter table public.finder_reports add column if not exists accuracy_m double precision;

create table if not exists public.owner_alerts (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 cat_id uuid references public.cats(id) on delete cascade, kind text not null, title text not null, body text,
 read_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.tracker_devices (
 id uuid primary key default gen_random_uuid(), cat_id uuid not null references public.cats(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade, name text not null, token_hash text not null unique,
 is_active boolean not null default true, battery_percent integer check (battery_percent between 0 and 100),
 last_seen_at timestamptz, created_at timestamptz not null default now()
);

alter table public.cats enable row level security;
alter table public.finder_reports enable row level security;
alter table public.owner_alerts enable row level security;
alter table public.tracker_devices enable row level security;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('pet-photos','pet-photos',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public profiles are readable" on public.cats;
drop policy if exists "Owners insert cats" on public.cats;
drop policy if exists "Owners update cats" on public.cats;
drop policy if exists "Owners delete cats" on public.cats;
create policy "Public profiles are readable" on public.cats for select to anon,authenticated using(true);
create policy "Owners insert cats" on public.cats for insert to authenticated with check(owner_id=(select auth.uid()));
create policy "Owners update cats" on public.cats for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy "Owners delete cats" on public.cats for delete to authenticated using(owner_id=(select auth.uid()));

drop policy if exists "Public can submit finder reports" on public.finder_reports;
drop policy if exists "Owner reads own reports" on public.finder_reports;
create policy "Public can submit finder reports" on public.finder_reports for insert to anon,authenticated with check(exists(select 1 from public.cats c where c.id=cat_id));
create policy "Owner reads own reports" on public.finder_reports for select to authenticated using(exists(select 1 from public.cats c where c.id=cat_id and c.owner_id=(select auth.uid())));

drop policy if exists "Owners upload pet photos" on storage.objects;
drop policy if exists "Public reads pet photos" on storage.objects;
create policy "Owners upload pet photos" on storage.objects for insert to authenticated with check(bucket_id='pet-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Public reads pet photos" on storage.objects for select to anon,authenticated using(bucket_id='pet-photos');

drop policy if exists "Owners read alerts" on public.owner_alerts;
drop policy if exists "Owners update alerts" on public.owner_alerts;
create policy "Owners read alerts" on public.owner_alerts for select to authenticated using(owner_id=(select auth.uid()));
create policy "Owners update alerts" on public.owner_alerts for update to authenticated using(owner_id=(select auth.uid()));

drop policy if exists "Owners read devices" on public.tracker_devices;
create policy "Owners read devices" on public.tracker_devices for select to authenticated using(owner_id=(select auth.uid()));

grant usage on schema public to anon,authenticated;
grant select on public.cats to anon,authenticated;
grant insert,update,delete on public.cats to authenticated;
grant insert on public.finder_reports to anon,authenticated;
grant select on public.finder_reports to authenticated;
grant select,update on public.owner_alerts to authenticated;
grant select on public.tracker_devices to authenticated;

create or replace function public.create_tracker_device(p_cat_id uuid,p_name text) returns text
language plpgsql security definer set search_path=public,extensions as $$
declare token text:=encode(gen_random_bytes(24),'hex'); owner uuid;
begin
 select owner_id into owner from public.cats where id=p_cat_id;
 if owner is null or owner<>auth.uid() then raise exception 'not owner'; end if;
 insert into public.tracker_devices(cat_id,owner_id,name,token_hash)
 values(p_cat_id,auth.uid(),p_name,encode(digest(token,'sha256'),'hex'));
 return token;
end$$;
grant execute on function public.create_tracker_device(uuid,text) to authenticated;

create or replace function public.on_finder_report_v6() returns trigger
language plpgsql security definer set search_path=public as $$
declare owner uuid; pet_name text;
begin
 select owner_id,name into owner,pet_name from public.cats where id=new.cat_id;
 if owner is not null then
  insert into public.owner_alerts(owner_id,cat_id,kind,title,body)
  values(owner,new.cat_id,'found',pet_name||' was found',coalesce(new.message,'A finder shared a location.'));
 end if;
 return new;
end$$;
drop trigger if exists trg_finder_report_v6 on public.finder_reports;
create trigger trg_finder_report_v6 after insert on public.finder_reports for each row execute function public.on_finder_report_v6();
