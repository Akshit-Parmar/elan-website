/* ============================================================================
   Élan — partners
   ONE list drives both the homepage logo strip and the partners page.
   To add a partner: drop the logo into assets/img/partners/ and add an entry.
   Nothing else needs editing.

     { name: "Full name",
       logo: "assets/img/partners/their-logo.png",   // optional
       type: "school" | "organisation",
       note: "One short line",                        // optional
       url:  "https://theirsite.com" }                // optional
   ========================================================================== */
window.ELAN_PARTNERS = [
  {
    name: "Sanjay Ghodawat International School",
    logo: "assets/img/partners/sgis-logo.png",
    type: "school",
    note: "Host school and Cent$ible collaborator \u00b7 Pune and Kolhapur campuses",
    url: "https://sgischool.in/"
  }
  // Add further partners below as they are confirmed.
];

(function () {
  "use strict";
  var LIST = window.ELAN_PARTNERS || [];

  function esc(x) { return String(x == null ? "" : x).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function initials(n) {
    return String(n || "").trim().split(/\s+/).slice(0, 2)
      .map(function (w) { return w.charAt(0).toUpperCase(); }).join("");
  }

  function card(p) {
    var inner =
      '<div class="partner-mark">' +
        (p.logo ? '<img src="' + esc(p.logo) + '" alt="' + esc(p.name) + ' logo" loading="lazy"/>'
                : '<span aria-hidden="true">' + esc(initials(p.name)) + "</span>") +
      "</div>" +
      '<div class="partner-body"><strong>' + esc(p.name) + "</strong>" +
      (p.note ? "<span>" + esc(p.note) + "</span>" : "") + "</div>";
    return p.url
      ? '<a class="partner-card" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + inner + "</a>"
      : '<div class="partner-card">' + inner + "</div>";
  }

  // ---- partners page grid ----
  var grid = document.getElementById("partnerGrid");
  if (grid) {
    grid.innerHTML = LIST.length
      ? LIST.map(card).join("")
      : '<p class="note">Partner schools and organisations will be listed here as they are confirmed. ' +
        'If your school would like to collaborate, <a href="contact.html">get in touch</a>.</p>';
  }

  // ---- homepage strip ----
  var strip = document.getElementById("partnerStrip");
  if (strip) {
    if (!LIST.length) { strip.closest("section").remove(); return; }
    strip.innerHTML = LIST.map(function (p) {
      return '<div class="partner-chip" title="' + esc(p.name) + '">' +
        (p.logo ? '<img src="' + esc(p.logo) + '" alt="' + esc(p.name) + '" loading="lazy"/>'
                : "<span>" + esc(p.name) + "</span>") + "</div>";
    }).join("");
  }
})();
