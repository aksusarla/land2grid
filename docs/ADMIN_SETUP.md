# Admin setup (one-time)

This turns the site from "projects live in a JSON file that only someone
editing code can change" into "projects and partner logins are managed from
a page in the browser" — no code required after this is done once.

If you've done the partner-login setup in `docs/PARTNER_LOGIN_SETUP.md`
already, some of this will look familiar — this supersedes it. Partner
logins and project data now live in the same place (Supabase) and are both
managed from `admin.html`.

Budget about 20–30 minutes. You'll need to be comfortable copying and
pasting a few things; no coding.

## What you're setting up

- A free Supabase project (hosted Postgres database + login system).
- A database table for projects and one for documents, replacing
  `data/projects.json`.
- A `profiles` table that says who's an admin and who's a view-only partner.
- One small server-side function that lets admins invite people and revoke
  access, without ever putting a dangerous secret key in the website itself.
- Yourself, as the first admin (a one-time manual step — after that, admins
  can promote other admins from the admin page).

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free tier is fine).
2. Create a new project. Pick any name and a strong database password — save
   that password somewhere, you likely won't need it again but it's your
   recovery key if something goes wrong.
3. Wait for it to finish provisioning (a minute or two).

## 2. Run the database setup script

1. In the Supabase dashboard, open **SQL Editor** (left sidebar).
2. Open `supabase/schema.sql` from this repo, copy the whole file.
3. Paste it into the SQL editor and click **Run**.

This creates the `projects`, `documents`, and `profiles` tables, sets up the
rule that new signups automatically get a `partner` (view-only) profile, and
locks down who can edit what (admins can edit; partners and the public can
only view — see "How access is locked down" below).

It's safe to re-run this script later if you need to; it won't duplicate
anything or wipe existing data.

## 3. Turn off public signups

By default Supabase lets anyone sign up. You don't want that — only people
you've invited should be able to sign in.

1. **Authentication > Settings** (sometimes under **Authentication >
   Providers** depending on the Supabase version).
2. Turn **off** "Allow new users to sign up" / "Enable sign up".

People will only be able to get in via an invite email sent from the admin
page.

## 4. Deploy the invite/remove-access function

Inviting someone or revoking their access needs to happen with elevated
("service role") permissions that must never be exposed in the website's
own code. That's what this function is for — it runs on Supabase's servers,
not in the browser.

1. In the Supabase dashboard, open **Edge Functions**.
2. Create a new function named exactly `admin-users`.
3. Open `supabase/functions/admin-users/index.ts` from this repo, copy the
   whole file, and paste it in as the function's code (replacing the
   placeholder/template it starts with).
4. Deploy it.

No extra configuration needed — Supabase automatically gives the function
whichever of these it has for your project, and the function's code checks
both: the current **publishable** / **secret** keys, or the older **anon** /
**service_role** keys on a project that hasn't switched over. Either way,
the secret/service_role side of this never leaves Supabase's servers.

## 5. Connect the website to your project

1. In Supabase: **Settings (gear icon) > API Keys**. Copy the **Project
   URL** and the **Publishable key** (`sb_publishable_...`) — not the
   **Secret key** (`sb_secret_...`), which must never leave Supabase. On an
   older project you may instead see **anon public** / **service_role**
   under a "Legacy API keys" tab — use **anon public** the same way.
2. Open `assets/auth.js` in this repo and paste them in:
   ```js
   var SUPABASE_URL = 'https://your-project-ref.supabase.co';
   var SUPABASE_ANON_KEY = 'your-anon-public-key';
   ```
3. Commit and push. Once this is live, `dashboard.html` automatically
   switches from reading `data/projects.json` to reading live from
   Supabase — nothing else needs to change for that to happen.

## 6. Become the first admin

Nobody is an admin yet — every new signup defaults to `partner`. You have
to promote yourself once, by hand, in the SQL editor:

1. Sign up: open `login.html` on the live site and use "forgot password" /
   whatever sign-up flow is exposed, OR invite yourself from a second email
   address once you've temporarily turned signups back on, OR simplest —
   in the Supabase dashboard go to **Authentication > Users** and click
   **Add user** to create your own account directly with an email and
   password.
2. Back in **SQL Editor**, run (with your real email):
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
3. Sign in at `login.html` with that account, then go to `admin.html`.
   You should see the full admin page: adding/editing projects, and an
   "Invite" box under People.

From here on, you never need the SQL editor again — any admin can promote
other people to admin from the People list on `admin.html`.

## 7. Move your existing projects in

`admin.html` has a one-time **Import data/projects.json** button that
appears automatically when the `projects` table is empty. Click it once —
it reads the existing JSON file and creates matching rows (documents
included). It disappears once there's at least one project in the database,
since after that `admin.html` is the way projects get added or changed.

One thing to fix up after importing: the JSON file stores map pins as
already-plotted x/y coordinates, not real latitude/longitude, so imported
projects land at 0,0 (map's top-left corner) until you edit each one and
fill in its real **Latitude** / **Longitude** fields. New projects added
directly in `admin.html` ask for latitude/longitude up front, so this is
only a one-time cleanup for whatever was in the old file.

`data/projects.json` and `scripts/sync_from_sheet.py` become legacy once
this is done — nothing deletes them, but they're no longer the source of
truth. `dashboard.html` only falls back to reading the JSON file if
Supabase isn't configured at all (step 5 hasn't been done yet), so there's
nothing to clean up on that front either.

## How access is locked down

- **Anyone** (no login) can see project names, capacity, land/connectivity/
  PPA status, and the map. That's the public dashboard.
- **Documents** are only visible to someone who is signed in — any role,
  partner or admin.
- **Editing** anything (projects, documents, who's an admin) requires the
  `admin` role. Partners are view-only everywhere, including on
  `admin.html` itself — a partner who navigates there sees a message and a
  link back to the documents page instead of the admin tools.
- Only the `admin-users` Edge Function can create or delete logins, and it
  independently re-checks that the person calling it is really an admin
  (it never trusts a role claim from the browser) before doing anything.

## Troubleshooting

- **"Partner login isn't set up yet" on `admin.html` or `login.html`** —
  `assets/auth.js` still has the placeholder `YOUR_SUPABASE_PROJECT_URL` /
  `YOUR_SUPABASE_ANON_KEY` values. Finish step 5.
- **Invite button says it couldn't reach the function** — the
  `admin-users` function either isn't deployed yet (step 4) or its name is
  spelled differently than `admin-users`.
- **Signed in but `admin.html` says "admins only"** — that account's
  `profiles.role` is still `partner`. Either run the SQL from step 6 for
  that email, or have an existing admin promote them from the People list.
- **Nobody can sign up** — that's intentional (step 3). Admins invite
  people from `admin.html`; there's no public signup form.
