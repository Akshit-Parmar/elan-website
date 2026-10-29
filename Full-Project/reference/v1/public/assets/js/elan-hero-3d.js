/* ============================================================================
   Élan 2026 — Cinematic 3D hero (elan-hero-3d.js)

   A sculptural Élan emblem: a Mother-of-Pearl ceramic core, a Mystic-Navy
   brushed-metal ring, and orbiting Slate-Blue frosted-glass shards, lit with a
   single controlled Red-Inferno rim for quiet tension. Everything stays inside
   the official palette.

   This file is PURE PROGRESSIVE ENHANCEMENT. It is imported dynamically by
   elan-cinematic.js only when the device/browser can support it. It exports a
   single init() that returns a disposer. If anything at all goes wrong, the
   caller removes the canvas and the existing static hero remains untouched.

   No Supabase, no forms, no routing. Homepage-only (mounts into .hero).
   ========================================================================== */

// three is loaded from CDN by the caller and passed in, so this module has no
// hard import and cannot break page load if the CDN is blocked.
export function initElanHero(THREE, canvas, opts = {}) {
  const palette = {
    navy:   0x13273f,
    pearl:  0xe9d4c3,
    pearlHi:0xfff0de,
    slate:  0x8396ac,
    red:    0x4e0000,
    red2:   0x790005,
    brown:  0x704b38,
  };

  const isMobile = !!opts.mobile;
  const reduced  = !!opts.reducedMotion;
  const accent   = opts.accent || "default";

  // Per-page accent: the single tension light + accent ring shift colour so each
  // page family (Crisis Command = red, Cent$ible = chocolate, rest = slate) feels
  // distinct while staying one system.
  const accents = {
    red:       { ring: palette.red2,  rim: palette.red2,  rimI: 1.2, ringI: 0.55 },
    chocolate: { ring: palette.brown, rim: palette.brown, rimI: 0.9, ringI: 0.4  },
    default:   { ring: palette.slate, rim: palette.slate, rimI: 0.7, ringI: 0.3  },
  };
  const A = accents[accent] || accents.default;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: true,          // let the hero gradient show through
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0); // fully transparent
  const maxDpr = isMobile ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  // ---- the emblem -----------------------------------------------------------
  const emblem = new THREE.Group();
  scene.add(emblem);

  // Pearl ceramic core
  const coreGeo = new THREE.IcosahedronGeometry(1.55, 1);
  const coreMat = new THREE.MeshStandardMaterial({
    color: palette.pearl,
    roughness: 0.52,
    metalness: 0.12,
    flatShading: true,
    emissive: palette.brown,
    emissiveIntensity: 0.06,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  emblem.add(core);

  // Mystic-Navy brushed-metal ring
  const ringGeo = new THREE.TorusGeometry(2.75, 0.11, isMobile ? 12 : 20, isMobile ? 60 : 128);
  const ringMat = new THREE.MeshStandardMaterial({
    color: palette.navy,
    roughness: 0.32,
    metalness: 0.92,
    emissive: palette.navy,
    emissiveIntensity: 0.12,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI * 0.42;
  ring.rotation.y = Math.PI * 0.08;
  emblem.add(ring);

  // A thinner Red-Inferno accent ring — the single controlled moment of tension
  const redRingGeo = new THREE.TorusGeometry(2.28, 0.03, 8, isMobile ? 48 : 96);
  const redRingMat = new THREE.MeshStandardMaterial({
    color: A.ring,
    roughness: 0.4,
    metalness: 0.3,
    emissive: A.ring,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.9,
  });
  const redRing = new THREE.Mesh(redRingGeo, redRingMat);
  redRing.rotation.x = Math.PI * 0.5;
  redRing.rotation.z = Math.PI * 0.12;
  emblem.add(redRing);

  // Orbiting Slate-Blue frosted-glass shards (translucent standard mat — cheaper
  // and steadier on Android than real transmission).
  const shards = [];
  const shardCount = isMobile ? 4 : 7;
  const shardGeo = new THREE.IcosahedronGeometry(0.42, 0);
  const shardMat = new THREE.MeshStandardMaterial({
    color: palette.slate,
    roughness: 0.28,
    metalness: 0.2,
    transparent: true,
    opacity: 0.55,
    flatShading: true,
  });
  for (let i = 0; i < shardCount; i++) {
    const s = new THREE.Mesh(shardGeo, shardMat);
    const a = (i / shardCount) * Math.PI * 2;
    s.userData = { a, r: 3.0 + (i % 2) * 0.5, y: (i % 3 - 1) * 0.9, spin: 0.3 + (i % 3) * 0.15 };
    s.position.set(Math.cos(a) * s.userData.r, s.userData.y, Math.sin(a) * s.userData.r);
    s.scale.setScalar(0.7 + (i % 3) * 0.28);
    emblem.add(s);
    shards.push(s);
  }

  // ---- lighting (palette-locked) --------------------------------------------
  scene.add(new THREE.AmbientLight(palette.slate, 0.55));

  const key = new THREE.DirectionalLight(palette.pearlHi, 1.35);
  key.position.set(4, 5, 6);
  scene.add(key);

  const fill = new THREE.DirectionalLight(palette.slate, 0.5);
  fill.position.set(-6, -2, 2);
  scene.add(fill);

  // Controlled accent rim light for tension — subtle, from behind.
  const rim = new THREE.PointLight(A.rim, A.rimI, 22, 2);
  rim.position.set(-3.5, 1.5, -4);
  scene.add(rim);

  const warm = new THREE.PointLight(palette.pearl, 0.6, 20, 2);
  warm.position.set(3, -3, 3);
  scene.add(warm);

  // ---- interaction state ----------------------------------------------------
  let pointerX = 0, pointerY = 0;        // target (from cursor), −1..1
  let curX = 0, curY = 0;                // damped
  let scroll = 0;                        // 0..1 across the hero
  let running = true;
  let raf = 0;
  const clock = new THREE.Clock();

  function onPointer(e) {
    const t = e.touches ? e.touches[0] : e;
    if (!t) return;
    pointerX = (t.clientX / window.innerWidth) * 2 - 1;
    pointerY = (t.clientY / window.innerHeight) * 2 - 1;
  }
  if (!opts.mobile) window.addEventListener("pointermove", onPointer, { passive: true });

  function onScroll(){ var el=canvas.parentElement; if(!el)return; var r=el.getBoundingClientRect(); var tot=r.height+window.innerHeight; scroll=Math.min(1,Math.max(0,(window.innerHeight-r.top)/tot)); }
  window.addEventListener("scroll", onScroll, { passive: true });

  function resize() {
    const el = canvas.parentElement;
    if (!el) return;
    const w = el.clientWidth || window.innerWidth;
    const h = el.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Shift the emblem toward the right on wide screens so hero text stays clear.
    const wide = w > 900;
    emblem.position.x = wide ? 2.1 : 0;
    emblem.position.y = wide ? 0.1 : 1.1;
  }
  window.addEventListener("resize", resize, { passive: true });

  // Pause when the hero scrolls off-screen (saves battery/GPU).
  let io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { running = en.isIntersecting && !document.hidden; if (running) tick(); });
    }, { threshold: 0.01 });
    io.observe(canvas);
  }
  function onVisibility() { running = !document.hidden; if (running) tick(); }
  document.addEventListener("visibilitychange", onVisibility);

  // ---- render loop ----------------------------------------------------------
  function tick() {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    // Damp cursor influence.
    curX += (pointerX - curX) * 0.045;
    curY += (pointerY - curY) * 0.045;

    const spinScale = reduced ? 0.12 : 1;

    // Base slow rotation + gentle cursor tilt.
    emblem.rotation.y += dt * 0.16 * spinScale;
    emblem.rotation.y = emblem.rotation.y; // (kept explicit for clarity)
    emblem.rotation.x = -0.12 + curY * 0.28 + Math.sin(t * 0.4) * 0.03 * spinScale;
    emblem.rotation.z = curX * 0.12;

    // Scroll dolly: the emblem drifts deeper and the shards separate outward as
    // the visitor moves from mystery into the content.
    camera.position.z = 9 + scroll * 3.2;
    emblem.rotation.y += scroll * 0.002;

    ring.rotation.z += dt * 0.05 * spinScale;
    redRing.rotation.z -= dt * 0.08 * spinScale;
    redRingMat.emissiveIntensity = A.ringI + 0.14 + Math.sin(t * 1.2) * 0.14; // slow warning pulse

    const sep = 1 + scroll * 0.9;
    shards.forEach((s) => {
      const u = s.userData;
      const a = u.a + t * 0.12 * u.spin * spinScale;
      s.position.set(Math.cos(a) * u.r * sep, u.y + Math.sin(t * 0.5 + u.a) * 0.18, Math.sin(a) * u.r * sep);
      s.rotation.x += dt * 0.3 * u.spin * spinScale;
      s.rotation.y += dt * 0.4 * u.spin * spinScale;
    });

    renderer.render(scene, camera);
  }

  resize();
  onScroll();
  tick();

  // ---- disposer -------------------------------------------------------------
  return function dispose() {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", onVisibility);
    if (io) io.disconnect();
    [coreGeo, ringGeo, redRingGeo, shardGeo].forEach((g) => g.dispose());
    [coreMat, ringMat, redRingMat, shardMat].forEach((m) => m.dispose());
    renderer.dispose();
  };
}
