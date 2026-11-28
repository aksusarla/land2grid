// Edge Function: admin-users
//
// The only thing this function exists for: inviting someone, changing
// their role/company, or removing their access, all require Supabase's
// Admin API (or need to bypass RLS deliberately), which in turn
// requires the service_role secret key, a key that must never reach
// the browser (anyone holding it could do anything to the database,
// bypassing every RLS policy). This function holds that key on
// Supabase's own servers instead, and only acts on behalf of someone
// who is (a) signed in and (b) already has the 'admin' or 'bd' role in
// the profiles table, and, for anything touching an admin/bd account
// rather than a partner, specifically 'admin'. admin.html calls this
// function; it never sees the service_role key itself.
//
// Deploy: see docs/ADMIN_SETUP.md. Short version, paste this file's
// contents into Supabase dashboard > Edge Functions > Create a new
// function named "admin-users", then Deploy.
//
// Body (JSON), POST only:
//   { "action": "invite", "email": "someone@example.com", "role": "partner", "company_id": "<uuid>|null" }
//     role and company_id are both optional (default role: "partner",
//     default company_id: null). Only an admin can invite someone as
//     "admin" or "bd"; a bd caller can only invite partners.
//   { "action": "update_profile", "userId": "<uuid>", "role": "partner", "company_id": "<uuid>|null" }
//     role and company_id are both optional, send only what's
//     changing. An admin can change anyone's role/company; a bd
//     caller can only change a partner's company (role must already
//     be, and stay, "partner").
//   { "action": "remove", "userId": "<uuid>" }
//     An admin can remove anyone (except themselves); a bd caller can
//     only remove a partner.

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  // The Supabase JS client adds a couple of headers of its own
  // (x-client-info, and on newer client versions x-supabase-api-version)
  // on top of authorization/apikey/content-type. If any header the
  // browser's preflight asks about isn't listed here, the browser
  // blocks the real request before it's ever sent, which is why
  // invites were failing with "Failed to send a request to the Edge
  // Function" even though the function itself was deployed and fine.
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Use POST." }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  // Supabase is retiring the legacy anon/service_role keys in favor of
  // publishable/secret keys (delivered as JSON env vars keyed by name,
  // usually "default"). Prefer those; fall back to the legacy single
  // env vars so this keeps working on a project that hasn't switched.
  const SECRET_KEY = readDefaultKey("SUPABASE_SECRET_KEYS") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const PUBLISHABLE_KEY = readDefaultKey("SUPABASE_PUBLISHABLE_KEYS") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";

  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Missing Authorization header, sign in first." }, 401);
  }

  // Identify the caller from their own JWT (the publishable key + their
  // token, not the secret key, this client can only do what that
  // person is allowed to do).
  const callerClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerData, error: callerErr } = await callerClient.auth.getUser();
  if (callerErr || !callerData.user) {
    return json({ error: "Not signed in." }, 401);
  }

  // The admin client (secret key) is what actually performs every
  // privileged action below, but only after confirming, via that
  // same secret-key client, that the caller's own profile row says
  // role = 'admin' or 'bd'. Never trust a role claim sent in the
  // request body.
  const adminClient = createClient(SUPABASE_URL, SECRET_KEY);
  const { data: callerProfile, error: callerProfileErr } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", callerData.user.id)
    .single();

  const callerRole = callerProfile && callerProfile.role;
  if (callerProfileErr || !callerProfile || (callerRole !== "admin" && callerRole !== "bd")) {
    return json({ error: "Admin or BD access required." }, 403);
  }
  const isAdmin = callerRole === "admin";

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  if (body.action === "invite") {
    const email = String(body.email || "").trim();
    if (!email) return json({ error: "Email is required." }, 400);

    const requestedRole = String(body.role || "partner").trim();
    if (!["admin", "bd", "partner"].includes(requestedRole)) {
      return json({ error: "Invalid role." }, 400);
    }
    if (requestedRole !== "partner" && !isAdmin) {
      return json({ error: "Only admins can invite an admin or BD team member." }, 403);
    }
    const companyId = requestedRole === "partner" ? (body.company_id || null) : null;

    const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email);
    if (inviteErr) return json({ error: inviteErr.message }, 400);

    // The new-user trigger already created a 'partner' profile row for
    // them with no company, only touch it again if something other
    // than that default was asked for.
    if (requestedRole !== "partner" || companyId) {
      const newUserId = inviteData && inviteData.user && inviteData.user.id;
      if (newUserId) {
        await adminClient
          .from("profiles")
          .update({ role: requestedRole, company_id: companyId })
          .eq("id", newUserId);
      }
    }
    return json({ ok: true });
  }

  if (body.action === "update_profile") {
    const userId = String(body.userId || "").trim();
    if (!userId) return json({ error: "userId is required." }, 400);
    if (userId === callerData.user.id && body.role !== undefined) {
      return json({ error: "You can't change your own role here." }, 400);
    }

    const { data: target, error: targetErr } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    if (targetErr || !target) return json({ error: "Person not found." }, 404);

    const updates: Record<string, unknown> = {};

    if (body.role !== undefined) {
      const newRole = String(body.role).trim();
      if (!["admin", "bd", "partner"].includes(newRole)) return json({ error: "Invalid role." }, 400);
      if (!isAdmin && (target.role !== "partner" || newRole !== "partner")) {
        return json({ error: "Only admins can change that." }, 403);
      }
      updates.role = newRole;
    }

    if (body.company_id !== undefined) {
      if (!isAdmin && target.role !== "partner") {
        return json({ error: "Only admins can change that." }, 403);
      }
      updates.company_id = body.company_id || null;
    }

    if (!Object.keys(updates).length) return json({ error: "Nothing to update." }, 400);

    const { error: updateErr } = await adminClient.from("profiles").update(updates).eq("id", userId);
    if (updateErr) return json({ error: updateErr.message }, 400);
    return json({ ok: true });
  }

  if (body.action === "remove") {
    const userId = String(body.userId || "").trim();
    if (!userId) return json({ error: "userId is required." }, 400);
    if (userId === callerData.user.id) {
      return json({ error: "You can't remove your own access." }, 400);
    }

    if (!isAdmin) {
      const { data: target, error: targetErr } = await adminClient
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      if (targetErr || !target) return json({ error: "Person not found." }, 404);
      if (target.role !== "partner") return json({ error: "Only admins can remove that person." }, 403);
    }

    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  return json({ error: "Unknown action. Use 'invite', 'update_profile' or 'remove'." }, 400);
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// SUPABASE_SECRET_KEYS / SUPABASE_PUBLISHABLE_KEYS are JSON objects
// keyed by key name (usually "default"), e.g. {"default":"sb_secret_..."}.
function readDefaultKey(envVar: string): string | null {
  const raw = Deno.env.get(envVar);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed.default ?? Object.values(parsed)[0] ?? null;
  } catch {
    return null;
  }
}
