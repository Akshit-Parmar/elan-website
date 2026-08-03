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

  function field(key, label, val, hint, big, off) {
    var d = off ? " disabled" : "";
    return '<label class="pd-lab" for="pf-' + key + '">' + esc(label) + "</label>" +
      (big
        ? '<textarea class="pd-in" id="pf-' + key + '" data-k="' + key + '" rows="3"' + d + ' placeholder="' + esc(hint) + '">' + esc(val || "") + "</textarea>"
        : '<input class="pd-in" id="pf-' + key + '" data-k="' + key + '"' + d + ' placeholder="' + esc(hint) + '" value="' + esc(val || "") + '"/>');
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

    // ---- team ---------------------------------------------------------------
    var teamName = "", mates = [], linked = !!p.team_id;
    if (linked) {
      var t = await sb.from("cc_teams").select("*").eq("id", p.team_id).maybeSingle();
      var mm = await sb.from("participants").select("full_name,participant_uid,school")
                       .eq("team_id", p.team_id).order("full_name");
      teamName = (t.data && t.data.name) || "Your team";
      mates = mm.error ? [] : (mm.data || []);
    }

    if (theme !== BRAND) {
      // other themes: simple team panel only
      html = '<article class="white-card"><span class="section-label">Your team</span>' +
        (linked
          ? '<h3 class="card-title" style="margin:6px 0 10px">' + esc(teamName) + "</h3>" +
            '<div class="rp-mates">' + mates.map(function (m) {
              var me = m.participant_uid === p.participant_uid;
              return '<span class="rp-mate' + (me ? " is-me" : "") + '"><strong>' +
                     esc(m.school || "") + "</strong>" + esc(m.full_name) + (me ? " (you)" : "") + "</span>";
            }).join("") + "</div>"
          : '<h3 class="card-title" style="margin:6px 0 6px">Being confirmed</h3>' +
            '<p class="card-copy">Your team will appear here once the Organising Committee confirms it.</p>') +
        "</article>";
      mount.innerHTML = html;
      return;
    }

    // ---- BRAND बनाओ: one workspace card -------------------------------------
    var files = linked
      ? await sb.from("cc_files").select("*").eq("team_id", p.team_id).eq("round", "pitch")
                .order("uploaded_at", { ascending: false })
      : { data: [] };
    var list = (files.error ? [] : (files.data || []));

    var S = {};
    if (linked) {
      var secs = await sb.from("cc_sections").select("*").eq("team_id", p.team_id).eq("round", "pitch");
      (secs.error ? [] : (secs.data || [])).forEach(function (x) { S[x.role] = x.body || ""; });
    }

    html = '<article class="white-card ws">' +
      '<span class="section-label">Your workspace</span>' +
      '<h2 class="ws-h">' + (linked ? esc(teamName) : "Waiting for your team") + "</h2>";

    if (linked) {
      html += '<div class="rp-mates" style="margin-bottom:6px">' + mates.map(function (m) {
        var me = m.participant_uid === p.participant_uid;
        return '<span class="rp-mate' + (me ? " is-me" : "") + '"><strong>' +
               esc(m.school || "") + "</strong>" + esc(m.full_name) + (me ? " (you)" : "") + "</span>";
      }).join("") + "</div>";
    } else {
      html += '<div class="ws-wait"><strong>Your partner is not linked yet.</strong>' +
        "<span>You and your partner registered separately, so the \u00c9lan team needs to link you before you can work here. " +
        "This usually happens within a day or two of registering. Nothing is required from you right now.</span>" +
        '<span>If it has been longer than that, email <a href="mailto:elan@sgischool.in">elan@sgischool.in</a> with both names.</span></div>';
    }

    html += '<div class="ws-sep"></div>' +
      '<h3 class="ws-h3">Your pitch in short</h3>' +
      '<p class="ws-note">Judges read this before Startup Launchpad. Either partner can edit it, and it saves as you type.</p>' +
      '<div class="ws-fields' + (linked ? "" : " is-locked") + '">' +
        field("startup", "Startup name", S["startup"], "e.g. Kirana Connect", false, !linked) +
        field("oneline", "One-line pitch", S["oneline"], "What you do, in one sentence.", false, !linked) +
        field("problem", "The problem, and who has it", S["problem"], "Who struggles today, and why it matters.", true, !linked) +
        field("ask", "Your ask", S["ask"], "How much funding, and what you would spend it on.", true, !linked) +
        '<span class="ws-saved" id="pdSaved"></span>' +
      "</div>";

    html += '<div class="ws-sep"></div>' +
      '<h3 class="ws-h3">Your pitch deck</h3>' +
      '<p class="ws-note">Prepare your deck in advance and bring it into Startup Launchpad on Day 1. ' +
      "Upload it before you travel so the judging panel has it ready. Either partner can upload, and you can replace it any time before the event.</p>";

    if (list.length) {
      html += '<div class="ws-files">' + list.map(function (f, i) {
        return '<div class="rp-file"><span>' + esc(f.file_name) +
               (i === 0 ? ' <span class="pill-paid">current</span>' : ' <span class="note">earlier version</span>') +
               '</span><button class="mini-btn" data-pdl="' + esc(f.file_path) + '">Download</button></div>';
      }).join("") + "</div>";
    }

    if (linked) {
      html += '<div class="ws-upload"><label for="pdUp"><strong>' +
        (list.length ? "Replace your deck" : "Upload your deck") +
        "</strong><span>PDF or PowerPoint, up to 25 MB</span></label>" +
        '<input type="file" id="pdUp" accept=".pdf,.ppt,.pptx,.key,application/pdf"/>' +
        '<span class="ws-saved" id="pdMsg"></span></div>';
    } else {
      html += '<div class="ws-upload is-locked"><strong>Upload opens once your team is linked.</strong>' +
        "<span>You can start writing your deck now. Nothing is lost by waiting.</span></div>";
    }

    html += "</article>";

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
      if (f.size > 10 * 1024 * 1024) { msg.textContent = "That file is " + (f.size/1048576).toFixed(1) + " MB. The limit is 10 MB \u2014 try exporting your deck as a PDF, or compressing the images."; return; }
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
