/* ============================================================================
   Élan — Crisis Command Team Report
   Live collaborative report. Each cabinet post owns one section; everyone sees
   every section update live. One member submits for the whole team, which locks
   that round. Autosaves continuously, with a local backup if the network drops.
   ========================================================================== */
(function () {
  "use strict";

  var ROLES = ["Head of State", "Finance Minister", "Foreign Affairs Minister", "Policy Advisor", "Media & PR Head"];
  var ROUNDS = [
    { key: "day1", label: "Day 1: Final Submission", when: "Submit by 4:20 p.m. on 5 September" },
    { key: "day2", label: "Day 2: Final Response",   when: "Submit during the Final, before 12:00 p.m. on 6 September" }
  ];
  var HINT = {
    "Head of State":            "Your nation's overall position, the decisions taken, and why. Own the trade-offs.",
    "Finance Minister":         "Budget and resource allocation. What each decision costs and how it is funded.",
    "Foreign Affairs Minister": "Diplomatic response, alliances, negotiations, and international consequences.",
    "Policy Advisor":           "The written brief: options considered, reasoning, second-order effects, contingencies.",
    "Media & PR Head":          "Public communication: official statements, press lines, and managing public trust."
  };

  var sb = null, P = null, round = "day1", channel = null;
  var saveTimers = {}, lastSaved = {};

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function el(id) { return document.getElementById(id); }
  function lsKey(r, role) { return "elanReport:" + (P && P.team_id) + ":" + r + ":" + role; }

  document.addEventListener("elan:participant", function (ev) {
    P = ev.detail || {};
    sb = window.__elanSb;
    var main = el("ep-main");
    if (!main) return;

    if (P.flagship !== "Crisis Command") {
      main.innerHTML = shell("Team Report",
        '<article class="white-card"><h3 class="card-title">This page is for Crisis Command</h3>' +
        '<p class="card-copy">The team report is part of Crisis Command. Your flagship is ' +
        esc(P.flagship || "being confirmed") + '.</p></article>');
      return;
    }
    if (!P.team_id) {
      main.innerHTML = shell("Team Report",
        '<article class="white-card"><h3 class="card-title">Your cabinet has not been formed yet</h3>' +
        '<p class="card-copy">Teams are formed on the day of the event. Once the Organising Committee assigns your cabinet, ' +
        'this page becomes your shared report. Each post writes its own section, and everyone sees the others update live.</p>' +
        '<p class="card-copy">Your post: <strong>' + esc(P.cc_role || "to be assigned") + '</strong></p></article>');
      return;
    }
    boot(main);
  });

  function shell(title, inner) {
    return '<section class="page-hero"><div class="container">' +
      '<div class="breadcrumb"><span>Participants only</span></div><h1>' + title + '.</h1>' +
      '<p>Your cabinet\u2019s shared working document for Crisis Command.</p></div></section>' +
      '<section class="section light-section"><div class="container">' + inner + '</div></section>';
  }

  async function boot(main) {
    main.innerHTML = shell("Team Report",
      '<div id="rpTeam"></div>' +
      '<div class="ep-day-tabs" id="rpTabs" style="margin:18px 0 14px"></div>' +
      '<div id="rpStatus" class="note" style="margin-bottom:10px"></div>' +
      '<div id="rpBody"></div>');

    el("rpTabs").innerHTML = ROUNDS.map(function (r, i) {
      return '<button class="filter-btn' + (i === 0 ? " active" : "") + '" data-round="' + r.key + '">' + r.label + "</button>";
    }).join("");
    el("rpTabs").querySelectorAll("[data-round]").forEach(function (b) {
      b.addEventListener("click", function () {
        el("rpTabs").querySelectorAll("[data-round]").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active"); round = b.dataset.round; render();
      });
    });

    // team header
    var t = await sb.from("cc_teams").select("*").eq("id", P.team_id).maybeSingle();
    var mates = await sb.from("participants").select("participant_uid,full_name,cc_role")
                        .eq("team_id", P.team_id).order("cc_role");
    var team = t.data || {};
    el("rpTeam").innerHTML =
      '<article class="white-card"><span class="section-label">Your cabinet</span>' +
      '<h2 class="card-title" style="font-size:26px;margin:6px 0 4px">' + esc(team.name || "Your team") +
      (team.nation ? ' \u00B7 <span style="opacity:.7">' + esc(team.nation) + "</span>" : "") + "</h2>" +
      '<div class="rp-mates">' + ((mates.data || []).map(function (m) {
        var me = m.participant_uid === P.participant_uid;
        return '<span class="rp-mate' + (me ? " is-me" : "") + '"><strong>' + esc(m.cc_role || "–") +
               "</strong>" + esc(m.full_name) + (me ? " (you)" : "") + "</span>";
      }).join("") || '<span class="note">No teammates listed yet.</span>') + "</div></article>";

    render();
    subscribe();
  }

  async function render() {
    var body = el("rpBody");
    body.innerHTML = '<p class="note">Loading\u2026</p>';

    var rd = ROUNDS.filter(function (r) { return r.key === round; })[0];
    var sub = await sb.from("cc_submissions").select("*").eq("team_id", P.team_id).eq("round", round).maybeSingle();
    var locked = !!(sub.data && sub.data.submitted_at);
    var secs = await sb.from("cc_sections").select("*").eq("team_id", P.team_id).eq("round", round);
    var byRole = {};
    (secs.data || []).forEach(function (s) { byRole[s.role] = s; });

    var files = await sb.from("cc_files").select("*").eq("team_id", P.team_id).eq("round", round).order("uploaded_at");

    var html = '<article class="white-card" style="margin-bottom:16px">' +
      '<span class="section-label">' + esc(rd.label) + "</span>" +
      (locked
        ? '<p class="card-copy"><strong>Submitted.</strong> This round was submitted on ' +
          esc(String(sub.data.submitted_at).slice(0, 16).replace("T", " ")) +
          " and can no longer be edited. Speak to an organiser if something is wrong.</p>"
        : '<p class="card-copy">' + esc(rd.when) + ". Everything saves automatically as you type. " +
          "Each post writes its own section. You can read everyone else\u2019s live, but only edit your own.</p>") +
      "</article>";

    html += ROLES.map(function (role) {
      var mine = role === P.cc_role;
      var s = byRole[role] || {};
      var val = s.body || "";
      return '<article class="white-card rp-sec' + (mine ? " is-mine" : "") + '">' +
        '<div class="rp-sec-head"><div><span class="section-label">' + esc(role) + (mine ? " \u00B7 your section" : "") + "</span>" +
        '<p class="note" style="margin:4px 0 0">' + esc(HINT[role] || "") + "</p></div>" +
        '<span class="rp-save" id="sv-' + slug(role) + '">' + (s.updated_at ? "saved" : "") + "</span></div>" +
        (mine && !locked
          ? '<textarea class="rp-input" id="ta-' + slug(role) + '" data-role="' + esc(role) +
            '" placeholder="Write your section here\u2026">' + esc(val) + "</textarea>"
          : '<div class="rp-read" id="rd-' + slug(role) + '">' + (val ? esc(val) : '<span class="note">Nothing written yet.</span>') + "</div>") +
        "</article>";
    }).join("");

    // files
    html += '<article class="white-card" style="margin-top:16px"><span class="section-label">Attachments</span>' +
      '<p class="note" style="margin:4px 0 12px">Optional. Slides, spreadsheets or documents that support your report.</p>' +
      '<div id="rpFiles">' + ((files.data || []).map(function (f) {
        return '<div class="rp-file"><span>' + esc(f.file_name) + "</span>" +
               '<button class="mini-btn" data-dl="' + esc(f.file_path) + '">Download</button></div>';
      }).join("") || '<p class="note">No files uploaded.</p>') + "</div>" +
      (locked ? "" : '<div style="margin-top:12px"><input type="file" id="rpUpload"/> <span class="note" id="rpUpMsg"></span></div>') +
      "</article>";

    if (!locked) {
      html += '<article class="white-card" style="margin-top:16px;text-align:center">' +
        '<h3 class="card-title">Submit this round</h3>' +
        '<p class="card-copy">Any member can submit for the whole cabinet. <strong>Once submitted, the round locks and nobody can edit it.</strong> ' +
        'Make sure every post has finished.</p>' +
        '<div class="cta-row" style="justify-content:center;margin-top:12px">' +
        '<button class="btn btn-gold" id="rpSubmit">Submit ' + esc(rd.label) + "</button></div>" +
        '<p class="note" id="rpSubMsg" style="margin-top:10px"></p></article>';
    }

    body.innerHTML = html;
    wire(locked);
  }

  function slug(r) { return r.toLowerCase().replace(/[^a-z]+/g, "-"); }

  function wire(locked) {
    if (!locked) {
      var ta = document.querySelector(".rp-input");
      if (ta) {
        // restore an unsaved local backup if it is newer than what loaded
        var backup = null;
        try { backup = localStorage.getItem(lsKey(round, ta.dataset.role)); } catch (e) {}
        if (backup && backup !== ta.value && backup.length > ta.value.length) {
          if (confirm("An unsaved local copy of your section was found (possibly from a dropped connection). Restore it?")) ta.value = backup;
        }
        ta.addEventListener("input", function () {
          try { localStorage.setItem(lsKey(round, ta.dataset.role), ta.value); } catch (e) {}
          mark(ta.dataset.role, "saving\u2026");
          clearTimeout(saveTimers[round]);
          saveTimers[round] = setTimeout(function () { save(ta.dataset.role, ta.value); }, 900);
        });
        window.addEventListener("beforeunload", function (e) {
          if (lastSaved[round] !== ta.value) { e.preventDefault(); e.returnValue = ""; }
        });
      }
      var up = el("rpUpload");
      if (up) up.addEventListener("change", upload);
      var sbtn = el("rpSubmit");
      if (sbtn) sbtn.addEventListener("click", submitRound);
    }
    document.querySelectorAll("[data-dl]").forEach(function (b) {
      b.addEventListener("click", async function () {
        var r = await sb.storage.from("cc-uploads").createSignedUrl(b.dataset.dl, 120);
        if (r.data && r.data.signedUrl) window.open(r.data.signedUrl, "_blank");
        else alert("Could not open that file.");
      });
    });
  }

  function mark(role, txt) { var s = el("sv-" + slug(role)); if (s) s.textContent = txt; }

  async function save(role, body) {
    var row = { team_id: P.team_id, round: round, role: role, body: body,
                updated_at: new Date().toISOString(), updated_by: P.auth_user_id || null };
    var r = await sb.from("cc_sections").upsert(row, { onConflict: "team_id,round,role" });
    if (r.error) { mark(role, "not saved, retrying"); setTimeout(function () { save(role, body); }, 4000); return; }
    lastSaved[round] = body;
    try { localStorage.removeItem(lsKey(round, role)); } catch (e) {}
    mark(role, "saved " + new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
  }

  async function upload(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var msg = el("rpUpMsg");
    if (f.size > 10 * 1024 * 1024) { msg.textContent = "That file is " + (f.size/1048576).toFixed(1) + " MB. The limit is 10 MB."; return; }
    msg.textContent = "Uploading\u2026";
    var path = P.team_id + "/" + round + "/" + Date.now() + "-" + f.name.replace(/[^\w.\-]+/g, "_");
    var up = await sb.storage.from("cc-uploads").upload(path, f);
    if (up.error) { msg.textContent = "Upload failed: " + up.error.message; return; }
    var ins = await sb.from("cc_files").insert({ team_id: P.team_id, round: round, file_path: path,
      file_name: f.name, uploaded_by: P.auth_user_id || null });
    msg.textContent = ins.error ? "Uploaded, but not recorded: " + ins.error.message : "Uploaded \u2713";
    render();
  }

  async function submitRound() {
    var rd = ROUNDS.filter(function (r) { return r.key === round; })[0];
    if (!confirm("Submit " + rd.label + " for the whole cabinet?\n\nThis locks the round. Nobody will be able to edit it afterwards.")) return;
    var msg = el("rpSubMsg"); msg.textContent = "Submitting\u2026";
    var ta = document.querySelector(".rp-input");
    if (ta) await save(P.cc_role, ta.value);
    var r = await sb.from("cc_submissions").insert({ team_id: P.team_id, round: round,
      submitted_at: new Date().toISOString(), submitted_by: P.auth_user_id || null });
    if (r.error) { msg.textContent = "Could not submit: " + r.error.message; return; }
    render();
  }

  function subscribe() {
    if (!sb.channel) return;
    if (channel) sb.removeChannel(channel);
    channel = sb.channel("cc-" + P.team_id)
      .on("postgres_changes", { event: "*", schema: "public", table: "cc_sections",
           filter: "team_id=eq." + P.team_id }, function (payload) {
        var row = payload.new || {};
        if (row.round !== round || row.role === P.cc_role) return;   // never overwrite your own box
        var v = el("rd-" + slug(row.role));
        if (v) { v.textContent = row.body || ""; mark(row.role, "updated just now"); }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cc_submissions",
           filter: "team_id=eq." + P.team_id }, function () { render(); })
      .subscribe();
  }
})();
