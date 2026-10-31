/* ============================================================================
   Élan 2026 — Cinematic enhancement layer (elan-cinematic.js)

   Two jobs, both PURE ENHANCEMENT (no forms, no Supabase, no routing, no
   existing behaviour touched):

     1. Load the 3D hero (elan-hero-3d.js) only when the device can support it,
        mounting a transparent canvas behind the existing hero. Any failure
        silently removes the canvas and leaves the current static hero intact.

     2. A restrained, palette-safe motion layer: a thin scroll-progress line,
        magnetic hero CTAs, and gentle pointer parallax on the hero's decorative
        board — all disabled on touch devices and under prefers-reduced-motion.

   Load this AFTER main.js. It never intercepts submits, links, or queries.
   ========================================================================== */
(function () {
  "use strict";

  // Capture THIS script's own URL now (currentScript is only valid during the
  // synchronous run). In a classic script, dynamic import() would otherwise
  // resolve relative to the PAGE, not this file — which is why the module 404'd.
  var SELF_SRC = (document.currentScript && document.currentScript.src) || "";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse  = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  var saveData = navigator.connection && navigator.connection.saveData;

  /* ---- 1. Scroll progress line (decorative, aria-hidden) ------------------ */
  function initScrollProgress() {
    if (reduced) return;
    var bar = document.createElement("div");
    bar.className = "elan-scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    var ticking = false;
    function set() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? (h.scrollTop || window.pageYOffset) / max : 0;
      bar.style.transform = "scaleX(" + Math.min(1, Math.max(0, p)) + ")";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(set); }
    }, { passive: true });
    set();
  }

  /* ---- 2. Magnetic hero CTAs (non-touch only) ---------------------------- */
  function initMagneticButtons() {
    if (reduced || coarse) return;
    var scope = document.querySelector(".hero");
    var finalCta = document.querySelector(".final-cta");
    var btns = [];
    [scope, finalCta].forEach(function (root) {
      if (root) btns = btns.concat(Array.prototype.slice.call(root.querySelectorAll(".btn")));
    });
    btns.forEach(function (btn) {
      btn.classList.add("elan-magnetic");
      btn.addEventListener("pointermove", function (e) {
        var r = btn.getBoundingClientRect();
        var mx = e.clientX - (r.left + r.width / 2);
        var my = e.clientY - (r.top + r.height / 2);
        btn.style.transform = "translate(" + mx * 0.16 + "px," + my * 0.22 + "px)";
      });
      btn.addEventListener("pointerleave", function () { btn.style.transform = ""; });
    });
  }

  /* ---- 3. Gentle pointer parallax on the hero decorative board ------------ */
  function initHeroParallax() {
    if (reduced || coarse) return;
    var board = document.querySelector(".hero .cinema-board");
    if (!board) return;
    var layers = Array.prototype.slice.call(board.querySelectorAll(".floating-note, .orb, .glow-line"));
    if (!layers.length) return;
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    function loop() {
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
      layers.forEach(function (el, i) {
        var d = (i % 3 + 1) * 4;
        el.style.transform = (el.dataset.baseTransform || "") + " translate(" + cx * d + "px," + cy * d + "px)";
      });
      raf = requestAnimationFrame(loop);
    }
    // Capture the CSS rotate() each note already has so we don't lose it.
    layers.forEach(function (el) {
      var cs = getComputedStyle(el).transform;
      el.dataset.baseTransform = cs && cs !== "none" ? cs : "";
    });
    window.addEventListener("pointermove", function (e) {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
    loop();
    window.addEventListener("pagehide", function () { cancelAnimationFrame(raf); });
  }

  /* ---- 3b. Site-wide 3D card tilt (non-touch only) ----------------------- */
  function initCardTilt() {
    if (reduced || coarse) return;
    var sel = ".white-card,.glass-card,.dark-card,.info-card,.price-card,.person-card,.feature-card,.package-card";
    var cards = Array.prototype.slice.call(document.querySelectorAll(sel));
    cards.forEach(function (card) {
      card.classList.add("elan-tilt");
      var raf = 0;
      card.addEventListener("pointermove", function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;   // −0.5..0.5
          var py = (e.clientY - r.top) / r.height - 0.5;
          var max = 7; // degrees — restrained, premium, not a toy
          card.style.transform =
            "perspective(900px) rotateY(" + (px * max) + "deg) rotateX(" + (-py * max) +
            "deg) translateY(-6px)";
        });
      });
      card.addEventListener("pointerleave", function () { card.style.transform = ""; });
    });
  }


  function webglOK() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) { return false; }
  }

  function initHero3D() {
    var hero = document.querySelector(".hero, .page-hero"); // every page has one
    if (!hero) return;
    if (saveData) return;                      // respect data-saver
    if (window.innerWidth < 480) return;       // tiny phones keep the light static header
    if (!webglOK()) return;                    // no WebGL -> static header stays

    // Filename is the reliable signal (some pages share a data-page value), so
    // resolve on it first and fall back to data-page.
    var page = (document.body && document.body.dataset && document.body.dataset.page) || "";
    var file = (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
    var key = file || page;
    var accent = "default";
    if (["home", "index", "flagship", "event-flow"].indexOf(key) >= 0) accent = "red";
    else if (["centsible"].indexOf(key) >= 0) accent = "chocolate";

    var canvas = document.createElement("canvas");
    canvas.className = "elan-hero-canvas";
    canvas.setAttribute("aria-hidden", "true");
    hero.insertBefore(canvas, hero.firstChild);

    var disposer = null;
    function fallback(why) {
      if (why) { try { console.warn("[Élan] 3D disabled:", why && why.message ? why.message : why); } catch (e) {} }
      try { if (disposer) disposer(); } catch (e) {}
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      hero.classList.remove("has-3d-hero");
    }

    // Per-page scene registry. Add an entry here as each page gets its own
    // bespoke world; anything not listed uses the shared emblem.
    var SCENES = {
      home:      { file: "elan-scene-hero.js",     fn: "initHeroScene" },
      index:     { file: "elan-scene-hero.js",     fn: "initHeroScene" },
      flagship:  { file: "elan-scene-crisis.js",   fn: "initCrisisScene" },
      centsible: { file: "elan-scene-centsible.js", fn: "initCentsibleScene" },
    };
    var chosen = SCENES[key];
    var MOD_FILE = chosen ? chosen.file : "elan-hero-3d.js";
    var MOD_FN   = chosen ? chosen.fn   : "initElanHero";
    var MOD_URL  = SELF_SRC ? new URL(MOD_FILE, SELF_SRC).href : ("assets/js/" + MOD_FILE);

    // Load three: jsDelivr first (already proven reachable — Supabase loads from
    // it on this site), unpkg as a backup. Both are ES module builds.
    function loadThree() {
      return import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js")
        .catch(function () { return import("https://unpkg.com/three@0.160.0/build/three.module.js"); });
    }

    loadThree()
      .then(function (THREE) {
        return import(MOD_URL).then(function (mod) {
          var initFn = mod[MOD_FN];
          if (typeof initFn !== "function") throw new Error("scene fn missing: " + MOD_FN);
          var mobile = window.innerWidth < 900;
          disposer = initFn(THREE, canvas, { mobile: mobile, reducedMotion: reduced, accent: accent });
          hero.classList.add("has-3d-hero");
        });
      })
      .catch(function (err) { fallback(err); }); // CDN blocked / module 404 / WebGL lost

    window.addEventListener("pagehide", function () { try { if (disposer) disposer(); } catch (e) {} });
  }

  function boot() {
    try { initScrollProgress(); } catch (e) {}
    try { initMagneticButtons(); } catch (e) {}
    try { initHeroParallax(); } catch (e) {}
    try { initCardTilt(); } catch (e) {}
    try { initHero3D(); } catch (e) {}
  }

  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
