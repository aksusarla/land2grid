// Shared Supabase config for partner login (login.html), the gated
// documents page (documents.html), and the admin page (admin.html).
// Live values for the land2grid Supabase project, see
// docs/ADMIN_SETUP.md for how this was set up and how to redo it on a
// different project if needed.
(function () {
  var SUPABASE_URL = 'https://qygkxxiogwalgzzblpmo.supabase.co';
  // This is the "publishable" key (Supabase's current name for what
  // used to be the "anon" key), safe to ship in client-side code like
  // this file. It identifies the project, not a person; real access
  // control happens in Postgres via the row-level-security policies in
  // supabase/schema.sql, not by keeping this key secret.
  var SUPABASE_ANON_KEY = 'sb_publishable_SUxI53uBdIsPfA3kjE1Uew_0mVW8HYU';

  var configured =
    SUPABASE_URL.indexOf('supabase.co') !== -1 &&
    SUPABASE_ANON_KEY.length > 20;

  var client = null;

  function getClient() {
    if (!configured || typeof window.supabase === 'undefined') return null;
    if (!client) {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return client;
  }

  // Every signed-in user has a row in `profiles` (created automatically
  // on signup by a database trigger, see supabase/schema.sql) with a
  // role of 'admin' or 'partner'. This is what admin.html checks before
  // showing anything, and what documents.html could check too, though
  // today any signed-in role can view documents.
  function getProfile() {
    var c = getClient();
    if (!c) return Promise.resolve(null);
    return c.auth.getSession().then(function (res) {
      var session = res.data && res.data.session;
      if (!session) return null;
      return c.from('profiles').select('id,email,role').eq('id', session.user.id).single()
        .then(function (r) {
          if (r.error || !r.data) return { id: session.user.id, email: session.user.email, role: 'partner' };
          return r.data;
        });
    });
  }

  window.L2G_AUTH = {
    isConfigured: function () { return configured; },
    getClient: getClient,
    getProfile: getProfile
  };
})();
