/* ============================================================================
   Élan 2026 — Cent$ible bespoke scene (elan-scene-centsible.js)

   The business flagship's own 3D world: a Mother-of-Pearl "Cents" token rimmed
   in Chocolate Cremoso, ringed by Mystic-Navy / Chocolate market columns that
   breathe like a live market, with orbiting resource coins wired by warm
   negotiation pathways. Premium financial language — no green charts, no crypto.
   Palette-locked. Progressive enhancement; returns a disposer.
   ========================================================================== */
export function initCentsibleScene(THREE, canvas, opts = {}) {
  const P = { navy:0x13273f, navy2:0x1b3350, pearl:0xe9d4c3, pearlHi:0xfff0de,
              slate:0x8396ac, choco:0x704b38, choco2:0x8a5f49 };
  const isMobile = !!opts.mobile;
  const reduced  = !!opts.reducedMotion;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias:!isMobile, alpha:true, powerPreference:"high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(P.navy, 10, 28);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 1.2, 11);
  camera.lookAt(0, 0.2, 0);

  const world = new THREE.Group();
  scene.add(world);

  /* ---- central "Cents" token -------------------------------------------- */
  const coin = new THREE.Group();
  world.add(coin);
  const pearlMat = new THREE.MeshStandardMaterial({ color:P.pearl, roughness:0.4, metalness:0.35, emissive:P.choco, emissiveIntensity:0.05 });
  const rimMat   = new THREE.MeshStandardMaterial({ color:P.choco, roughness:0.5, metalness:0.45, emissive:P.choco, emissiveIntensity:0.08 });
  const coinGeo  = new THREE.CylinderGeometry(1.35, 1.35, 0.26, isMobile ? 32 : 56);
  const coinMesh = new THREE.Mesh(coinGeo, [rimMat, pearlMat, pearlMat]); // [side, top, bottom]
  coinMesh.rotation.x = Math.PI * 0.5;           // face the camera
  coin.add(coinMesh);
  // embossed ring + core on the face
  const embossGeo = new THREE.TorusGeometry(0.8, 0.06, 8, isMobile ? 40 : 80);
  const embossMat = new THREE.MeshStandardMaterial({ color:P.choco2, roughness:0.45, metalness:0.5, emissive:P.choco, emissiveIntensity:0.12 });
  const emboss = new THREE.Mesh(embossGeo, embossMat);
  emboss.position.z = 0.14;
  coin.add(emboss);
  const pipGeo = new THREE.IcosahedronGeometry(0.34, 0);
  const pip = new THREE.Mesh(pipGeo, new THREE.MeshStandardMaterial({ color:P.pearlHi, roughness:0.35, metalness:0.3, flatShading:true }));
  pip.position.z = 0.18;
  coin.add(pip);

  /* ---- market columns (breathe like a live market, not a green chart) ---- */
  const cols = [];
  const colCount = isMobile ? 8 : 14;
  const colGeo = new THREE.BoxGeometry(0.34, 1, 0.34);
  const colMatA = new THREE.MeshStandardMaterial({ color:P.navy2, roughness:0.34, metalness:0.85, emissive:P.navy, emissiveIntensity:0.12 });
  const colMatB = new THREE.MeshStandardMaterial({ color:P.choco, roughness:0.42, metalness:0.4, emissive:P.choco, emissiveIntensity:0.08 });
  for (let i = 0; i < colCount; i++) {
    const c = new THREE.Mesh(colGeo, i % 2 ? colMatB : colMatA);
    const a = (i / colCount) * Math.PI * 2;
    c.userData = { a, phase:i * 0.6, r:3.2 };
    c.position.set(Math.cos(a) * c.userData.r, 0, Math.sin(a) * c.userData.r);
    world.add(c);
    cols.push(c);
  }

  /* ---- orbiting resource coins ------------------------------------------- */
  const coins = [];
  const coinCount = isMobile ? 4 : 7;
  const miniGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 20);
  const miniMat = new THREE.MeshStandardMaterial({ color:P.slate, roughness:0.3, metalness:0.5, emissive:P.slate, emissiveIntensity:0.18 });
  for (let i = 0; i < coinCount; i++) {
    const m = new THREE.Mesh(miniGeo, miniMat);
    m.userData = { a:(i/coinCount)*Math.PI*2, r:4.1 + (i%2)*0.6, y:0.5 + (i%3-1)*0.8, spd:0.18 + (i%3)*0.06 };
    world.add(m);
    coins.push(m);
  }

  /* ---- warm negotiation pathways (coin -> some columns) ------------------ */
  const linkN = Math.min(cols.length, isMobile ? 5 : 8);
  const linePos = new Float32Array(linkN * 2 * 3);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3));
  const lineMat = new THREE.LineBasicMaterial({ color:P.choco2, transparent:true, opacity:0.4 });
  const links = new THREE.LineSegments(lineGeo, lineMat);
  world.add(links);

  /* ---- lighting (warm, premium) ------------------------------------------ */
  scene.add(new THREE.AmbientLight(P.slate, 0.5));
  const key = new THREE.DirectionalLight(P.pearlHi, 1.25); key.position.set(4,6,5); scene.add(key);
  const fill = new THREE.DirectionalLight(P.slate, 0.4); fill.position.set(-5,-1,3); scene.add(fill);
  const warm = new THREE.PointLight(P.choco2, 1.2, 22, 2); warm.position.set(-2.5, 2.2, -3); scene.add(warm);
  const glow = new THREE.PointLight(P.pearl, 0.7, 20, 2); glow.position.set(3, -2.5, 3); scene.add(glow);

  /* ---- interaction ------------------------------------------------------- */
  let pX=0, pY=0, cX=0, cY=0, scroll=0, running=true, raf=0;
  const clock = new THREE.Clock();
  function onPointer(e){ const t=e.touches?e.touches[0]:e; if(!t)return; pX=(t.clientX/window.innerWidth)*2-1; pY=(t.clientY/window.innerHeight)*2-1; }
  if (!isMobile) window.addEventListener("pointermove", onPointer, { passive:true });
  function onScroll(){ var el=canvas.parentElement; if(!el)return; var r=el.getBoundingClientRect(); var tot=r.height+window.innerHeight; scroll=Math.min(1,Math.max(0,(window.innerHeight-r.top)/tot)); }
  window.addEventListener("scroll", onScroll, { passive:true });
  function resize(){ var el=canvas.parentElement; if(!el)return; var w=el.clientWidth||window.innerWidth, ht=el.clientHeight||window.innerHeight; renderer.setSize(w,ht,false); camera.aspect=w/ht; camera.updateProjectionMatrix(); var wide=w>900; world.position.x=wide?1.9:0; world.position.y=wide?0:0.5; }
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

    world.rotation.y += dt*0.09*sp;
    world.rotation.x = -0.04 + cY*0.18;
    world.rotation.z = cX*0.05;

    coin.rotation.z += dt*0.2*sp;
    pip.rotation.x += dt*0.4*sp; pip.rotation.y += dt*0.3*sp;
    emboss.rotation.z -= dt*0.15*sp;

    camera.position.z = 11 + scroll*3;

    // columns breathe (market movement) — scaled from the base, kept grounded
    const arr = links.geometry.attributes.position.array;
    cols.forEach((c,i)=>{
      const h = 1.1 + (Math.sin(t*0.7*sp + c.userData.phase) * 0.5 + 0.5) * (1.6 + (i%3)*0.5);
      c.scale.y = h; c.position.y = h/2 - 1.4;
      if (i < linkN){
        arr[i*6+0]=0; arr[i*6+1]=0.1; arr[i*6+2]=0;
        arr[i*6+3]=c.position.x; arr[i*6+4]=c.position.y + h/2; arr[i*6+5]=c.position.z;
      }
    });
    links.geometry.attributes.position.needsUpdate = true;
    lineMat.opacity = 0.28 + Math.sin(t*1.1)*0.12;

    coins.forEach((m)=>{
      const u=m.userData, a=u.a + t*u.spd*sp;
      m.position.set(Math.cos(a)*u.r, u.y + Math.sin(t*0.5+u.a)*0.22, Math.sin(a)*u.r);
      m.rotation.x += dt*0.6*u.spd; m.rotation.z += dt*0.5*u.spd;
    });

    warm.intensity = 1.1 + Math.sin(t*0.9)*0.25;

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
    [coinGeo,embossGeo,pipGeo,colGeo,miniGeo,lineGeo].forEach(g=>g.dispose());
    [pearlMat,rimMat,embossMat,colMatA,colMatB,miniMat,lineMat].forEach(m=>m.dispose());
    pip.material.dispose();
    renderer.dispose();
  };
}
