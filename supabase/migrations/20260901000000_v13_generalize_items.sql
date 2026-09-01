-- v13_generalize_items
--
-- Generalizes the pet-only "cats" table to support multiple item categories
-- (pet, generic lost item, medical ID, property/rental) without a
-- disruptive table rename. `category` picks the public-page template;
-- `details` holds category-specific structured fields (e.g. medical
-- allergies, item brand) so adding a future category rarely needs another
-- migration.
--
-- Applied directly to the live project via the Supabase MCP on 2026-09-01;
-- this file exists so it's versioned and reviewable going forward instead
-- of living only as an ad-hoc change (see supabase/migrations/README.md).

alter table public.cats
  add column if not exists category text not null default 'pet',
  add column if not exists details jsonb not null default '{}'::jsonb;

update public.cats set category = 'pet' where category is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cats_category_check'
  ) then
    alter table public.cats
      add constraint cats_category_check
      check (category in ('pet','item','medical','property'));
  end if;
end $$;

-- Replaces get_public_pet: same security-definer, token-gated,
-- private-field-excluding contract (never selects owner_id/contact_phone),
-- now also returns category + details so the public page can render the
-- right template.
drop function if exists public.get_public_pet(text);

create or replace function public.get_public_item(p_token text)
returns table(
  name text, photo_url text, age text, color text, temperament text,
  health_note text, status text, category text, details jsonb
)
language sql
stable security definer
set search_path to 'public'
as $function$
  select name, photo_url, age, color, temperament, health_note, status, category, details
  from public.cats
  where public_token = p_token;
$function$;
