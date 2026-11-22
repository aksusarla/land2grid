// Edge Function: admin-users
//
// The only thing this function exists for: inviting a new partner, or
// removing someone's access, both require Supabase's Admin API, which
// in turn requires the service_role secret key — a key that must never
// reach the browser (anyone holding it could do anything to the
// database, bypassing every RLS policy). This function holds that key
// on Supabase's own servers instead, and only acts on behalf of someone
// who is (a) signed in and (b) already has the 'admin' role in the
// profiles table. admin.html calls this function; it never sees the
// service_role key itself.
//
// Deploy: see docs/ADMIN_SETUP.md. Short version — paste this file's
// contents into Supabase dashboard > Edge Functions > Create a new
// function named "admin-users", then Deploy.
//
// Body (JSON), POST only:
//   { "action": "invite", "email": "someone@example.com" }
//   { "action": "remove", "userId": "<uuid>" }

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
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
    return json({ error: "Missing Authorization header — sign in first." }, 401);
  }

  // Identify the caller from their own JWT (the publishable key + their
  // token, not the secret key — this client can only do what that
  // person is allowed to do).
  const callerClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: callerData, error: callerErr } = await callerClient.auth.getUser();
  if (callerErr || !callerData.user) {
    return json({ error: "Not signed in." }, 401);
  }

  // The admin client (secret key) is what actually performs the
  // privileged action — but only after confirming, via that same
  // secret-key client, that the caller's own profile row says
  // role = 'admin'. Never trust a role claim sent in the request body.
  const adminClient = createClient(SUPABASE_URL, SECRET_KEY);
  const { data: profile, error: profileErr } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", callerData.user.id)
    .single();

  if (profileErr || !profile || profile.role !== "admin") {
    return json({ error: "Admin access required." }, 403);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  if (body.action === "invite") {
    const email = String(body.email || "").trim();
    if (!email) return json({ error: "Email is required." }, 400);
    const { error } = await adminClient.auth.admin.inviteUserByEmail(email);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  if (body.action === "remove") {
    const userId = String(body.userId || "").trim();
    if (!userId) return json({ error: "userId is required." }, 400);
    if (userId === callerData.user.id) {
      return json({ error: "You can't remove your own access." }, 400);
    }
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  return json({ error: "Unknown action. Use 'invite' or 'remove'." }, 400);
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
