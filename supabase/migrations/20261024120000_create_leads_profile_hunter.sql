-- Leads captured from the Profile Hunter (Grindr Web extension) landing page
-- at site/profile-hunter.html, used as an email-gated lead magnet for Fluidz.
-- Insert-only from the anon role: a visitor can add their own row but can
-- never read, update or delete any row — only the service role (Supabase
-- dashboard, server-side jobs) can list captured emails.

create table if not exists public.leads_profile_hunter (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  lang text not null default 'en' check (lang in ('fr', 'en')),
  source text not null default 'profile-hunter-landing',
  user_agent text,
  created_at timestamptz not null default now(),
  unique (email)
);

comment on table public.leads_profile_hunter is 'Email leads captured on the Profile Hunter landing page (site/profile-hunter.html). Insert-only via anon key from api/profile-hunter-lead.js.';

alter table public.leads_profile_hunter enable row level security;

create policy "anon can insert profile hunter leads"
  on public.leads_profile_hunter
  for insert
  to anon
  with check (true);

-- Intentionally no select/update/delete policy for anon or authenticated:
-- only the service role can read the captured emails (Supabase dashboard,
-- or a server-side job using the service_role key).
