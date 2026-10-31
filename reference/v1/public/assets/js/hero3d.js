/* ============================================================================
   Élan 2026 — cinematic 3D hero (hero3d.js)  ·  PROGRESSIVE ENHANCEMENT ONLY
   A sculptural Élan emblem: a faceted Mother-of-Pearl core inside a slow slate
   ceremonial ring, lit warm (Chocolate) with a Red-Inferno rim. Responds to
   cursor + scroll, evolves down the page, and returns nothing critical — if
   WebGL is missing, reduced-motion is set, or the module fails to load, the
   static .cinema-board fallback stays exactly as it is.
   Loaded (and gated) by main.js only on the homepage. Palette-locked.
   ========================================================================== */
(function () {
  "use strict";
  var mount = document.querySelector(".cinema-board");
  if (!mount) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  // WebGL capability probe — bail to fallback if unavailable.
  try {
    var probe = document.createElement("canvas");
    if (!(probe.getContext("webgl") || probe.getContext("experimental-webgl"))) return;
  } catch (e) { return; }

  var mobile = Math.min(window.innerWidth, window.innerHeight) < 620;
  var THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js";

  // Palette (locked to the official Élan system)
  var C = { navy: 0x13273F, navyLift: 0x1B3452, pearl: 0xE7D6C2, pearlHi: 0xF3E9DC,
            slate: 0x798DA6, red: 0x7A1414, choc: 0x674635, chocHi: 0x8A6650 };

  import(THREE_URL).then(function (THREE) {
    var renderer, scene, camera, raf, ro;
    var disposables = [];
    var pointer = { x: 0, y: 0 }, target = { x: 0, y: 0 }, scrollN = 0;
    try {
      var w = mount.clientWidth || 480, h = mount.clientHeight || 480;
      renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: true, powerPreference: "high-performance" });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
      renderer.domElement.setAttribute("aria-hidden", "true");
      mount.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
      camera.position.set(0, 0, 6.2);

      var group = new THREE.Group();
      scene.add(group);

      // --- Core: faceted pearl crystal (ceramic Mother-of-Pearl) ---
      var coreGeo = new THREE.IcosahedronGeometry(1.5, mobile ? 0 : 1);
      var coreMat = new THREE.MeshStandardMaterial({
        color: C.pearl, metalness: 0.28, roughness: 0.34, flatShading: true,
        emissive: C.choc, emissiveIntensity: 0.06
      });
      var core = new THREE.Mesh(coreGeo, coreMat);
      group.add(core); disposables.push(coreGeo, coreMat);

      // Inner navy brushed-metal seed (depth under the facets)
      var seedGeo = new THREE.IcosahedronGeometry(1.02, 0);
      var seedMat = new THREE.MeshStandardMaterial({ color: C.navyLift, metalness: 0.8, roughness: 0.4, flatShading: true });
      var seed = new THREE.Mesh(seedGeo, seedMat);
      group.add(seed); disposables.push(seedGeo, seedMat);

      // --- Ceremonial slate ring (frosted metal) ---
      var ringGeo = new THREE.TorusGeometry(2.35, 0.05, 12, mobile ? 80 : 160);
      var ringMat = new THREE.MeshStandardMaterial({ color: C.slate, metalness: 0.9, roughness: 0.25 });
      var ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI * 0.42;
      group.add(ring); disposables.push(ringGeo, ringMat);

      var ring2Geo = new THREE.TorusGeometry(2.9, 0.02, 10, mobile ? 70 : 140);
      var ring2Mat = new THREE.MeshStandardMaterial({ color: C.chocHi, metalness: 0.7, roughness: 0.35 });
      var ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
      ring2.rotation.x = Math.PI * 0.5; ring2.rotation.y = Math.PI * 0.12;
      group.add(ring2); disposables.push(ring2Geo, ring2Mat);

      // --- Pearl dust (restrained; reduced on mobile) ---
      var count = mobile ? 130 : 320;
      var pos = new Float32Array(count * 3);
      for (var i = 0; i < count; i++) {
        var rr = 3.2 + Math.random() * 2.4, a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = rr * Math.sin(b) * Math.cos(a);
        pos[i * 3 + 1] = rr * Math.sin(b) * Math.sin(a) * 0.6;
        pos[i * 3 + 2] = rr * Math.cos(b);
      }
      var dustGeo = new THREE.BufferGeometry();
      dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      var dustMat = new THREE.PointsMaterial({ color: C.pearlHi, size: 0.028, transparent: true, opacity: 0.55, sizeAttenuation: true });
      var dust = new THREE.Points(dustGeo, dustMat);
      scene.add(dust); disposables.push(dustGeo, dustMat);

      // --- Lighting (warm choc key · slate fill · red-inferno rim) ---
      scene.add(new THREE.AmbientLight(0x24425F, 0.6));
      var key = new THREE.PointLight(C.chocHi, 26, 30); key.position.set(4, 4, 5); scene.add(key);
      var fill = new THREE.PointLight(C.slate, 16, 30); fill.position.set(-5, -2, 4); scene.add(fill);
      var rim = new THREE.PointLight(C.red, 14, 24); rim.position.set(-2, 3, -4); scene.add(rim);
      var pearlGlow = new THREE.DirectionalLight(C.pearlHi, 0.5); pearlGlow.position.set(0, 2, 6); scene.add(pearlGlow);

      // --- Interaction ---
      function onMove(e) {
        var r = mount.getBoundingClientRect();
        target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
        target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      }
      window.addEventListener("pointermove", onMove, { passive: true });
      function onScroll() {
        var r = mount.getBoundingClientRect();
        scrollN = Math.min(1, Math.max(0, -r.top / (window.innerHeight || 800)));
      }
      window.addEventListener("scroll", onScroll, { passive: true });

      // --- Resize ---
      function resize() {
        var W = mount.clientWidth, H = mount.clientHeight;
        if (!W || !H) return;
        renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix();
      }
      if ("ResizeObserver" in window) { ro = new ResizeObserver(resize); ro.observe(mount); }
      else window.addEventListener("resize", resize);

      // --- Loop ---
      var t0 = performance.now(), first = true;
      function tick(now) {
        var t = (now - t0) / 1000;
        pointer.x += (target.x - pointer.x) * 0.05;
        pointer.y += (target.y - pointer.y) * 0.05;

        core.rotation.y = t * 0.18 + pointer.x * 0.5;
        core.rotation.x = t * 0.08 + pointer.y * 0.35;
        seed.rotation.y = -t * 0.12;
        ring.rotation.z = t * 0.1;
        ring2.rotation.z = -t * 0.07;
        dust.rotation.y = t * 0.02;

        // scroll evolution: core recedes + separates slightly, ring opens
        group.position.z = -scrollN * 1.4;
        core.scale.setScalar(1 - scrollN * 0.14);
        ring.scale.setScalar(1 + scrollN * 0.18);
        ring2.scale.setScalar(1 + scrollN * 0.26);
        rim.intensity = 14 + scrollN * 16; // red rim glows as you scroll in

        camera.position.x += (pointer.x * 0.4 - camera.position.x) * 0.05;
        camera.position.y += (-pointer.y * 0.3 - camera.position.y) * 0.05;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
        if (first) { first = false; document.body.classList.add("hero3d-active"); }
        raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);

      // --- Cleanup ---
      function destroy() {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("scroll", onScroll);
        if (ro) ro.disconnect(); else window.removeEventListener("resize", resize);
        disposables.forEach(function (d) { if (d && d.dispose) try { d.dispose(); } catch (e) {} });
        try { renderer.dispose(); if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); } catch (e) {}
        document.body.classList.remove("hero3d-active");
      }
      window.addEventListener("pagehide", destroy, { once: true });
      // Pause when the tab is hidden to save battery/GPU.
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) { cancelAnimationFrame(raf); }
        else { t0 = performance.now(); raf = requestAnimationFrame(tick); }
      });
    } catch (err) {
      // Any init failure → guarantee the static fallback is shown.
      document.body.classList.remove("hero3d-active");
      try { if (renderer) { renderer.dispose(); if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); } } catch (e) {}
    }
  }).catch(function () {
    // Module (CDN) failed to load — keep the fallback, do nothing else.
    document.body.classList.remove("hero3d-active");
  });
})();
