-- PawPing V2 migration. Safe to run more than once.
create extension if not exists pgcrypto;

alter table public.cats add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.cats add column if not exists photo_url text;
alter table public.cats alter column public_token set default encode(gen_random_bytes(10),'hex');

alter table public.finder_reports add column if not exists accuracy_m double precision;

alter table public.cats enable row level security;
alter table public.finder_reports enable row level security;

-- Storage bucket for public pet-profile photos.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('pet-photos','pet-photos',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

-- Recreate V2 policies deterministically.
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

grant usage on schema public to anon,authenticated;
grant select on public.cats to anon,authenticated;
grant insert,update,delete on public.cats to authenticated;
grant insert on public.finder_reports to anon,authenticated;
grant select on public.finder_reports to authenticated;
