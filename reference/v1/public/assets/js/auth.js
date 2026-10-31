/* ============================================================================
   Élan 2026 — auth helpers (auth.js). Used by login.html, set-password.html,
   profile, and the portal logout. Reuses the shared client from portal.js when
   present, else builds one from the site's config.js.
   ========================================================================== */
(function () {
  var CFG = window.ELAN_CONFIG || {};
  var sb = window.__elan_sb || window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  window.__elan_sb = sb;

  function msg(id, text, ok) { var el = document.getElementById(id); if (el) el.innerHTML = '<div class="ep-msg ' + (ok ? "ok" : "err") + '">' + text + "</div>"; }

  window.elanAuth = {
    client: sb,
    async signIn(email, password, msgId) {
      var r = await sb.auth.signInWithPassword({ email: (email || "").trim(), password: password });
      if (r.error) { msg(msgId, "That email or password didn't work. Try again, or use \u201cSet / reset password\u201d.", false); return false; }
      location.replace("dashboard.html"); return true;
    },
    async signOut() { await sb.auth.signOut(); location.replace("../index.html"); },
    async redirectIfSignedIn() { var s = await sb.auth.getSession(); if (s.data.session) location.replace("dashboard.html"); },
    async initSetPassword(msgId) {
      var s = await sb.auth.getSession();
      if (!s.data.session) { msg(msgId, "This password link is invalid or has expired. Request a new one from the login page.", false); return false; }
      return true;
    },
    async setPassword(password, msgId) {
      if (!password || password.length < 8) { msg(msgId, "Use at least 8 characters.", false); return; }
      var r = await sb.auth.updateUser({ password: password });
      if (r.error) { msg(msgId, r.error.message, false); return; }
      msg(msgId, "Password set. Taking you to your portal\u2026", true);
      setTimeout(function () { location.replace("dashboard.html"); }, 900);
    },
    async requestReset(email, msgId) {
      var r = await sb.auth.resetPasswordForEmail((email || "").trim(), { redirectTo: location.origin + location.pathname.replace(/[^/]*$/, "set-password.html") });
      msg(msgId, r.error ? r.error.message : "If that email is registered, a reset link is on its way.", !r.error);
    },
  };
})();
