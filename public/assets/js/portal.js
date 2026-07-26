/* ============================================================================
   Élan 2026 — Participant Portal engine (portal.js)
   Lives in public/portal/*.html. Loaded BEFORE main.js so the injected nav is
   present when main.js wires the mobile toggle / sticky / countdown. Reuses the
   site's real classes (.site-nav, .page-hero, .white-card, .schedule-card, …).
   ========================================================================== */
(function () {
  var CFG = window.ELAN_CONFIG || {};
  var sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  window.__elan_sb = sb;

  var NAV = [
    ["Dashboard", "dashboard.html"], ["My Ticket", "ticket.html"],
    ["Schedule", "portal-schedule.html"], ["Participant Guide", "participant-guide.html"],
    ["Crisis Command", "flagship.html"], ["Cent$ible", "centsible.html"], ["Announcements", "announcements.html"],
    ["Help Desk", "help-desk.html"], ["Profile", "profile.html"],
  ];
  var here = (location.pathname.split("/").pop() || "").replace(/\.html$/, "") || "dashboard";
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  // ---- inject the real navbar (identical classes → identical look/behaviour) ----
  function navHTML() {
    var links = NAV.map(function (n) {
      return '<a class="nav-link' + (n[1].replace(/\.html$/, "") === here ? " active" : "") + '" href="' + n[1] + '">' + n[0] + "</a>";
    }).join("");
    return '' +
      '<nav class="site-nav" id="epNav">' +
        '<a class="brand" aria-label="Élan portal home" href="dashboard.html">' +
          '<span class="brand-mark"><img alt="Élan horse logo" src="../assets/img/elan-horse-logo-512.png"/></span>' +
          '<span class="brand-copy"><strong>Élan</strong><small>Participant Portal</small></span>' +
        '</a>' +
        '<button class="menu-toggle" type="button" aria-label="Open menu" aria-expanded="false"><span></span><span></span></button>' +
        '<div class="nav-panel"><div class="nav-links">' + links +
          '<a class="nav-link" href="../index.html">Main Site</a>' +
          '<a class="nav-link ep-logout" href="#" id="epLogout">Logout</a>' +
        '</div></div>' +
      '</nav>';
  }

  function footHTML() {
    return '' +
    '<footer class="footer"><div class="container footer-grid">' +
      '<div><a class="footer-brand" href="../index.html"><span class="footer-logo"><img alt="Élan horse logo" src="../assets/img/elan-horse-logo-512.png"/></span><strong>Élan 2026</strong></a>' +
      '<p>Your official participant portal for tickets, schedule, event instructions, and updates.</p></div>' +
      '<div><h3>Portal</h3><div class="footer-links"><a href="dashboard.html">Dashboard</a><a href="ticket.html">My Ticket</a><a href="portal-schedule.html">Schedule</a><a href="participant-guide.html">Participant Guide</a><a href="announcements.html">Announcements</a><a href="help-desk.html">Help Desk</a></div></div>' +
      '<div><h3>Contact</h3><p>Director: Akshit Parmar</p><p><a href="tel:+918160215010">+91 8160215010</a></p><p><a href="mailto:elan@sgischool.in">elan@sgischool.in</a></p></div>' +
      '<div><h3>Public site</h3><div class="footer-links"><a href="../index.html">Home</a><a href="../tickets.html">Tickets</a><a href="../faqs.html">FAQs</a></div></div>' +
    '</div><div class="container footer-bottom"><span>© 2026 Élan. All rights reserved.</span><span>5–6 September 2026 · SGI Pune Campus · Pune, Maharashtra</span></div></footer>';
  }

  // Inject synchronously (body exists — scripts are at end of body).
  document.body.insertAdjacentHTML("afterbegin", navHTML());

  function state(title, msg, kind, cta) {
    return '<section class="page-hero"><div class="container">' +
      '<div class="breadcrumb"><span>Élan 2026</span></div><h1>' + esc(title) + "</h1>" +
      '<div class="ep-msg ' + kind + '">' + esc(msg) + "</div>" +
      (cta ? '<div class="cta-row" style="margin-top:22px"><a class="btn btn-gold" href="' + cta.href + '">' + esc(cta.label) + "</a></div>" : "") +
      "</div></section>";
  }

  async function guard(main) {
    var s = await sb.auth.getSession();
    var session = s.data.session;
    if (!session) { location.replace("login.html"); return null; }
    var r = await sb.from("participants").select("*").eq("auth_user_id", session.user.id).maybeSingle();
    if (r.error) { main.innerHTML = state("Something went wrong",
      "We couldn't load your participant record. Please try again shortly, or contact the Help Desk.", "err"); return null; }
    var p = r.data;
    if (!p) { main.innerHTML = state("Access not active yet",
      "You're signed in, but no confirmed participant record is linked to this account yet. If you've just paid, allow a few minutes and refresh.", "err",
      { href: "login.html", label: "Back to login" }); return null; }
    if (["paid", "confirmed"].indexOf(p.payment_status) < 0) { main.innerHTML = state("Access not active yet",
      "Your registration isn't confirmed as paid yet. Once payment is verified, your portal unlocks automatically.", "err"); return null; }
    return p;
  }

  var pages = {
    dashboard: async function (p, main) {
      var a = await sb.from("portal_announcements").select("*").eq("is_published", true).order("created_at", { ascending: false }).limit(1);
      var latest = a.data && a.data[0];
      main.innerHTML =
        '<section class="page-hero"><div class="container"><div class="breadcrumb"><span>Welcome to Élan 2026</span></div>' +
        "<h1>Hello, " + esc(p.full_name) + ".</h1>" +
        '<p>Your participant access is active. Use this portal for your ticket, schedule, event instructions, and official updates.</p></div></section>' +
        '<section class="section light-section"><div class="container">' +
          '<div class="ep-grid3">' +
            '<div class="ep-pass"><div class="ep-uid-label">Participant UID</div><div class="ep-uid">' + esc(p.participant_uid) + "</div><div class=\"ep-uid-sub\">Your permanent Élan identity.</div></div>" +
            '<article class="white-card"><span class="section-label">Ticket</span><h3 class="card-title" style="font-size:26px">' + esc(p.ticket_type || "—") + '</h3><span class="tag ep-good">Access active</span></article>' +
            '<article class="white-card"><span class="section-label">Élan begins in</span><h3 class="ep-count ep-mono"><span id="days">00</span>d <span id="hours">00</span>h <span id="minutes">00</span>m <span id="seconds">00</span>s</h3><p class="card-copy">5–6 September 2026 · SGI Campus</p></article>' +
          "</div>" +
          (p.flagship ? ('<article class="white-card" style="margin-top:16px"><span class="section-label">Your flagship</span>' +
            (p.flagship === "Crisis Command"
              ? '<h3 class="card-title" style="font-size:26px">Crisis Command</h3>' +
                (p.cc_role ? '<p class="card-copy">Your cabinet post: <strong>' + esc(p.cc_role) + '</strong></p>'
                           : '<p class="card-copy">Your cabinet post will appear here once teams are formed.</p>') +
                '<div class="cta-row" style="margin-top:10px"><a class="btn btn-link" href="flagship.html">Crisis Command briefing →</a></div>'
              : '<h3 class="card-title" style="font-size:26px">Cent$ible' + (p.centsible_theme ? ' — ' + esc(p.centsible_theme) : '') + '</h3>' +
                (p.cents_balance != null ? '<p class="card-copy">Cents balance: <strong>' + Number(p.cents_balance).toLocaleString("en-IN") + ' ¢</strong></p>' : '') +
                '<p class="card-copy">All three theme rounds run on Day 1; the Boardroom Finale is on Day 2.</p>' +
                '<div class="cta-row" style="margin-top:10px"><a class="btn btn-link" href="centsible.html">Your Cent$ible arena →</a></div>') +
            '</article>') : '') +
          '<div class="ep-grid2" style="margin-top:16px">' +
            '<article class="white-card"><h3 class="card-title">Latest announcement</h3>' +
              (latest ? '<span class="stage">' + new Date(latest.created_at).toLocaleString() + "</span><p class=\"card-copy\" style=\"margin-top:8px\"><strong>" + esc(latest.title) + "</strong><br>" + esc(latest.body) + '</p><div class="cta-row" style="margin-top:14px"><a class="btn btn-link" href="announcements.html">All announcements →</a></div>'
                     : '<p class="card-copy">No announcements yet. Official updates will appear here.</p>') +
            "</article>" +
            '<article class="white-card"><h3 class="card-title">Quick links</h3><ul class="list-clean" style="margin-top:10px">' +
              '<li><a href="ticket.html">My Ticket</a></li><li><a href="portal-schedule.html">Schedule</a></li><li><a href="participant-guide.html">Participant Guide</a></li>' +
              (p.flagship === "Cent$ible" ? '<li><a href="centsible.html">Cent$ible' + (p.centsible_theme ? " — " + esc(p.centsible_theme) : "") + '</a></li>'
               : p.flagship === "Crisis Command" ? '<li><a href="flagship.html">Crisis Command</a></li>'
               : '<li><a href="flagship.html">Crisis Command</a></li><li><a href="centsible.html">Cent$ible</a></li>') +
              '<li><a href="help-desk.html">Help Desk</a></li></ul></article>' +
          "</div>" +
        "</div></section>";
      startCountdown();
    },

    ticket: async function (p, main) {
      main.innerHTML =
        '<section class="page-hero"><div class="container"><div class="breadcrumb"><span>Official access</span></div><h1>My Ticket.</h1><p>Show this ticket at check-in.</p></div></section>' +
        '<section class="section light-section"><div class="container"><div class="ep-grid2">' +
          '<div class="ep-pass"><div class="ep-uid-label">Participant UID</div><div class="ep-uid">' + esc(p.participant_uid) + "</div>" +
            '<div class="ep-uid-sub">' + esc(p.full_name) + " · " + esc(p.ticket_type || "") + "</div>" +
            '<div style="margin-top:14px"><span class="tag ' + (p.check_in_status === "checked_in" ? "ep-good" : "ep-warn") + '">' + (p.check_in_status === "checked_in" ? "Checked in" : "Not checked in") + "</span></div></div>" +
          '<article class="white-card" style="display:flex;gap:22px;align-items:center;flex-wrap:wrap">' +
            '<div class="ep-qr">QR<br>placeholder<br><span class="ep-mono">' + esc(p.participant_uid) + "</span></div>" +
            '<div><span class="section-label">Event dates</span><h3 class="card-title" style="font-size:24px">5–6 Sep 2026</h3>' +
            '<span class="stage">Payment</span><div><span class="tag ep-good">' + esc(p.payment_status) + "</span></div></div>" +
          "</article></div></div></section>";
    },

    schedule: async function (_p, main) {
      var r = await sb.from("portal_schedule_items").select("*").eq("is_published", true).order("day").order("start_time");
      main.innerHTML = '<section class="page-hero"><div class="container"><div class="breadcrumb"><span>Participants only</span></div><h1>Schedule.</h1><p>Detailed timings for both event days.</p></div></section>' +
        '<section class="section light-section"><div class="container" id="epSched"></div></section>';
      var mount = document.getElementById("epSched");
      if (r.error) { mount.innerHTML = '<article class="white-card"><p class="card-copy">Couldn\'t load the schedule. Please try again shortly.</p></article>'; return; }
      var items = r.data || [];
      if (!items.length) { mount.innerHTML = '<article class="white-card"><p class="card-copy">The detailed schedule will be published here soon.</p></article>'; return; }
      var days = items.map(function (i) { return i.day; }).filter(function (v, x, a) { return a.indexOf(v) === x; }).sort();
      function row(i) {
        return '<article class="schedule-card"><div class="schedule-time">' + (i.start_time || "").slice(0, 5) + "</div>" +
          "<div>" + (i.category ? '<span class="tag">' + esc(i.category) + "</span>" : "") + "<h3>" + esc(i.title) + "</h3>" +
          (i.description ? "<p>" + esc(i.description) + "</p>" : "") + "</div>" +
          (i.location ? '<span class="stage">' + esc(i.location) + "</span>" : "<span></span>") + "</article>";
      }
      function render(d) { return items.filter(function (i) { return i.day === d; }).map(row).join(""); }
      mount.innerHTML = '<div class="ep-day-tabs">' + days.map(function (d, x) {
        return '<button class="filter-btn' + (x === 0 ? " active" : "") + '" data-day="' + d + '">Day ' + d + "</button>"; }).join("") +
        '</div><div class="schedule-list" id="epDay">' + render(days[0]) + "</div>";
      mount.querySelectorAll(".ep-day-tabs .filter-btn").forEach(function (b) {
        b.addEventListener("click", function () {
          mount.querySelectorAll(".ep-day-tabs .filter-btn").forEach(function (x) { x.classList.remove("active"); });
          b.classList.add("active"); document.getElementById("epDay").innerHTML = render(Number(b.dataset.day));
        });
      });
    },

    announcements: async function (_p, main) {
      var r = await sb.from("portal_announcements").select("*").eq("is_published", true).order("created_at", { ascending: false });
      var body;
      if (r.error) body = '<article class="white-card"><p class="card-copy">Couldn\'t load announcements. Please try again shortly.</p></article>';
      else if (!r.data || !r.data.length) body = '<article class="white-card"><p class="card-copy">No announcements yet. Official updates will appear here.</p></article>';
      else body = r.data.map(function (x) {
        return '<article class="white-card" style="margin-bottom:16px"><span class="stage">' + new Date(x.created_at).toLocaleString() + "</span><h3 class=\"card-title\">" + esc(x.title) + '</h3><p class="card-copy">' + esc(x.body) + "</p></article>";
      }).join("");
      main.innerHTML = '<section class="page-hero"><div class="container"><div class="breadcrumb"><span>Official updates</span></div><h1>Announcements.</h1><p>The official source of Élan event updates.</p></div></section>' +
        '<section class="section light-section"><div class="container">' + body + "</div></section>";
    },

    profile: async function (p, main) {
      main.innerHTML = '<section class="page-hero"><div class="container"><div class="breadcrumb"><span>Your account</span></div><h1>Profile.</h1><p>Your official Élan identity and personal details.</p></div></section>' +
        '<section class="section light-section"><div class="container"><div class="ep-grid2">' +
          '<article class="white-card">' +
            '<span class="section-label">Official identity</span>' +
            '<div class="ep-pass mini" style="margin-top:14px"><div class="ep-uid-label">Participant UID</div><div class="ep-uid">' + esc(p.participant_uid) + '</div><div class="ep-uid-sub">' + esc(p.full_name) + '</div></div>' +
            '<div class="ep-details">' +
              drow("Email", esc(p.email)) +
              drow("Ticket", esc(p.ticket_type || "—")) +
              drow("Payment", '<span class="tag ep-good">' + esc(p.payment_status) + '</span>') +
              drow("Check-in", '<span class="tag ' + (p.check_in_status === "checked_in" ? "ep-good" : "ep-warn") + '">' + (p.check_in_status === "checked_in" ? "Checked in" : "Not checked in") + '</span>') +
            '</div>' +
            '<p class="ep-lock"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> Locked to your official registration.</p>' +
          '</article>' +
          '<article class="white-card">' +
            '<span class="section-label">Editable details</span>' +
            '<div style="margin-top:14px">' +
              fldIn("pf_phone", "Phone", esc(p.phone || "")) + fldIn("pf_school", "School", esc(p.school || "")) +
              fldIn("pf_emg", "Emergency contact", esc(p.emergency_contact || "")) + fldIn("pf_diet", "Dietary preference", esc(p.dietary_preference || "")) +
              '<button class="btn btn-gold" id="pf_save" style="margin-top:6px">Save changes</button><div id="pf_msg"></div>' +
            '</div>' +
            '<div class="ep-pw-block"><span class="section-label">Password</span>' +
              '<p class="card-copy" style="margin:8px 0 14px">We\'ll email you a secure link to set a new password.</p>' +
              '<button class="btn btn-dark" id="pf_pw">Send me a password reset link</button>' +
            '</div>' +
          '</article></div></div></section>';
      document.getElementById("pf_save").addEventListener("click", async function () {
        var btn = document.getElementById("pf_save"); btn.disabled = true;
        var u = await sb.from("participants").update({
          phone: v("pf_phone"), school: v("pf_school"), emergency_contact: v("pf_emg"), dietary_preference: v("pf_diet"),
        }).eq("id", p.id);
        document.getElementById("pf_msg").innerHTML = u.error ? '<div class="ep-msg err">Couldn\'t save: ' + esc(u.error.message) + "</div>" : '<div class="ep-msg ok">Saved.</div>';
        btn.disabled = false;
      });
      document.getElementById("pf_pw").addEventListener("click", async function () {
        var e = await sb.auth.resetPasswordForEmail(p.email, { redirectTo: location.origin + location.pathname.replace(/profile\.html$/, "set-password.html") });
        document.getElementById("pf_msg").innerHTML = e.error ? '<div class="ep-msg err">' + esc(e.error.message) + "</div>" : '<div class="ep-msg ok">Password reset link sent to ' + esc(p.email) + ".</div>";
      });
    },
  };
  function fld(label, val, ro, cls) { return '<div class="field"><label>' + label + '</label><input class="' + (cls || "") + '" value="' + val + '"' + (ro ? " readonly" : "") + "></div>"; }
  function fldIn(id, label, val) { return '<div class="field"><label>' + label + '</label><input id="' + id + '" value="' + val + '"></div>'; }
  function drow(k, v) { return '<div class="ep-detail"><span class="k">' + k + '</span><span class="val">' + v + '</span></div>'; }
  function v(id) { return document.getElementById(id).value; }

  function startCountdown() {
    var target = new Date("2026-09-05T09:00:00+05:30").getTime();
    var ids = ["days", "hours", "minutes", "seconds"];
    function tick() {
      if (!document.getElementById("days")) return;   // left the page
      var d = Math.max(0, target - Date.now());
      var vals = [Math.floor(d / 864e5), Math.floor(d % 864e5 / 36e5), Math.floor(d % 36e5 / 6e4), Math.floor(d % 6e4 / 1e3)];
      ids.forEach(function (id, i) { var el = document.getElementById(id); if (el) el.textContent = String(vals[i]).padStart(2, "0"); });
    }
    tick(); setInterval(tick, 1000);
  }

  async function boot() {
    var main = document.getElementById("ep-main");
    var page = document.body.dataset.page;
    var p = await guard(main);
    if (!p) return;                       // blocking state rendered
    window.__elanParticipant = p;
    // Personalized nav: each participant sees only their flagship.
    if (p.flagship === "Crisis Command" || p.flagship === "Cent$ible") {
      var hideHref = p.flagship === "Crisis Command" ? "centsible.html" : "flagship.html";
      document.querySelectorAll('.nav-link[href="' + hideHref + '"]').forEach(function (el) { el.remove(); });
    }
    if (pages[page]) await pages[page](p, main);   // data pages
    else main.querySelectorAll("[data-uid]").forEach(function (el) { el.textContent = p.participant_uid; }); // static pages
    document.dispatchEvent(new CustomEvent("elan:participant", { detail: p }));
    document.body.insertAdjacentHTML("beforeend", footHTML());
    var out = document.getElementById("epLogout");
    if (out) out.addEventListener("click", function (e) { e.preventDefault(); window.elanAuth.signOut(); });
  }
  if (document.readyState !== "loading") boot(); else document.addEventListener("DOMContentLoaded", boot);
})();
