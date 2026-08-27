-- PawPing Finder Reports + Recent Sightings
alter table public.cats add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.cats add column if not exists photo_url text;
alter table public.finder_reports add column if not exists accuracy_m double precision;
alter table public.cats enable row level security;
alter table public.finder_reports enable row level security;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('pet-photos','pet-photos',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=true;
drop policy if exists "Sightings public pet profiles" on public.cats;drop policy if exists "Sightings owner creates pets" on public.cats;drop policy if exists "Sightings owner updates pets" on public.cats;drop policy if exists "Sightings owner deletes pets" on public.cats;
create policy "Sightings public pet profiles" on public.cats for select to anon,authenticated using(true);
create policy "Sightings owner creates pets" on public.cats for insert to authenticated with check(owner_id=auth.uid());
create policy "Sightings owner updates pets" on public.cats for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy "Sightings owner deletes pets" on public.cats for delete to authenticated using(owner_id=auth.uid());
drop policy if exists "Sightings finder submits reports" on public.finder_reports;drop policy if exists "Sightings owner reads reports" on public.finder_reports;
create policy "Sightings finder submits reports" on public.finder_reports for insert to anon,authenticated with check(exists(select 1 from public.cats where id=cat_id));
create policy "Sightings owner reads reports" on public.finder_reports for select to authenticated using(exists(select 1 from public.cats where id=cat_id and owner_id=auth.uid()));
drop policy if exists "Sightings owner uploads photos" on storage.objects;drop policy if exists "Sightings public reads photos" on storage.objects;
create policy "Sightings owner uploads photos" on storage.objects for insert to authenticated with check(bucket_id='pet-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Sightings public reads photos" on storage.objects for select to anon,authenticated using(bucket_id='pet-photos');
grant usage on schema public to anon,authenticated;grant select on public.cats to anon,authenticated;grant insert,update,delete on public.cats to authenticated;grant insert on public.finder_reports to anon,authenticated;grant select on public.finder_reports to authenticated;
