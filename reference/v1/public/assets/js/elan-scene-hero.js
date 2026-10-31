/* ============================================================================
   Élan 2026 — Homepage showpiece scene (elan-scene-hero.js)

   The first impression: a sculptural Élan emblem with a Mother-of-Pearl ceramic
   core inside a Slate frosted shell, crowned by radiating Mystic-Navy brushed
   blades and a halo ring, with a controlled Red-Inferno ember behind and a few
   drifting pearl light motes for life. Bold silhouette, editorial finish.
   Palette-locked. Progressive enhancement; returns a disposer.
   ========================================================================== */
export function initHeroScene(THREE, canvas, opts = {}) {
  const P = { navy:0x13273f, navy2:0x1b3350, pearl:0xe9d4c3, pearlHi:0xfff0de,
              slate:0x8396ac, red:0x4e0000, red2:0x790005, brown:0x704b38 };
  const isMobile = !!opts.mobile;
  const reduced  = !!opts.reducedMotion;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias:!isMobile, alpha:true, powerPreference:"high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 9.5);

  const emblem = new THREE.Group();
  scene.add(emblem);

  /* ---- pearl ceramic core ------------------------------------------------ */
  const coreGeo = new THREE.IcosahedronGeometry(1.15, 1);
  const coreMat = new THREE.MeshStandardMaterial({ color:P.pearl, roughness:0.44, metalness:0.12, flatShading:true, emissive:P.brown, emissiveIntensity:0.07 });
  const core = new THREE.Mesh(coreGeo, coreMat);
  emblem.add(core);

  /* ---- slate frosted shell (depth) --------------------------------------- */
  const shellGeo = new THREE.IcosahedronGeometry(1.7, 1);
  const shellMat = new THREE.MeshStandardMaterial({ color:P.slate, roughness:0.2, metalness:0.3, transparent:true, opacity:0.16, flatShading:true });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  emblem.add(shell);

  /* ---- radiating navy brushed blades (the architectural silhouette) ------ */
  const blades = new THREE.Group();
  emblem.add(blades);
  const bladeGeo = new THREE.BoxGeometry(0.09, 1.7, 0.28);
  const bladeMat = new THREE.MeshStandardMaterial({ color:P.navy2, roughness:0.3, metalness:0.92, emissive:P.navy, emissiveIntensity:0.12 });
  const bladeCount = isMobile ? 8 : 12;
  const bladeMeshes = [];
  for (let i = 0; i < bladeCount; i++) {
    const b = new THREE.Mesh(bladeGeo, bladeMat);
    const a = (i / bladeCount) * Math.PI * 2;
    b.userData = { a, base: 2.05 };
    b.position.set(Math.cos(a) * 2.05, 0, Math.sin(a) * 2.05);
    b.lookAt(0, 0, 0);
    b.rotation.z += Math.PI / 2;                 // lay blades tangential/radial
    blades.add(b);
    bladeMeshes.push(b);
  }
  blades.rotation.x = Math.PI * 0.14;

  /* ---- halo ring --------------------------------------------------------- */
  const haloGeo = new THREE.TorusGeometry(3.1, 0.045, 8, isMobile ? 70 : 140);
  const haloMat = new THREE.MeshStandardMaterial({ color:P.pearlHi, roughness:0.35, metalness:0.7, emissive:P.pearl, emissiveIntensity:0.14 });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.rotation.x = Math.PI * 0.46;
  emblem.add(halo);

  /* ---- drifting pearl light motes (a little life, not a storm) ----------- */
  let motes = null, moteGeo = null, moteMat = null;
  const moteCount = isMobile ? 0 : 28;
  if (moteCount) {
    const pos = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      const r = 3 + Math.random() * 3.5, a = Math.random() * Math.PI * 2, y = (Math.random() - 0.5) * 6;
      pos[i*3] = Math.cos(a) * r; pos[i*3+1] = y; pos[i*3+2] = Math.sin(a) * r - 2;
    }
    moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    moteMat = new THREE.PointsMaterial({ color:P.pearlHi, size:0.05, transparent:true, opacity:0.55, sizeAttenuation:true, depthWrite:false });
    motes = new THREE.Points(moteGeo, moteMat);
    scene.add(motes);
  }

  /* ---- lighting ---------------------------------------------------------- */
  scene.add(new THREE.AmbientLight(P.slate, 0.5));
  const key = new THREE.DirectionalLight(P.pearlHi, 1.4); key.position.set(4,5,6); scene.add(key);
  const fill = new THREE.DirectionalLight(P.slate, 0.5); fill.position.set(-6,-2,2); scene.add(fill);
  const ember = new THREE.PointLight(P.red2, 0.9, 22, 2); ember.position.set(-3.5,1.5,-4); scene.add(ember);
  const warm = new THREE.PointLight(P.pearl, 0.6, 20, 2); warm.position.set(3,-3,3); scene.add(warm);

  /* ---- interaction ------------------------------------------------------- */
  let pX=0, pY=0, cX=0, cY=0, scroll=0, running=true, raf=0;
  const clock = new THREE.Clock();
  function onPointer(e){ const t=e.touches?e.touches[0]:e; if(!t)return; pX=(t.clientX/window.innerWidth)*2-1; pY=(t.clientY/window.innerHeight)*2-1; }
  if (!isMobile) window.addEventListener("pointermove", onPointer, { passive:true });
  function onScroll(){ var el=canvas.parentElement; if(!el)return; var r=el.getBoundingClientRect(); var tot=r.height+window.innerHeight; scroll=Math.min(1,Math.max(0,(window.innerHeight-r.top)/tot)); }
  window.addEventListener("scroll", onScroll, { passive:true });
  function resize(){ var el=canvas.parentElement; if(!el)return; var w=el.clientWidth||window.innerWidth, ht=el.clientHeight||window.innerHeight; renderer.setSize(w,ht,false); camera.aspect=w/ht; camera.updateProjectionMatrix(); const wide=w>900; emblem.position.x=wide?2.1:0; emblem.position.y=wide?0.1:1.0; }
  window.addEventListener("resize", resize, { passive:true });

  let io=null;
  if ("IntersectionObserver" in window){ io=new IntersectionObserver(es=>es.forEach(en=>{running=en.isIntersecting&&!document.hidden; if(running)tick();}),{threshold:0.01}); io.observe(canvas); }
  function onVis(){ running=!document.hidden; if(running)tick(); }
  document.addEventListener("visibilitychange", onVis);

  function tick(){
    if(!running) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    const sp = reduced ? 0.12 : 1;
    cX += (pX-cX)*0.045; cY += (pY-cY)*0.045;

    emblem.rotation.y += dt*0.14*sp;
    emblem.rotation.x = -0.05 + cY*0.26 + Math.sin(t*0.4)*0.02*sp;
    emblem.rotation.z = cX*0.1;

    core.rotation.y -= dt*0.25*sp; core.rotation.x += dt*0.12*sp;
    shell.rotation.y += dt*0.08*sp; shell.rotation.z -= dt*0.05*sp;
    blades.rotation.y -= dt*0.1*sp;
    halo.rotation.z += dt*0.05*sp;

    // Scroll bloom: blades ease outward as the visitor moves into the site.
    const bloom = 1 + scroll*0.4;
    bladeMeshes.forEach((b)=>{ const u=b.userData; b.position.set(Math.cos(u.a)*u.base*bloom, b.position.y, Math.sin(u.a)*u.base*bloom); });
    camera.position.z = 9.5 + scroll*3;

    ember.intensity = 0.7 + Math.sin(t*1.1)*0.25;   // slow ember breath

    if (motes){ motes.rotation.y += dt*0.02*sp; const a=motes.geometry.attributes.position.array; for(let i=1;i<a.length;i+=3){ a[i]+=dt*0.15*sp; if(a[i]>3.2)a[i]=-3.2; } motes.geometry.attributes.position.needsUpdate=true; }

    renderer.render(scene, camera);
  }

  resize(); onScroll(); tick();

  return function dispose(){
    running=false; cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", onVis);
    if(io) io.disconnect();
    [coreGeo,shellGeo,bladeGeo,haloGeo].forEach(g=>g.dispose());
    [coreMat,shellMat,bladeMat,haloMat].forEach(m=>m.dispose());
    if(moteGeo) moteGeo.dispose(); if(moteMat) moteMat.dispose();
    renderer.dispose();
  };
}
