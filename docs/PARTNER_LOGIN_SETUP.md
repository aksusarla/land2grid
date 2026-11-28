# Partner login setup (Supabase), superseded

**Use `docs/ADMIN_SETUP.md` instead.** This file covered login-only setup
from before there was an admin page; everything below is now part of a
larger setup that also moves project data into Supabase and adds a no-code
admin page (`admin.html`) for managing both projects and logins. Kept here
for reference only.

---

The "Partner login" link in the site footer (`login.html`) and the gated
`documents.html` page are built, but they need a real Supabase project
before anyone can actually sign in. Until then, both pages show a plain
"isn't set up yet" message, nothing is broken, it's just inert.

## 1. Create the Supabase project

1. Go to https://supabase.com and sign up (free tier is enough for this).
2. Create a new project. Pick any name/region; note the database password
   it asks you to set (you likely won't need it for this).
3. Wait for the project to finish provisioning (a couple of minutes).

## 2. Get your API keys

1. In the project dashboard: **Project Settings > API**.
2. Copy the **Project URL** (looks like `https://abcdefghijkl.supabase.co`).
3. Copy the **anon public** key (a long string, NOT the `service_role`
   key, which must never be put in a public website's code).

## 3. Paste them into the site

Open `assets/auth.js` and replace the two placeholder values near the top:

```js
var SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
var SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

with the real values from step 2. Commit and push, that's the only code
change needed to turn login on.

## 4. Make it invite-only

By default Supabase lets anyone sign themselves up. Since this is meant
for your team and specific partners, turn that off:

1. **Authentication > Settings** (sometimes called "Auth Providers" /
   "Policies" depending on the dashboard version).
2. Find **"Allow new users to sign up"** (or "Enable email signups") and
   turn it **off**.

With that off, the only way to get an account is for you to create one.

## 5. Add a person

1. **Authentication > Users > Invite user** (or "Add user").
2. Enter their email. Supabase emails them a link to set a password.
3. They can then sign in at `yoursite.com/login.html`.

To remove someone's access later, delete their user from that same list.

## Document links on project cards

Every project card on the dashboard has a "Documents" section. To
anyone not signed in, it's a blurred placeholder with a "Partner
login" button. Once Supabase is set up (above) and someone signs in,
it unblurs on every card at once, showing whatever links are attached
to that project.

To attach documents to a project, either:

- Edit `data/projects.json` directly and add a `"documents"` array to
  that project, e.g. `[{"name": "Term sheet", "url": "https://..."}]`, or
- Add a `Documents` column to your Google Sheet (if you're using
  `scripts/sync_from_sheet.py`) with entries like
  `Term sheet | https://drive.google.com/... ; Land survey | https://...`
, see the script's own docstring for the exact format.

The links themselves point wherever you already host the file (Google
Drive, Dropbox, etc.), this is a link, not a file upload. A project
with no documents yet just shows "No documents shared yet" once
unlocked.

## What exists today vs. later

- **Today:** a login wall, document *links* on each project card that
  stay blurred until sign-in, and a `documents.html` page that shows
  its contents only to someone with a valid session, with a sign-out
  button.
- **Later, when you're ready:** real file upload/download through
  Supabase Storage (so a document lives on the site instead of a link
  to somewhere else), and an access log, who signed in and when, 
  since Supabase's Auth system already records sign-in events that can
  be queried or exported. Say the word and that's the next layer to
  build on top of this.
