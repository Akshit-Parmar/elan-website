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
    ["Crisis Command", "flagship.html"], ["Team Report", "report.html"], ["Cent$ible", "centsible.html"], ["Announcements", "announcements.html"],
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
            '<article class="white-card"><span class="section-label">Ticket</span><h3 class="card-title" style="font-size:26px">' + esc(p.ticket_type || "–") + '</h3><span class="tag ep-good">Access active</span></article>' +
            '<article class="white-card"><span class="section-label">Élan begins in</span><h3 class="ep-count ep-mono"><span id="days">00</span>d <span id="hours">00</span>h <span id="minutes">00</span>m <span id="seconds">00</span>s</h3><p class="card-copy">5–6 September 2026 · SGI Campus</p></article>' +
          "</div>" +
          (p.centsible_theme && p.centsible_theme.indexOf("BRAND") !== -1
            ? '<article class="white-card" id="dashDeck" style="margin-top:16px"><span class="section-label">Before the event</span>' +
              '<h3 class="card-title" style="font-size:22px;margin:6px 0 4px">Your product brief</h3>' +
              '<p class="card-copy" id="dashDeckMsg">Checking\u2026</p>' +
              '<div class="cta-row" style="margin-top:10px"><a class="btn btn-gold" href="centsible.html">Open your workspace</a></div></article>'
            : '') +
          (p.flagship ? ('<article class="white-card" style="margin-top:16px"><span class="section-label">Your flagship</span>' +
            (p.flagship === "Crisis Command"
              ? '<h3 class="card-title" style="font-size:26px">Crisis Command</h3>' +
                (p.cc_role ? '<p class="card-copy">Your cabinet post: <strong>' + esc(p.cc_role) + '</strong></p>'
                           : '<p class="card-copy">Your cabinet post will appear here once teams are formed.</p>') +
                '<div class="cta-row" style="margin-top:10px"><a class="btn btn-link" href="flagship.html">Crisis Command briefing →</a></div>'
              : '<h3 class="card-title" style="font-size:26px">Cent$ible' + (p.centsible_theme ? ': ' + esc(p.centsible_theme) : '') + '</h3>' +
                ((p.centsible_theme && p.centsible_theme.indexOf("NOTE") !== -1 && p.cents_balance != null) ? '<p class="card-copy">Cents balance: <strong>' + Number(p.cents_balance).toLocaleString("en-IN") + ' ¢</strong></p>' : '') +
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
              (p.flagship === "Cent$ible" ? '<li><a href="centsible.html">Cent$ible' + (p.centsible_theme ? ": " + esc(p.centsible_theme) : "") + '</a></li>'
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

    schedule: async function (p, main) {
      var flag = p.flagship || "", theme = p.centsible_theme || "";
      var isCC = flag === "Crisis Command", isCent = flag === "Cent$ible", unknown = !isCC && !isCent;
      var THEMES = ["BRAND \u092C\u0928\u093E\u0913", "VIRAL \u0935\u094D\u092F\u093E\u092A\u093E\u0930", "NOTE \u0928\u0940\u0924\u093F", "\u092A\u094D\u0930\u0936\u094D\u0928 PRODIGY"];

      // Official Élan itinerary — [day, time, track(all|cc|cent), title, detail, location]
      var OFFICIAL = [
        [1,"08:00","all","Arrival, Registration and Breakfast","Attendance and school verification, pass and event-kit collection, flagship role or theme verification, then breakfast. Be seated by 8:50 a.m.","Registration Counters"],
        [1,"08:45","all","Auditorium Doors Close","Dignitaries are received and participants settle for the opening.","Auditorium"],
        [1,"09:00","all","Grand Opening Ceremony","Ceremonial lamp-lighting, welcome performance, addresses by the Élan Director, school leadership and the Chief Guest, the Élan film, and the introduction of both flagships. Ends strictly at 11:00 a.m.","Auditorium"],
        [1,"11:00","all","Movement to Your Flagship Venue","Fifteen minutes to move to your competition venue.","Flagship Venues"],
        [1,"11:15","cc","Preliminary Phase 1: The Situation Room","You receive the national crisis briefing, your governing-council dossier, available resources, key stakeholders, confidential role information and initial intelligence. Analyse the crisis, assign responsibilities, set immediate priorities and build your initial response strategy. Ends with a short situation-room briefing or submission.","Crisis Command Venue"],
        [1,"11:15","cent:BRAND","Round 1: The Founder Pitch","Five minutes to present your venture: brand name, logo, target audience, business model, marketing approach and future vision. Your nine-field product brief, submitted before the event, is the foundation the judges read from.","Your theme room"],
        [1,"11:15","cent:VIRAL","Round 1: The Comeback Pitch","You are handed a real brand that failed. Thirty minutes to prepare, five minutes to pitch its revival. A deck or a product picture is required.","Your theme room"],
        [1,"11:15","cent:NOTE","Round 1: The Money Market Mayhem","Two hours on the live trading floor in your portal, starting with 10,00,000 Cents. The host announces a new market status every five minutes. Buy and sell through the portal; every trade is logged.","Your theme room"],
        [1,"11:15","cent:PRODIGY","Round 1: Rapid Vision Rush","One minute per team of rapid business questions. Correct answers earn 100 Cents each. There is no negative marking, skipping is allowed, and nobody is eliminated in this round.","Your theme room"],
        [1,"12:15","cc","Preliminary Phase 2: Escalation","A major crisis update lands: international pressure, economic instability, public unrest, infrastructure failure, media leaks or new evidence. Modify your strategy and make time-sensitive decisions. Judged on adaptability, strategic reasoning, leadership, coordination, ethics and resource management.","Crisis Command Venue"],
        [1,"12:15","cent:PRODIGY","Round 2: The Bidding War","Bid Cents on each question, with a base bid of 100. A correct answer adds your full bid and a wrong answer costs you half of it.","Your theme room"],
        [1,"13:15","all","Lunch Break","Competition rooms are secured. No formal competition work during lunch unless your rules specifically allow it.","Dining Area"],
        [1,"14:00","cc","Preliminary Phase 3: National Response","The final major Day 1 development. Prepare your complete National Crisis Response Plan, resource-allocation strategy, public communication plan, diplomatic strategy, official government statement and contingency plan. This is the most substantial Day 1 phase.","Crisis Command Venue"],
        [1,"14:00","cent:BRAND","Round 2: Brand Under Pressure","A sealed crisis envelope written for your specific brand. Twenty minutes to prepare, three minutes to respond. Must finish by 3:15 p.m.","Your theme room"],
        [1,"14:00","cent:VIRAL","Round 2: Unexpected Collab","Draw one brand and one product category from the two fish bowls. Thirty minutes to prepare, five minutes to pitch the collaboration. Must finish by 3:15 p.m.","Your theme room"],
        [1,"14:00","cent:NOTE","Round 2: The Coin Economy","The physical round. Thirty coins per team, worth 17,50,000 in total, across five zones: Dice of Fortune, Spin Wheel, Stock Market Dart, Investment Plinko and Bull vs Bear Arena. Two plays maximum per zone, ninety minutes of active play. Your Round 1 capital plus your final coin value gives your total.","Your theme room"],
        [1,"14:00","cent:PRODIGY","Round 3: Final Preliminary Round","Your last scored preliminary block before shortlisting. Must finish by 3:15 p.m.","Your theme room"],
        [1,"15:15","all","Refreshment and Transition Break","A short break before the final Day 1 evaluation block.","Flagship Venues"],
        [1,"15:30","cc","Day 1 Defence and Submission","Submit your final Day 1 response. This block may include a written submission, council presentation, press statement, media questioning and judges\u2019 questioning. The deadline is strict. Late submissions carry a predetermined penalty.","Crisis Command Venue"],
        [1,"15:30","cent","Final Submission and Questioning","Complete your final submission and face judges\u2019 questions, a short defence, rapid presentation, clarification round or theme-specific challenge.","Your theme room"],
        [1,"16:20","cc","Shortlisting and Finalist Briefing","Judges consolidate scores and announce the finalist councils. Finalists receive Day 2 reporting time, final-round format, presentation duration, device and research rules, dress expectations and holding-room instructions. The final crisis update is not revealed until Day 2.","Crisis Command Venue"],
        [1,"16:20","cent","Final Boardroom Shortlisting","Scores go to the Central Evaluation Room for moderation and the Final Boardroom teams are confirmed. Finalists receive reporting time, presentation rules, holding-room instructions, dress expectations, allowed materials and time limits.","Your theme room"],
        [1,"17:00","all","Open Stage","Music, poetry, storytelling, comedy, spoken word, short dance and participant showcases. Register your name in advance; each act has a fixed time limit and all tracks must be submitted beforehand. Ends strictly at 6:00 p.m.","Main Stage"],
        [1,"18:00","all","Changing and Preparation Break","Change into cultural or formal clothing, refresh and prepare for Cultural Night. Start returning to the venue by 6:45 p.m.","Changing Areas"],
        [1,"19:00","all","Cultural Night","Three cultural performance blocks, an interactive audience activity, and a DJ and social celebration. Day 1 closes at 9:00 p.m.","Main Stage"],
        [1,"21:00","all","Organised Departure","Staged departure by school and transport group. No participant leaves without being checked out by the departure team.","Departure Point"],
        [2,"08:15","all","Arrival, Breakfast and Check-in","Complete attendance and have breakfast. Finalists report directly to their designated holding rooms and must not interact with judges before the round begins.","Registration Counters"],
        [2,"08:50","all","Seating and Final Instructions","Participants settle and receive instructions for the finals, carnival and closing ceremony.","Auditorium"],
        [2,"09:00","all","Finalist Reporting and Venue Preparation","Finalists take position and audiences move to the finals venues.","Finals Venues"],
        [2,"09:20","cc","Crisis Command Final","The final crisis development is revealed at 9:20, followed by a short preparation period. Each council presents its final strategic response, immediate action plan, long-term recovery plan, resource allocation, public communication strategy, diplomatic response, ethical justification and contingency plan, with roughly 12 minutes presenting and 6 minutes of questioning, closing with a final judges\u2019 challenge. Ends at 12:00 p.m.","Crisis Command Finals Venue"],
        [2,"09:20","cent","Final Boardroom","The strongest shortlisted teams enter the Boardroom, which is more formal and demanding than the preliminary rounds. Present your final recommendation, explain your financial reasoning, defend your assumptions, respond to board questioning, address risks and justify trade-offs, with roughly 15 minutes presenting and 7 minutes of questioning. Ends at 12:00 p.m.","Final Boardroom"],
        [2,"12:00","all","Judges\u2019 Deliberation","Winners, runners-up, theme recognitions and individual awards are finalised. Results remain confidential until the Closing Ceremony.","Central Evaluation Room"],
        [2,"12:30","all","Lunch","Lunch for participants, judges, dignitaries and the organising committee.","Dining Area"],
        [2,"13:30","all","Élan Carnival","Food and student-run stalls, carnival games, skill challenges, photo booths, sponsor stalls, interactive installations, music and merchandise. Stalls close at 3:30 p.m.","Carnival Grounds"],
        [2,"15:30","all","Carnival Closure and Assembly","Move to the auditorium and take your school\u2019s seating block. The Closing Ceremony begins at 4:00 p.m. sharp.","Auditorium"],
        [2,"16:00","all","Grand Closing and Awards Ceremony","Highlights film, dignitary addresses, individual certificates for every participant, felicitations, special recognitions, flagship awards, winning-team speeches, the Director\u2019s closing address and the national anthem.","Auditorium"],
        [2,"20:00","all","Official Photographs and Departure","Winning teams, schools, judges and the organising committee take official photographs before organised dispersal.","Auditorium"]
      ];

      // Cent$ible rounds differ per theme, so tracks may be "cent:BRAND" etc.
      // A participant whose theme is not yet set sees all four, each self-labelled.
      var THEME_KEY = theme.indexOf("BRAND") !== -1 ? "BRAND"
                    : theme.indexOf("VIRAL") !== -1 ? "VIRAL"
                    : theme.indexOf("NOTE") !== -1 ? "NOTE"
                    : theme.indexOf("PRODIGY") !== -1 ? "PRODIGY" : "";
      function mine(tr){
        if (tr === "all" || unknown) return true;
        if (tr === "cc") return isCC;
        if (tr === "cent") return isCent;
        if (tr.indexOf("cent:") === 0) return isCent && (!THEME_KEY || tr.slice(5) === THEME_KEY);
        return false;
      }
      function dbMine(cat){
        if (!cat) return true;
        var c = String(cat);
        for (var i = 0; i < THEMES.length; i++) { if (c.indexOf(THEMES[i]) !== -1) return !!theme && c.indexOf(theme) !== -1; }
        if (c.indexOf("Crisis Command") !== -1) return isCC || unknown;
        if (c.indexOf("Cent$ible") !== -1) return isCent || unknown;
        return true;
      }

      var r = await sb.from("portal_schedule_items").select("*").eq("is_published", true).order("day").order("start_time");
      var db = (r.error ? [] : (r.data || [])).filter(function (i) { return dbMine(i.category); });

      var label = isCC ? "Crisis Command" : isCent ? ("Cent$ible" + (theme ? ": " + theme : "")) : "";
      main.innerHTML = '<section class="page-hero"><div class="container"><div class="breadcrumb"><span>Participants only</span></div>' +
        "<h1>Your schedule.</h1>" +
        "<p>" + (label
          ? "The official two-day flow, showing only what applies to you as a <strong>" + esc(label) + "</strong> participant, plus everything shared by all participants."
          : "The official two-day flow. Your flagship is being confirmed, so both flagship tracks are shown for now.") + "</p></div></section>" +
        '<section class="section light-section"><div class="container" id="epSched"></div></section>';
      var mount = document.getElementById("epSched");

      function rows(day) {
        var list = OFFICIAL.filter(function (i) { return i[0] === day && mine(i[2]); }).map(function (i) {
          var title = i[3], loc = i[5], tag = "Shared";
          if (i[2] === "cc") { title = "Crisis Command · " + title; tag = "Crisis Command"; }
          if (i[2] === "cent" || i[2].indexOf("cent:") === 0) {
            var tname = theme || ({BRAND:"BRAND \u092C\u0928\u093E\u0913", VIRAL:"VIRAL \u0935\u094D\u092F\u093E\u092A\u093E\u0930", NOTE:"NOTE \u0928\u0940\u0924\u093F", PRODIGY:"\u092A\u094D\u0930\u0936\u094D\u0928 PRODIGY"}[i[2].slice(5)] || "");
            title = "Cent$ible \u00b7 " + title + (tname ? ": " + tname : "");
            tag = "Cent$ible";
            loc = tname ? "Your theme room: " + tname : "Cent$ible theme rooms";
          }
          return { t: i[1], title: title, d: i[4], loc: loc, tag: tag };
        });
        return list.map(function (x) {
          return '<article class="schedule-card"><div class="schedule-time">' + esc(x.t) + "</div><div>" +
            '<span class="tag">' + esc(x.tag) + "</span><h3>" + esc(x.title) + "</h3>" +
            (x.d ? "<p>" + esc(x.d) + "</p>" : "") + "</div>" +
            (x.loc ? '<span class="stage">' + esc(x.loc) + "</span>" : "<span></span>") + "</article>";
        }).join("");
      }

      // Admin-posted notices live in their own block so they can never distort
      // the official timeline above.
      function updates(day) {
        var u = db.filter(function (i) { return Number(i.day) === day; });
        if (!u.length) return "";
        return '<h2 class="card-title" style="margin:28px 0 10px">Updates from the organising team</h2>' +
          u.map(function (i) {
            return '<article class="schedule-card"><div class="schedule-time">' + esc((i.start_time || "").slice(0, 5)) + "</div><div>" +
              '<span class="tag">' + esc(i.category || "Update") + "</span><h3>" + esc(i.title || "") + "</h3>" +
              (i.description ? "<p>" + esc(i.description) + "</p>" : "") + "</div>" +
              (i.location ? '<span class="stage">' + esc(i.location) + "</span>" : "<span></span>") + "</article>";
          }).join("");
      }

      mount.innerHTML = '<div class="ep-day-tabs">' +
        '<button class="filter-btn active" data-day="1">Day 1 · 5 Sep</button>' +
        '<button class="filter-btn" data-day="2">Day 2 · 6 Sep</button></div>' +
        '<div class="schedule-list" id="epDay">' + rows(1) + updates(1) + "</div>";
      mount.querySelectorAll(".ep-day-tabs .filter-btn").forEach(function (b) {
        b.addEventListener("click", function () {
          mount.querySelectorAll(".ep-day-tabs .filter-btn").forEach(function (x) { x.classList.remove("active"); });
          b.classList.add("active");
          var d = Number(b.dataset.day);
          document.getElementById("epDay").innerHTML = rows(d) + updates(d);
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
              drow("Ticket", esc(p.ticket_type || "–")) +
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

    // ---- Admin preview mode -------------------------------------------------
    // ?preview=cc | t1..t4  (optionally &role=Finance%20Minister)
    // Only works for admin accounts, and only changes what is DISPLAYED — no
    // participant record is modified and no other participant's data is read.
    var THEME_LIST = ["BRAND \u092C\u0928\u093E\u0913", "VIRAL \u0935\u094D\u092F\u093E\u092A\u093E\u0930", "NOTE \u0928\u0940\u0924\u093F", "\u092A\u094D\u0930\u0936\u094D\u0928 PRODIGY"];
    var qp = new URLSearchParams(location.search);
    var pv = qp.get("preview");
    var pvRole = qp.get("role");
    // Sticky preview: once set, it survives navigation anywhere in the portal
    // until "exit preview" clears it. Far more reliable than intercepting clicks.
    try {
      if (qp.get("exitpreview") === "1") { sessionStorage.removeItem("elanPreview"); sessionStorage.removeItem("elanPreviewRole"); pv = null; }
      else if (pv) { sessionStorage.setItem("elanPreview", pv); if (pvRole) sessionStorage.setItem("elanPreviewRole", pvRole); }
      else { pv = sessionStorage.getItem("elanPreview"); pvRole = sessionStorage.getItem("elanPreviewRole"); }
    } catch (e) {}

    if (pv && p.is_admin !== true) {
      try { sessionStorage.removeItem("elanPreview"); } catch (e) {}
      document.body.insertAdjacentHTML("afterbegin",
        '<div style="position:sticky;top:0;z-index:999;background:#7f1d1d;color:#fff;padding:8px 16px;' +
        'font-size:13px;font-weight:800;text-align:center">PREVIEW UNAVAILABLE \u2014 this account is not flagged as an Élan admin ' +
        '(set is_admin = true on your participant record). Showing your own portal instead.</div>');
      pv = null;
    }

    if (pv) {
      p = Object.assign({}, p);                      // never mutate the real record
      var who = "";
      if (pv === "cc") {
        p.flagship = "Crisis Command";
        p.cc_role = pvRole || p.cc_role || "Head of State";
        p.centsible_theme = null; p.cents_balance = null;
        who = "Crisis Command \u2014 " + p.cc_role;
      } else {
        var idx = parseInt(String(pv).replace(/^t/, ""), 10) - 1;
        if (idx >= 0 && idx < THEME_LIST.length) {
          p.flagship = "Cent$ible"; p.centsible_theme = THEME_LIST[idx];
          p.cc_role = null;
          if (p.cents_balance == null) p.cents_balance = 1000000;
          who = "Cent$ible \u2014 " + p.centsible_theme;
        }
      }
      if (who) {
        document.body.insertAdjacentHTML("afterbegin",
          '<div style="position:sticky;top:0;z-index:999;background:#4E0000;color:#E9D4C3;' +
          'padding:8px 16px;font-size:13px;font-weight:800;letter-spacing:.06em;text-align:center">' +
          "ADMIN PREVIEW \u00B7 viewing as: " + esc(who) +
          ' \u00B7 <a href="?exitpreview=1" style="color:#fff;text-decoration:underline">exit preview</a></div>');
      }
    }

    window.__elanSb = sb;
    window.__elanParticipant = p;
    // Personalized nav: each participant sees only their flagship.
    if (p.flagship === "Crisis Command" || p.flagship === "Cent$ible") {
      var hideHref = p.flagship === "Crisis Command" ? "centsible.html" : "flagship.html";
      document.querySelectorAll('.nav-link[href="' + hideHref + '"]').forEach(function (el) { el.remove(); });
      if (p.flagship !== "Crisis Command") {
        document.querySelectorAll('.nav-link[href="report.html"]').forEach(function (el) { el.remove(); });
      }
    }
    if (pages[page]) await pages[page](p, main);   // data pages
    else main.querySelectorAll("[data-uid]").forEach(function (el) { el.textContent = p.participant_uid; }); // static pages
    document.dispatchEvent(new CustomEvent("elan:participant", { detail: p }));

    // BRAND बनाओ: show pitch-deck status on the dashboard
    (async function () {
      var box = document.getElementById("dashDeckMsg");
      if (!box) return;
      if (!p.team_id) { box.textContent = "Your team is being confirmed. Once you and your partner are linked, you can fill in your product brief here."; return; }
      var f = await sb.from("cc_sections").select("role,body").eq("team_id", p.team_id).eq("round", "brief");
      var filled = (f.error ? [] : (f.data || [])).filter(function (x) { return (x.body || "").trim(); }).length;
      var card = document.getElementById("dashDeck");
      if (filled >= 9) {
        box.innerHTML = "<strong>Complete.</strong> All nine answers are in. You can still edit them before 3 September.";
      } else {
        if (card) card.style.borderLeft = "4px solid var(--red, #4E0000)";
        box.innerHTML = "<strong>" + filled + " of 9 answered.</strong> BRAND \u092C\u0928\u093E\u0913 teams submit a short product brief by <strong>3 September</strong>. It is used to build the crisis you face in Round 2.";
      }
    })();
    document.body.insertAdjacentHTML("beforeend", footHTML());
    var out = document.getElementById("epLogout");
    if (out) out.addEventListener("click", function (e) { e.preventDefault(); window.elanAuth.signOut(); });
  }
  if (document.readyState !== "loading") boot(); else document.addEventListener("DOMContentLoaded", boot);
})();
