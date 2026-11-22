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

-- RLS policies only apply once a role already has the underlying table
-- privilege; creating tables here in the SQL editor (rather than the
-- Table Editor UI, which grants this automatically) leaves anon/
-- authenticated with none at all, so every policy below would 401 with
-- "permission denied for table ..." without these grants.
grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;

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

grant select on public.projects to anon, authenticated;
grant insert, update, delete on public.projects to authenticated;

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

-- Only authenticated gets a grant at all (not anon) — that way a
-- signed-out visitor is denied at the privilege level, not just by the
-- RLS policy below, matching "the database denies the query entirely
-- for a signed-out visitor" in dashboard.html's own comment.
grant select, insert, update, delete on public.documents to authenticated;

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

-- ---------------------------------------------------------------
-- enquiries
-- ---------------------------------------------------------------
-- Backs the public contact form (contact.html), which inserts directly
-- via the publishable client key — no server/function needed. Anyone
-- can insert (that's the whole point of a contact form), but only
-- admins can read or delete the submissions, via admin.html.
create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text,
  state text,
  capacity text,
  need text,
  message text,
  created_at timestamptz not null default now()
);

alter table public.enquiries enable row level security;

grant insert on public.enquiries to anon, authenticated;
grant select, delete on public.enquiries to authenticated;

drop policy if exists "enquiries: anyone can submit" on public.enquiries;
create policy "enquiries: anyone can submit"
  on public.enquiries for insert
  with check (true);

drop policy if exists "enquiries: admins can read" on public.enquiries;
create policy "enquiries: admins can read"
  on public.enquiries for select
  using (public.is_admin());

drop policy if exists "enquiries: admins can delete" on public.enquiries;
create policy "enquiries: admins can delete"
  on public.enquiries for delete
  using (public.is_admin());

-- ---------------------------------------------------------------
-- companies + the 'bd' role
-- ---------------------------------------------------------------
-- Added once the two-role (admin/partner) model needed to grow: a BD
-- team that can invite and manage partners themselves, and partners
-- grouped by the company they represent, so one partner company's
-- documents aren't visible to another's. Safe to re-run like the rest
-- of this file — every statement below is additive/idempotent.
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.companies enable row level security;
grant select, insert, update, delete on public.companies to authenticated;

-- A partner's own company (nullable — admins/BD aren't tied to one,
-- and an existing partner with no company yet just sees nothing extra
-- until someone assigns them one).
alter table public.profiles
  add column if not exists company_id uuid references public.companies(id) on delete set null;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'bd', 'partner'));

-- Which company (if any) a project/deal is being run for. Nullable —
-- the public pipeline map doesn't need every project tied to a
-- partner; this only matters for scoping that project's documents.
alter table public.projects
  add column if not exists company_id uuid references public.companies(id) on delete set null;

-- is_staff(): the internal land2grid team (admin or bd), as opposed to
-- an external partner. Replaces is_admin() everywhere that used to
-- mean "can manage projects/companies/people" but should now also
-- include BD.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) in ('admin', 'bd'), false);
$$;

-- my_company_id(): the caller's own company — used to scope a
-- partner's document access to their own company's projects only.
create or replace function public.my_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

-- companies: staff manage the list; a partner can read (only) their
-- own company's row, e.g. to show its name back to them.
drop policy if exists "companies: staff can read" on public.companies;
create policy "companies: staff can read"
  on public.companies for select
  using (public.is_staff());

drop policy if exists "companies: partner can read own" on public.companies;
create policy "companies: partner can read own"
  on public.companies for select
  using (id = public.my_company_id());

drop policy if exists "companies: staff can insert" on public.companies;
create policy "companies: staff can insert"
  on public.companies for insert
  with check (public.is_staff());

drop policy if exists "companies: staff can update" on public.companies;
create policy "companies: staff can update"
  on public.companies for update
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "companies: staff can delete" on public.companies;
create policy "companies: staff can delete"
  on public.companies for delete
  using (public.is_staff());

-- projects: BD can now manage the pipeline too, not just admins.
drop policy if exists "projects: admins can insert" on public.projects;
drop policy if exists "projects: staff can insert" on public.projects;
create policy "projects: staff can insert"
  on public.projects for insert
  with check (public.is_staff());

drop policy if exists "projects: admins can update" on public.projects;
drop policy if exists "projects: staff can update" on public.projects;
create policy "projects: staff can update"
  on public.projects for update
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "projects: admins can delete" on public.projects;
drop policy if exists "projects: staff can delete" on public.projects;
create policy "projects: staff can delete"
  on public.projects for delete
  using (public.is_staff());

-- documents: this used to be "any signed-in person sees every
-- document on every project" (fine when every signed-in person was
-- land2grid staff or a single lumped-together 'partner' role, wrong
-- once different partner companies are signing in). Staff still see
-- everything; a partner now sees only documents on projects tagged
-- with their own company.
drop policy if exists "documents: signed-in users can read" on public.documents;
drop policy if exists "documents: staff can read all" on public.documents;
create policy "documents: staff can read all"
  on public.documents for select
  using (public.is_staff());

drop policy if exists "documents: partner can read own company's" on public.documents;
create policy "documents: partner can read own company's"
  on public.documents for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = documents.project_id
        and p.company_id is not null
        and p.company_id = public.my_company_id()
    )
  );

drop policy if exists "documents: admins can insert" on public.documents;
drop policy if exists "documents: staff can insert" on public.documents;
create policy "documents: staff can insert"
  on public.documents for insert
  with check (public.is_staff());

drop policy if exists "documents: admins can update" on public.documents;
drop policy if exists "documents: staff can update" on public.documents;
create policy "documents: staff can update"
  on public.documents for update
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "documents: admins can delete" on public.documents;
drop policy if exists "documents: staff can delete" on public.documents;
create policy "documents: staff can delete"
  on public.documents for delete
  using (public.is_staff());

-- profiles: BD (not just admin) can now see the People list, needed
-- to manage partners. Only an admin can promote/demote anyone's role;
-- BD can still update a partner's company assignment directly (e.g.
-- from a future "edit" UI) as long as the row stays a partner —
-- enforced below rather than through the admin-users function, so it
-- works even for a plain table update.
drop policy if exists "profiles: admins can read all rows" on public.profiles;
drop policy if exists "profiles: staff can read all rows" on public.profiles;
create policy "profiles: staff can read all rows"
  on public.profiles for select
  using (public.is_staff());

drop policy if exists "profiles: bd can update partner company" on public.profiles;
create policy "profiles: bd can update partner company"
  on public.profiles for update
  using (public.is_staff() and role = 'partner')
  with check (role = 'partner');
