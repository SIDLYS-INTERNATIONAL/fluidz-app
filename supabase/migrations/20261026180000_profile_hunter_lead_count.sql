-- Public, aggregate-only counter for the Profile Hunter landing page.
-- The leads table stays insert-only for anon (no one can read emails from the
-- browser); this function only ever returns a single number, the total count
-- of captured leads, which the landing page shows as social proof.

create or replace function public.profile_hunter_lead_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*) from public.leads_profile_hunter;
$$;

revoke all on function public.profile_hunter_lead_count() from public;
grant execute on function public.profile_hunter_lead_count() to anon;
