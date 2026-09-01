-- v16_beta_gate_new_features
--
-- The category system (item/medical/property), multi-language public
-- page, reward field, and trust badge shipped in 0.7.0 should only be
-- usable by the app owner's own account for now, not by every registered
-- user — a deliberate soft-launch gate, not a permanent restriction.
--
-- is_beta_user() lets the client (owner dashboard) decide whether to show
-- the new UI at all. The two RLS policy updates are the real enforcement:
-- even someone bypassing the dashboard UI and calling the Supabase client
-- directly cannot create or update a cats row into a non-'pet' category
-- unless they are the beta account.
--
-- To open this up to everyone later: drop the two "OR owner_id = ..."
-- clauses below (revert to plain owner_id = auth.uid()) and stop checking
-- is_owner_beta / is_beta_user() in the app.

create or replace function public.is_beta_user()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select auth.uid() = '834086ae-dec1-4764-a7f9-376de83a26c5'::uuid;
$function$;

grant execute on function public.is_beta_user() to authenticated;

alter policy "Owners insert cats" on public.cats
  with check (
    owner_id = (select auth.uid())
    and (category = 'pet' or owner_id = '834086ae-dec1-4764-a7f9-376de83a26c5'::uuid)
  );

alter policy "Owners update cats" on public.cats
  with check (
    owner_id = (select auth.uid())
    and (category = 'pet' or owner_id = '834086ae-dec1-4764-a7f9-376de83a26c5'::uuid)
  );

-- get_public_item now returns is_owner_beta instead of ever exposing the
-- raw owner_id — the public page uses this one boolean to decide whether
-- to render the new category/i18n/reward/trust-badge experience or the
-- classic pet-only English page.
drop function if exists public.get_public_item(text);

create function public.get_public_item(p_token text)
returns table(
  name text, photo_url text, age text, color text, temperament text,
  health_note text, status text, category text, details jsonb,
  created_at timestamptz, is_owner_beta boolean
)
language sql
stable security definer
set search_path to 'public'
as $function$
  select name, photo_url, age, color, temperament, health_note, status, category, details,
    created_at, (owner_id = '834086ae-dec1-4764-a7f9-376de83a26c5'::uuid)
  from public.cats
  where public_token = p_token;
$function$;
