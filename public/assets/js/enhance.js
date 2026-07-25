/* ============================================================================
   Élan 2026 — progressive enhancements (enhance.js)
   Loaded by main.js on every page. 100% additive: no existing hook is touched,
   no form/route/query is affected. Every feature no-ops when its target is
   absent, on touch devices, or under prefers-reduced-motion. Listeners are
   cleaned up on pagehide so nothing leaks across the SPA-style page fades.
   ========================================================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  var canHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;
  var cleanups = [];
  function on(t, e, fn, o) { t.addEventListener(e, fn, o); cleanups.push(function () { t.removeEventListener(e, fn, o); }); }
  window.addEventListener("pagehide", function () { cleanups.forEach(function (f) { try { f(); } catch (e) {} }); cleanups = []; }, { once: true });

  /* 1 — Distinguish the two flagship pages (both use data-page="flagship").
        Adds a decorative body class only; no payload/logic impact. */
  (function themeFlagship() {
    var t = (document.title || "");
    if (/^Crisis Command/i.test(t)) document.body.classList.add("is-crisis");
    else if (/^Cent\$?ible/i.test(t)) document.body.classList.add("is-centsible");
  })();

  /* 2 — Scroll progress bar */
  (function progress() {
    var bar = document.createElement("div");
    bar.className = "elan-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    var ticking = false;
    function paint() {
      var h = document.documentElement;
      var max = (h.scrollHeight - h.clientHeight) || 1;
      bar.style.width = Math.min(100, (h.scrollTop / max) * 100) + "%";
      ticking = false;
    }
    on(window, "scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
    on(window, "resize", paint, { passive: true });
    paint();
  })();

  /* 3 — Lock background scroll while the mobile menu is open.
        Observes the existing .nav-panel.open state main.js toggles — we never
        touch main.js's own toggle logic. */
  (function menuLock() {
    var panel = document.querySelector(".nav-panel");
    if (!panel || !("MutationObserver" in window)) return;
    var mo = new MutationObserver(function () {
      document.body.classList.toggle("menu-open", panel.classList.contains("open"));
    });
    mo.observe(panel, { attributes: true, attributeFilter: ["class"] });
    cleanups.push(function () { mo.disconnect(); document.body.classList.remove("menu-open"); });
  })();

  /* 4 — Subtle staggered reveal: nudge transition-delay for grouped .reveal items
        so cards cascade instead of popping together. Purely visual. */
  (function stagger() {
    if (reduce) return;
    var groups = document.querySelectorAll(".info-grid,.feature-grid,.role-grid,.price-grid,.split-cta,.judging-grid,.guest-mini-grid,.speaker-grid,.phase-grid");
    groups.forEach(function (g) {
      var kids = g.querySelectorAll(".reveal");
      kids.forEach(function (el, i) { el.style.transitionDelay = Math.min(i * 70, 420) + "ms"; });
    });
  })();

  /* 5 — Magnetic buttons (desktop, fine pointer, motion allowed). Translation is
        purely transform-based and resets on leave; clicks are unaffected. */
  (function magnetic() {
    if (reduce || coarse || !canHover) return;
    var btns = document.querySelectorAll(".btn-gold,.nav-cta,.guest-arrow,.play-button");
    btns.forEach(function (b) {
      function move(ev) {
        var r = b.getBoundingClientRect();
        var mx = ev.clientX - (r.left + r.width / 2);
        var my = ev.clientY - (r.top + r.height / 2);
        b.style.transform = "translate(" + mx * 0.18 + "px," + my * 0.22 + "px)";
      }
      function reset() { b.style.transform = ""; }
      on(b, "pointermove", move);
      on(b, "pointerleave", reset);
    });
  })();

  /* 6 — Custom cursor (desktop only; disabled on touch/coarse/reduced-motion).
        No hover-only information depends on it; it is decoration. */
  (function cursor() {
    if (reduce || coarse || !canHover) return;
    var dot = document.createElement("div");
    dot.className = "elan-cursor";
    dot.setAttribute("aria-hidden", "true");
    document.body.appendChild(dot);
    document.body.classList.add("elan-has-cursor");
    var x = 0, y = 0, cx = 0, cy = 0, raf;
    function loop() { cx += (x - cx) * 0.22; cy += (y - cy) * 0.22; dot.style.transform = "translate(" + cx + "px," + cy + "px) translate(-50%,-50%)"; raf = requestAnimationFrame(loop); }
    on(document, "pointermove", function (e) { x = e.clientX; y = e.clientY; }, { passive: true });
    on(document, "pointerover", function (e) {
      if (e.target.closest && e.target.closest("a,button,.btn,.faq-question,.filter-btn,input,select,textarea,label")) dot.classList.add("hover");
    });
    on(document, "pointerout", function (e) {
      if (e.target.closest && e.target.closest("a,button,.btn,.faq-question,.filter-btn,input,select,textarea,label")) dot.classList.remove("hover");
    });
    raf = requestAnimationFrame(loop);
    cleanups.push(function () { cancelAnimationFrame(raf); dot.remove(); document.body.classList.remove("elan-has-cursor"); });
  })();
})();
