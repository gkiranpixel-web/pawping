-- v14_public_item_created_at
--
-- Adds created_at to get_public_item's return set so the public scan page
-- can show a "registered since" trust badge, using data already collected
-- on every item (no new column needed).

drop function if exists public.get_public_item(text);

create function public.get_public_item(p_token text)
returns table(
  name text, photo_url text, age text, color text, temperament text,
  health_note text, status text, category text, details jsonb, created_at timestamptz
)
language sql
stable security definer
set search_path to 'public'
as $function$
  select name, photo_url, age, color, temperament, health_note, status, category, details, created_at
  from public.cats
  where public_token = p_token;
$function$;
