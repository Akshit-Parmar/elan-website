/* ============================================================================
   Élan — Crisis Command portal enhancements
   Adds, for the signed-in participant: their cabinet and post, live submission
   status per round, a countdown to the next deadline, and a phase-by-phase
   guide to what they actually have to produce.
   ========================================================================== */
(function () {
  "use strict";

  // Deadlines in IST (+05:30)
  var ROUNDS = [
    { key: "day1", label: "Day 1 \u2014 Final Submission", due: "2026-09-05T16:20:00+05:30",
      dueText: "4:20 p.m., Saturday 5 September" },
    { key: "day2", label: "Day 2 \u2014 Final Response",   due: "2026-09-06T12:00:00+05:30",
      dueText: "12:00 p.m., Sunday 6 September" }
  ];

  var PHASES = [
    ["11:15 \u2013 12:15", "Phase 1 \u2014 The Situation Room",
     "You receive the national crisis briefing, your council dossier, available resources, key stakeholders and initial intelligence. Analyse the crisis, split responsibilities across the five posts, agree your immediate priorities and set your opening strategy."],
    ["12:15 \u2013 13:15", "Phase 2 \u2014 Escalation",
     "A major update lands and changes the picture. Revise your strategy under time pressure. Judges are watching adaptability, reasoning, coordination and ethics as much as the decision itself."],
    ["14:00 \u2013 15:15", "Phase 3 \u2014 National Response",
     "The largest phase of Day 1. Build your complete National Crisis Response Plan: resource allocation, public communication, diplomatic strategy, an official government statement and a contingency plan."],
    ["15:30 \u2013 16:20", "Day 1 Defence and Submission",
     "Submit your Day 1 report in the portal before the deadline, then present and defend it. Expect judges\u2019 questioning and press-style challenge. Late submissions carry a penalty."],
    ["16:20 \u2013 17:00", "Shortlisting",
     "Scores are consolidated and finalist councils are announced. Finalists receive Day 2 reporting time, format and rules. The final crisis update stays sealed until Day 2."],
    ["09:20 \u2013 12:00 (Day 2)", "The Final",
     "The final crisis development is revealed, with a short preparation window. Present your final strategic response, action plan, recovery plan, resource allocation, communication and diplomatic strategy, then face the judges\u2019 closing challenge. Submit your Day 2 response in the portal before 12:00 p.m."]
  ];

  function esc(x) { return String(x == null ? "" : x).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  document.addEventListener("elan:participant", async function (ev) {
    var p = ev.detail || {}, sb = window.__elanSb;
    var live = document.getElementById("ccLive"), phases = document.getElementById("ccPhases");
    if (!live) return;

    // Phase guide is useful to everyone, so render it regardless.
    if (phases) {
      phases.innerHTML = '<div class="cc-phases">' + PHASES.map(function (ph) {
        return '<div class="cc-phase"><span class="cc-phase-time">' + esc(ph[0]) + "</span>" +
               "<strong>" + esc(ph[1]) + "</strong><p>" + esc(ph[2]) + "</p></div>";
      }).join("") + "</div>";
    }

    if (p.flagship === "Cent$ible") { live.innerHTML = ""; return; }

    // ---- your cabinet ------------------------------------------------------
    var teamHtml = "";
    if (p.team_id && sb) {
      var t = await sb.from("cc_teams").select("*").eq("id", p.team_id).maybeSingle();
      var mates = await sb.from("participants").select("full_name,cc_role,participant_uid")
                          .eq("team_id", p.team_id).order("cc_role");
      var team = t.data || {};
      teamHtml = '<article class="white-card" style="margin-top:16px"><span class="section-label">Your cabinet</span>' +
        '<h3 class="card-title" style="margin:6px 0 2px">' + esc(team.name || "Your team") +
        (team.nation ? ' <span style="opacity:.6">\u00B7 ' + esc(team.nation) + "</span>" : "") + "</h3>" +
        '<div class="rp-mates">' + (mates.data || []).map(function (m) {
          var me = m.participant_uid === p.participant_uid;
          return '<span class="rp-mate' + (me ? " is-me" : "") + '"><strong>' + esc(m.cc_role || "\u2014") +
                 "</strong>" + esc(m.full_name) + (me ? " (you)" : "") + "</span>";
        }).join("") + "</div></article>";
    } else {
      teamHtml = '<article class="white-card" style="margin-top:16px"><span class="section-label">Your cabinet</span>' +
        '<h3 class="card-title" style="margin:6px 0 6px">Formed on the day</h3>' +
        '<p class="card-copy">Cabinets are mixed-school and are assigned on 5 September. Your post: <strong>' +
        esc(p.cc_role || "to be assigned") + "</strong>. Your teammates will appear here once the Organising Committee forms your council.</p></article>";
    }

    // ---- submission status per round --------------------------------------
    var subs = [];
    if (p.team_id && sb) {
      var r = await sb.from("cc_submissions").select("round,submitted_at").eq("team_id", p.team_id);
      subs = r.error ? [] : (r.data || []);
    }
    function done(k) { return subs.filter(function (x) { return x.round === k; })[0]; }

    var cards = ROUNDS.map(function (rd) {
      var d = done(rd.key);
      return '<article class="white-card cc-round' + (d ? " is-done" : "") + '">' +
        '<span class="section-label">' + esc(rd.label) + "</span>" +
        (d ? '<h3 class="card-title" style="margin:6px 0 4px">Submitted</h3>' +
             '<p class="card-copy">Submitted at ' + esc(String(d.submitted_at).slice(11, 16)) +
             " on " + esc(String(d.submitted_at).slice(0, 10)) + ". This round is locked.</p>"
           : '<h3 class="card-title" style="margin:6px 0 4px">Not submitted</h3>' +
             '<p class="card-copy">Due by <strong>' + esc(rd.dueText) + "</strong>.</p>" +
             '<p class="cc-count" data-due="' + rd.due + '"></p>') +
        '<div class="cta-row" style="margin-top:10px"><a class="btn btn-' + (d ? "ghost" : "gold") +
        '" href="report.html">' + (d ? "View your report" : "Open your team report") + "</a></div></article>";
    }).join("");

    live.innerHTML = teamHtml +
      '<div class="cc-rounds" style="margin-top:16px">' + cards + "</div>";

    tick(); setInterval(tick, 1000);
  });

  function tick() {
    document.querySelectorAll(".cc-count").forEach(function (el) {
      var ms = new Date(el.dataset.due) - new Date();
      if (ms <= 0) { el.textContent = "Deadline passed \u2014 speak to an organiser."; el.className = "cc-count is-over"; return; }
      var h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000);
      var d = Math.floor(h / 24);
      el.textContent = d > 0
        ? d + "d " + (h % 24) + "h remaining"
        : (h > 0 ? h + "h " : "") + m + "m " + s + "s remaining";
      el.className = "cc-count" + (ms < 30 * 60000 ? " is-urgent" : "");
    });
  }
})();
