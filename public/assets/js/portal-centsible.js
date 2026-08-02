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

  document.addEventListener("elan:participant", async function (ev) {
    var p = ev.detail || {}, sb = window.__elanSb;
    var mount = document.getElementById("centWorkspace");
    if (!mount || p.flagship !== "Cent$ible" || !sb) return;

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
      msg.textContent = "Uploaded \u2713 Your deck is with the Élan team.";
      setTimeout(function () { location.reload(); }, 1200);
    });
  });
})();
