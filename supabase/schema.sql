-- land2grid admin backend: run this once, in full, in the Supabase SQL
-- editor (Supabase dashboard > SQL Editor > New query > paste > Run).
-- It's safe to re-run: every statement is written to not fail if it's
-- already been applied.
--
-- What this sets up:
--   - profiles   one row per person who signs in, with a role of
--                'admin' (can use admin.html) or 'partner' (can only
--                view the Documents section once signed in). New
--                accounts default to 'partner' automatically.
--   - projects   the live project/deal data the dashboard reads —
--                replaces data/projects.json as the source of truth.
--   - documents  the document links shown (blurred until sign-in) on
--                each project's card.
--
-- After running this, see docs/ADMIN_SETUP.md for the one remaining
-- manual step: making yourself the first admin.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'partner' check (role in ('admin', 'partner')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A security-definer function, not a direct subquery, is what lets a
-- profiles RLS policy check someone's role without Postgres treating
-- it as a recursive policy on the same table.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'admin', false);
$$;

drop policy if exists "profiles: self can read own row" on public.profiles;
create policy "profiles: self can read own row"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: admins can read all rows" on public.profiles;
create policy "profiles: admins can read all rows"
  on public.profiles for select
  using (public.is_admin());

drop policy if exists "profiles: admins can update role" on public.profiles;
create policy "profiles: admins can update role"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- Every new Supabase Auth user (created by inviting them — see
-- docs/ADMIN_SETUP.md) automatically gets a 'partner' profile row the
-- moment their account exists, so there's nothing to set up per person
-- beyond inviting them.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'partner')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------
-- latitude/longitude (real-world coordinates) are stored rather than the
-- map's own drawing coordinates, so whoever is editing a project in
-- admin.html enters a normal place on a map, not an SVG position. The
-- same equirectangular projection the map itself uses turns lat/lon
-- into a map position at read time (see the shared helper mentioned in
-- docs/ADMIN_SETUP.md) — nothing about the projection is stored here.
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  state text not null,
  name text not null,
  capacity numeric not null,
  badge text not null default 'Early stage',
  badge_done boolean not null default false,
  land text not null default 'Not set',
  connectivity text not null default 'Not set',
  ppa text not null default 'Not set',
  latitude numeric not null default 0,
  longitude numeric not null default 0,
  last_updated date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

-- Project data (everything except documents) is the same public
-- information the dashboard has always shown with no login — that
-- doesn't change just because it now lives in a database.
drop policy if exists "projects: anyone can read" on public.projects;
create policy "projects: anyone can read"
  on public.projects for select
  using (true);

drop policy if exists "projects: admins can insert" on public.projects;
create policy "projects: admins can insert"
  on public.projects for insert
  with check (public.is_admin());

drop policy if exists "projects: admins can update" on public.projects;
create policy "projects: admins can update"
  on public.projects for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "projects: admins can delete" on public.projects;
create policy "projects: admins can delete"
  on public.projects for delete
  using (public.is_admin());

-- ---------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  url text not null,
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;

-- Documents stay gated behind sign-in (any role — admin or partner),
-- matching the blurred-until-signed-in behaviour on the dashboard.
drop policy if exists "documents: signed-in users can read" on public.documents;
create policy "documents: signed-in users can read"
  on public.documents for select
  using (auth.uid() is not null);

drop policy if exists "documents: admins can insert" on public.documents;
create policy "documents: admins can insert"
  on public.documents for insert
  with check (public.is_admin());

drop policy if exists "documents: admins can update" on public.documents;
create policy "documents: admins can update"
  on public.documents for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "documents: admins can delete" on public.documents;
create policy "documents: admins can delete"
  on public.documents for delete
  using (public.is_admin());
