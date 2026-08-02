/* ============================================================================
   Élan — Cent$ible portal workspace
   BRAND बनाओ teams register in pairs and submit a pitch deck before the event.
   This adds their team panel, the deck upload, and what has been received.
   Other themes get their team panel only.
   ========================================================================== */
(function () {
  "use strict";

  var BRAND = "BRAND \u092C\u0928\u093E\u0913";

  function esc(x) { return String(x == null ? "" : x).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function field(key, label, val, hint, big) {
    return '<label class="pd-lab" for="pf-' + key + '">' + esc(label) + "</label>" +
      (big
        ? '<textarea class="pd-in" id="pf-' + key + '" data-k="' + key + '" rows="3" placeholder="' + esc(hint) + '">' + esc(val || "") + "</textarea>"
        : '<input class="pd-in" id="pf-' + key + '" data-k="' + key + '" placeholder="' + esc(hint) + '" value="' + esc(val || "") + '"/>');
  }

  var ranFor = null;

  function start(p) {
    var sb = window.__elanSb;
    if (!p || !sb) return;
    if (p.flagship !== "Cent$ible") return;
    if (ranFor === p.participant_uid) return;      // don't run twice
    ranFor = p.participant_uid;

    // Create the mount point ourselves if the page did not provide one.
    var mount = document.getElementById("centWorkspace");
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "centWorkspace";
      mount.className = "ep-flag-strip";
      var anchor = document.querySelector(".ep-flag-strip") || document.querySelector(".page-hero");
      if (anchor && anchor.parentNode) anchor.insertAdjacentElement("afterend", mount);
      else (document.getElementById("ep-main") || document.body).appendChild(mount);
    }
    build(p, sb, mount);
  }

  document.addEventListener("elan:participant", function (ev) { start(ev.detail || {}); });

  // Fallback: if the inline script errored before dispatching the event, pick the
  // participant straight off the window once portal.js has set it.
  var tries = 0;
  var poll = setInterval(function () {
    if (window.__elanParticipant && window.__elanSb) { clearInterval(poll); start(window.__elanParticipant); }
    else if (++tries > 40) clearInterval(poll);
  }, 250);

  async function build(p, sb, mount) {

    var theme = p.centsible_theme || "";
    var html = "";

    // ---- your team ---------------------------------------------------------
    if (p.team_id) {
      var t = await sb.from("cc_teams").select("*").eq("id", p.team_id).maybeSingle();
      var mates = await sb.from("participants").select("full_name,participant_uid,school")
                          .eq("team_id", p.team_id).order("full_name");
      var team = t.data || {};
      html += '<article class="white-card"><span class="section-label">Your team</span>' +
        '<h3 class="card-title" style="margin:6px 0 2px">' + esc(team.name || "Your team") + "</h3>" +
        '<div class="rp-mates">' + (mates.data || []).map(function (m) {
          var me = m.participant_uid === p.participant_uid;
          return '<span class="rp-mate' + (me ? " is-me" : "") + '"><strong>' +
                 esc(m.school || "") + "</strong>" + esc(m.full_name) + (me ? " (you)" : "") + "</span>";
        }).join("") + "</div></article>";
    } else {
      html += '<article class="white-card"><span class="section-label">Your team</span>' +
        '<h3 class="card-title" style="margin:6px 0 6px">Being confirmed</h3>' +
        '<p class="card-copy">You registered with a partner. Once the Organising Committee links your team, ' +
        "both of you will see it here and either of you can upload your pitch deck.</p></article>";
    }

    // ---- BRAND बनाओ: pitch deck --------------------------------------------
    if (theme === BRAND) {
      var files = await sb.from("cc_files").select("*").eq("team_id", p.team_id || "00000000-0000-0000-0000-000000000000")
                          .eq("round", "pitch").order("uploaded_at", { ascending: false });
      var list = (files.error ? [] : (files.data || []));

      html += '<article class="white-card" style="margin-top:14px"><span class="section-label">Your pitch deck</span>' +
        '<h3 class="card-title" style="margin:6px 0 6px">Submit before the event</h3>' +
        '<p class="card-copy">BRAND \u092C\u0928\u093E\u0913 teams prepare a pitch deck in advance and bring it into Startup Launchpad on Day 1. ' +
        'Upload it here before you travel, so the judging panel has it ready. Either partner can upload, and you can replace it any time before the event.</p>' +
        '<p class="card-copy" style="margin-top:10px"><strong>What a strong deck usually covers:</strong> the problem and who has it, ' +
        "your solution and what makes it different, your target customer and market, how the business makes money, " +
        "what you are asking investors for and what you would spend it on.</p>";

      if (!p.team_id) {
        html += '<p class="note" style="margin-top:12px">Upload opens once your team is linked.</p>';
      } else {
        var secs = await sb.from("cc_sections").select("*").eq("team_id", p.team_id).eq("round", "pitch");
        var S = {};
        (secs.error ? [] : (secs.data || [])).forEach(function (x) { S[x.role] = x.body || ""; });
        html += '<div class="pd-summary"><strong>Your pitch in short</strong>' +
          '<p class="note" style="margin:4px 0 12px">Judges read this before your Startup Launchpad round. Either partner can edit it, and it saves as you type.</p>' +
          field("startup", "Startup name", S["startup"], "e.g. Kirana Connect", false) +
          field("oneline", "One-line pitch", S["oneline"], "What you do, in a single sentence.", false) +
          field("problem", "The problem, and who has it", S["problem"], "Who struggles today, and why it matters.", true) +
          field("ask", "Your ask", S["ask"], "How much funding you want, and what you would spend it on.", true) +
          '<span class="note" id="pdSaved"></span></div>';
        html += '<div id="pdList" style="margin-top:14px">' + (list.length
          ? list.map(function (f, i) {
              return '<div class="rp-file"><span>' + esc(f.file_name) +
                     (i === 0 ? ' <span class="pill-paid">current</span>' : ' <span class="note">earlier version</span>') +
                     "</span><button class=\"mini-btn\" data-pdl=\"" + esc(f.file_path) + "\">Download</button></div>";
            }).join("")
          : '<p class="note">No deck uploaded yet.</p>') + "</div>" +
          '<div style="margin-top:12px"><label class="note" for="pdUp" style="display:block;margin-bottom:6px">' +
          "Upload your deck (PDF or PowerPoint, up to 25 MB)</label>" +
          '<input type="file" id="pdUp" accept=".pdf,.ppt,.pptx,.key,application/pdf"/> ' +
          '<span class="note" id="pdMsg"></span></div>';
      }
      html += "</article>";
    }

    mount.innerHTML = html;

    // ---- wiring ------------------------------------------------------------
    mount.querySelectorAll("[data-pdl]").forEach(function (b) {
      b.addEventListener("click", async function () {
        var r = await sb.storage.from("cc-uploads").createSignedUrl(b.dataset.pdl, 120);
        if (r.data && r.data.signedUrl) window.open(r.data.signedUrl, "_blank");
        else alert("Could not open that file.");
      });
    });

    var tmr = {};
    mount.querySelectorAll(".pd-in").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var k = inp.dataset.k, saved = document.getElementById("pdSaved");
        if (saved) saved.textContent = "saving\u2026";
        clearTimeout(tmr[k]);
        tmr[k] = setTimeout(async function () {
          var r = await sb.from("cc_sections").upsert({ team_id: p.team_id, round: "pitch", role: k,
            body: inp.value, updated_at: new Date().toISOString(), updated_by: p.auth_user_id || null },
            { onConflict: "team_id,round,role" });
          if (saved) saved.textContent = r.error ? "not saved, retrying" : "saved";
        }, 800);
      });
    });

    var up = document.getElementById("pdUp");
    if (up) up.addEventListener("change", async function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var msg = document.getElementById("pdMsg");
      if (f.size > 25 * 1024 * 1024) { msg.textContent = "That file is larger than 25 MB."; return; }
      msg.textContent = "Uploading\u2026";
      var path = p.team_id + "/pitch/" + Date.now() + "-" + f.name.replace(/[^\w.\-]+/g, "_");
      var res = await sb.storage.from("cc-uploads").upload(path, f);
      if (res.error) { msg.textContent = "Upload failed: " + res.error.message; return; }
      var ins = await sb.from("cc_files").insert({ team_id: p.team_id, round: "pitch",
        file_path: path, file_name: f.name, uploaded_by: p.auth_user_id || null });
      if (ins.error) { msg.textContent = "Uploaded, but not recorded: " + ins.error.message; return; }
      msg.textContent = "Uploaded \u2713 " + f.name + " (" + (f.size/1048576).toFixed(1) + " MB) received.";
      setTimeout(function () { location.reload(); }, 1200);
    });
  }
})();
