/* ============================================================================
   Élan 2026 — Crisis Command bespoke scene (elan-scene-crisis.js)

   The flagship page's own 3D world: a Mystic-Navy monolith of connected forms,
   orbiting Slate decision nodes wired to the core by pulsing Red-Inferno signal
   lines, over a receding strategy grid — a high-pressure command rhythm, not a
   war game. Palette-locked. Progressive enhancement; returns a disposer.
   ========================================================================== */
export function initCrisisScene(THREE, canvas, opts = {}) {
  const P = { navy:0x13273f, navy2:0x1b3350, pearl:0xe9d4c3, pearlHi:0xfff0de,
              slate:0x8396ac, red:0x4e0000, red2:0x790005, brown:0x704b38 };
  const isMobile = !!opts.mobile;
  const reduced  = !!opts.reducedMotion;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias:!isMobile, alpha:true, powerPreference:"high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(P.navy, 9, 26);            // depth haze

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 1.4, 11);
  camera.lookAt(0, 0.4, 0);

  const world = new THREE.Group();
  scene.add(world);

  /* ---- monolith core: connected navy forms rising ------------------------ */
  const core = new THREE.Group();
  world.add(core);

  const navyMat = new THREE.MeshStandardMaterial({ color:P.navy2, roughness:0.34, metalness:0.9, emissive:P.navy, emissiveIntensity:0.14 });
  const pillarGeos = [];
  const pillarCount = 5;
  for (let i = 0; i < pillarCount; i++) {
    const h = 2.2 + (i % 3) * 0.9;
    const g = new THREE.CylinderGeometry(0.12, 0.26, h, 6);
    pillarGeos.push(g);
    const m = new THREE.Mesh(g, navyMat);
    const a = (i / pillarCount) * Math.PI * 2;
    m.position.set(Math.cos(a) * 0.55, h / 2 - 1.2, Math.sin(a) * 0.55);
    m.rotation.z = Math.cos(a) * 0.12;
    m.rotation.x = Math.sin(a) * 0.12;
    core.add(m);
  }
  // pearl keystone
  const keyGeo = new THREE.IcosahedronGeometry(0.62, 1);
  const keyMat = new THREE.MeshStandardMaterial({ color:P.pearl, roughness:0.5, metalness:0.15, flatShading:true, emissive:P.brown, emissiveIntensity:0.06 });
  const keystone = new THREE.Mesh(keyGeo, keyMat);
  keystone.position.y = 1.15;
  core.add(keystone);
  // navy ring
  const ringGeo = new THREE.TorusGeometry(1.7, 0.05, 8, isMobile ? 60 : 120);
  const ringMat = new THREE.MeshStandardMaterial({ color:P.navy2, roughness:0.3, metalness:0.95, emissive:P.navy, emissiveIntensity:0.1 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI * 0.5;
  core.add(ring);

  /* ---- orbiting decision nodes ------------------------------------------- */
  const nodes = [];
  const nodeCount = isMobile ? 5 : 9;
  const nodeGeo = new THREE.IcosahedronGeometry(0.2, 0);
  const nodeMat = new THREE.MeshStandardMaterial({ color:P.slate, roughness:0.3, metalness:0.4, emissive:P.slate, emissiveIntensity:0.25, transparent:true, opacity:0.92 });
  for (let i = 0; i < nodeCount; i++) {
    const n = new THREE.Mesh(nodeGeo, nodeMat);
    n.userData = { a:(i/nodeCount)*Math.PI*2, r:3.1 + (i%3)*0.7, y:0.4 + (i%4-1.5)*0.7, spd:0.16 + (i%3)*0.07 };
    world.add(n);
    nodes.push(n);
  }

  /* ---- pulsing red signal lines (core -> each node) ---------------------- */
  const linePos = new Float32Array(nodeCount * 2 * 3);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
  const lineMat = new THREE.LineBasicMaterial({ color:P.red2, transparent:true, opacity:0.5 });
  const signals = new THREE.LineSegments(lineGeo, lineMat);
  world.add(signals);

  /* ---- receding strategy grid -------------------------------------------- */
  let grid = null;
  if (!isMobile) {
    grid = new THREE.GridHelper(40, 40, P.slate, P.navy2);
    grid.material.transparent = true;
    grid.material.opacity = 0.16;
    grid.position.y = -2.6;
    scene.add(grid);
  }

  /* ---- lighting ---------------------------------------------------------- */
  scene.add(new THREE.AmbientLight(P.slate, 0.5));
  const key = new THREE.DirectionalLight(P.pearlHi, 1.2); key.position.set(4,6,5); scene.add(key);
  const fill = new THREE.DirectionalLight(P.slate, 0.45); fill.position.set(-5,-1,3); scene.add(fill);
  const warn = new THREE.PointLight(P.red2, 1.4, 20, 2); warn.position.set(-2.5, 2.5, -3); scene.add(warn);

  /* ---- interaction ------------------------------------------------------- */
  let pX=0, pY=0, cX=0, cY=0, scroll=0, running=true, raf=0;
  const clock = new THREE.Clock();
  function onPointer(e){ const t=e.touches?e.touches[0]:e; if(!t)return; pX=(t.clientX/window.innerWidth)*2-1; pY=(t.clientY/window.innerHeight)*2-1; }
  if (!isMobile) window.addEventListener("pointermove", onPointer, { passive:true });
  function onScroll(){ var el=canvas.parentElement; if(!el)return; var r=el.getBoundingClientRect(); var tot=r.height+window.innerHeight; scroll=Math.min(1,Math.max(0,(window.innerHeight-r.top)/tot)); }
  window.addEventListener("scroll", onScroll, { passive:true });
  function resize(){ var el=canvas.parentElement; if(!el)return; var w=el.clientWidth||window.innerWidth, ht=el.clientHeight||window.innerHeight; renderer.setSize(w,ht,false); camera.aspect=w/ht; camera.updateProjectionMatrix(); const wide=w>900; world.position.x=wide?1.9:0; world.position.y=wide?0:0.6; }
  window.addEventListener("resize", resize, { passive:true });

  let io=null;
  if ("IntersectionObserver" in window){ io=new IntersectionObserver(es=>es.forEach(en=>{running=en.isIntersecting&&!document.hidden; if(running)tick();}),{threshold:0.01}); io.observe(canvas); }
  function onVis(){ running=!document.hidden; if(running)tick(); }
  document.addEventListener("visibilitychange", onVis);

  const tmp = new THREE.Vector3();
  function tick(){
    if(!running) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    const sp = reduced ? 0.12 : 1;
    cX += (pX-cX)*0.045; cY += (pY-cY)*0.045;

    world.rotation.y += dt*0.1*sp;
    world.rotation.x = -0.05 + cY*0.18;
    world.rotation.z = cX*0.06;
    core.rotation.y -= dt*0.14*sp;
    keystone.rotation.y += dt*0.3*sp;
    keystone.rotation.x += dt*0.2*sp;
    ring.rotation.z += dt*0.06*sp;
    if (grid) grid.position.z = ((t*0.4*sp) % 1);      // subtle forward drift

    camera.position.z = 11 + scroll*3;

    // nodes orbit + wire signal lines to them
    const arr = signals.geometry.attributes.position.array;
    nodes.forEach((n,i)=>{
      const u=n.userData, a=u.a + t*u.spd*sp;
      n.position.set(Math.cos(a)*u.r, u.y + Math.sin(t*0.5+u.a)*0.25, Math.sin(a)*u.r);
      n.rotation.x += dt*0.5*u.spd; n.rotation.y += dt*0.6*u.spd;
      tmp.copy(core.position); // core at world origin (0)
      arr[i*6+0]=0; arr[i*6+1]=0.6; arr[i*6+2]=0;
      arr[i*6+3]=n.position.x; arr[i*6+4]=n.position.y; arr[i*6+5]=n.position.z;
    });
    signals.geometry.attributes.position.needsUpdate = true;
    lineMat.opacity = 0.32 + Math.sin(t*1.6)*0.18;      // warning pulse
    warn.intensity = 1.2 + Math.sin(t*1.6)*0.5;

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
    pillarGeos.forEach(g=>g.dispose());
    [keyGeo,ringGeo,nodeGeo,lineGeo].forEach(g=>g.dispose());
    [navyMat,keyMat,ringMat,nodeMat,lineMat].forEach(m=>m.dispose());
    if(grid){ grid.geometry.dispose(); grid.material.dispose(); }
    renderer.dispose();
  };
}
