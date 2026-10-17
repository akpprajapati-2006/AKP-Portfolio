/* ===== world.js: Three.js scenes (hero laptop + floating island) =====
   Everything is built from simple shapes, so no model files are needed.
   Both scenes pause when off-screen and are skipped if WebGL is missing. */
(function () {
  const $ = s => document.querySelector(s);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!window.THREE) {  /* CDN blocked or offline: show simple fallbacks instead of empty boxes */
    ["#hero3d", "#island"].forEach(q => { const c = $(q); if (c) c.style.display = "none"; });
    const hv = $(".heroviz"); if (hv) hv.insertAdjacentHTML("afterbegin", '<div class="static3d" style="display:block;text-align:center;padding-top:90px" aria-hidden="true">💻</div>');
    const st = $(".world .static3d"); if (st) st.style.display = "block";
    return;
  }

  function makeRenderer(canvas) {
    try {
      const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      r.setPixelRatio(Math.min(devicePixelRatio, 2));
      return r;
    } catch (e) { return null; }
  }
  const mat = (c, e) => new THREE.MeshLambertMaterial({ color: c, emissive: e || 0x000000 });
  function fit(r, cam, cv) {
    const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  function visible(el) { const s = { v: true }; new IntersectionObserver(e => s.v = e[0].isIntersecting).observe(el); return s; }

  /* ---------- Hero: glowing laptop with live-looking code ---------- */
  function hero() {
    const cv = $("#hero3d"); if (!cv) return;
    const r = makeRenderer(cv); if (!r) return;
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 1, .1, 50);
    cam.position.set(0, 1.6, 6.2); cam.lookAt(0, .5, 0);
    sc.add(new THREE.AmbientLight(0x7799dd, .9));
    const key = new THREE.PointLight(0x22d3ee, 1.6, 20); key.position.set(3, 4, 4); sc.add(key);
    const rim = new THREE.PointLight(0x8b5cf6, 1.2, 20); rim.position.set(-4, 2, -2); sc.add(rim);

    // code texture for the screen
    const tex = document.createElement("canvas"); tex.width = 512; tex.height = 320;
    const tctx = tex.getContext("2d"), ct = new THREE.CanvasTexture(tex);
    const lines = ["const akash = {", "  role: 'CSE Student',", "  focus: ['Cloud','AI'],", "  security: true,", "  games: 'Unity',", "};", "", "build(dream).then(code);", "// Dream. Code. Build. Repeat."];
    let shown = 0;
    function paint() {
      tctx.fillStyle = "#040b1f"; tctx.fillRect(0, 0, 512, 320);
      tctx.fillStyle = "#0b1a3d"; tctx.fillRect(0, 0, 512, 28);
      ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => { tctx.fillStyle = c; tctx.beginPath(); tctx.arc(18 + i * 18, 14, 5, 0, 6.3); tctx.fill(); });
      tctx.font = "20px monospace";
      lines.slice(0, shown).forEach((t, i) => { tctx.fillStyle = i === 8 ? "#6b7fa6" : i % 2 ? "#7dd3fc" : "#c4b5fd"; tctx.fillText(t, 18, 62 + i * 27); });
      ct.needsUpdate = true;
    }
    shown = reduce ? lines.length : 0; paint();

    const g = new THREE.Group(); sc.add(g);
    const base = new THREE.Mesh(new THREE.BoxGeometry(3, .1, 2), mat(0x1c2742)); g.add(base);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(1, .02, .6), mat(0x2b3a63)); pad.position.set(0, .06, .5); g.add(pad);
    const hinge = new THREE.Group(); hinge.position.set(0, .05, -1); hinge.rotation.x = -.28; g.add(hinge);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(3, 1.9, .07), mat(0x151d35)); lid.position.y = .95; hinge.add(lid);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.75), new THREE.MeshBasicMaterial({ map: ct })); scr.position.set(0, .95, .04); hinge.add(scr);
    const underglow = new THREE.Mesh(new THREE.TorusGeometry(2.2, .03, 8, 64), new THREE.MeshBasicMaterial({ color: 0x22d3ee })); underglow.rotation.x = Math.PI / 2; underglow.position.y = -.5; g.add(underglow);

    const orbit = new THREE.Group(); g.add(orbit);
    [0x22d3ee, 0x8b5cf6, 0x2f7bff, 0xf59e0b, 0x22c55e].forEach((c, i) => {
      const m = new THREE.Mesh(i % 2 ? new THREE.OctahedronGeometry(.2) : new THREE.BoxGeometry(.3, .3, .3), mat(c, c));
      const a = i / 5 * 6.283; m.position.set(Math.cos(a) * 2.6, .8 + Math.sin(i * 2) * .5, Math.sin(a) * 1.4); orbit.add(m);
    });
    g.position.y = -.4; g.rotation.y = -.4;

    let mx = 0, my = 0; const vis = visible(cv); let t0 = 0;
    addEventListener("pointermove", e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
    addEventListener("resize", () => fit(r, cam, cv)); fit(r, cam, cv);
    (function loop(t) {
      requestAnimationFrame(loop); if (!vis.v) return;
      if (shown < lines.length && t - t0 > 450) { shown++; t0 = t; paint(); }
      if (!reduce) {
        g.rotation.y += ((-.4 + mx * .9) - g.rotation.y) * .05;
        g.rotation.x += ((my * .3) - g.rotation.x) * .05;
        g.position.y = -.4 + Math.sin(t / 900) * .1; orbit.rotation.y = t / 2500;
        orbit.children.forEach((m, i) => { m.rotation.x += .01; m.rotation.y += .013; });
      }
      r.render(sc, cam);
    })(0);
  }

  /* ---------- Floating island (desktop only) ---------- */
  function island() {
    const cv = $("#island"); if (!cv || innerWidth <= 820 || reduce) return;
    const r = makeRenderer(cv);
    if (!r) { cv.style.display = "none"; $(".static3d").style.display = "block"; return; }
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(45, 1, .1, 100);
    cam.position.set(0, 3.4, 9.5); cam.lookAt(0, -.3, 0);
    sc.add(new THREE.AmbientLight(0x6f8fd0, .95));
    const dl = new THREE.DirectionalLight(0xffffff, .9); dl.position.set(4, 8, 5); sc.add(dl);
    const glowL = new THREE.PointLight(0x22d3ee, 1.4, 14); glowL.position.set(0, -2.5, 0); sc.add(glowL);

    const isl = new THREE.Group(); sc.add(isl);
    const clickable = [];
    const tag = (m, label, go) => { m.userData = { label, go }; clickable.push(m); return m; };

    const rock = new THREE.Mesh(new THREE.ConeGeometry(2.7, 3, 8), mat(0x3b3f5c)); rock.rotation.x = Math.PI; rock.position.y = -1.6; isl.add(rock);
    const grass = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, .3, 8), mat(0x2f8f5b)); isl.add(grass);
    const road = new THREE.Mesh(new THREE.BoxGeometry(4.4, .05, .5), mat(0x161b2e)); road.position.y = .17; isl.add(road);

    [[-1.5, 1, .75, -1.1], [-.45, 1.5, .75, -1.1], [.7, 1.1, .75, -1.1], [1.6, .7, .6, 1.1], [-1.2, .6, .6, 1.1]].forEach(([x, h, w, z]) => {
      const b = tag(new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat(0x1e3a8a, 0x0b3f78)), "Projects", "projects");
      b.position.set(x, .15 + h / 2, z); isl.add(b);
    });
    [[-2, -.3], [2, .3], [0, -2], [.2, 2], [-1.7, 1.7]].forEach(([x, z]) => {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, .4), mat(0x5a3a22)); t.position.set(x, .35, z);
      const l = new THREE.Mesh(new THREE.ConeGeometry(.3, .75, 6), mat(0x22c55e)); l.position.set(x, .9, z); isl.add(t, l);
    });
    const lap = new THREE.Group(); lap.position.set(.2, .2, .45); isl.add(lap);
    const lb = tag(new THREE.Mesh(new THREE.BoxGeometry(.8, .05, .55), mat(0x94a3b8)), "About me", "about");
    const ls = tag(new THREE.Mesh(new THREE.BoxGeometry(.8, .5, .03), mat(0x22d3ee, 0x0891b2)), "About me", "about");
    ls.position.set(0, .28, -.22); ls.rotation.x = -.25; lap.add(lb, ls);

    const cloud = new THREE.Group();
    [[0, 0, .55], [.6, -.1, .4], [-.6, -.1, .4]].forEach(([x, y, rad]) => {
      const s = tag(new THREE.Mesh(new THREE.SphereGeometry(rad, 14, 14), mat(0xffffff, 0x3a5a88)), "Skills & Cloud", "skills"); s.position.set(x, y, 0); cloud.add(s);
    });
    cloud.position.set(0, 2.8, 0); isl.add(cloud);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.3, .04, 8, 72), new THREE.MeshBasicMaterial({ color: 0x22d3ee })); ring.rotation.x = Math.PI / 2; ring.position.y = -3.3; isl.add(ring);

    // interaction: drag to rotate, hover tooltip, click to jump
    const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), tip = $("#tip3d");
    let drag = false, moved = 0, px = 0, hover = null;
    const pick = e => {
      const b = cv.getBoundingClientRect();
      mouse.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
      ray.setFromCamera(mouse, cam);
      const h = ray.intersectObjects(clickable)[0]; return h ? h.object.userData : null;
    };
    cv.addEventListener("pointerdown", e => { drag = true; moved = 0; px = e.clientX; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener("pointermove", e => {
      if (drag) { const d = e.clientX - px; moved += Math.abs(d); isl.rotation.y += d * .01; px = e.clientX; return; }
      hover = pick(e); cv.style.cursor = hover ? "pointer" : "grab";
      if (hover) { const b = cv.getBoundingClientRect(); tip.hidden = false; tip.textContent = hover.label; tip.style.left = (e.clientX - b.left + 14) + "px"; tip.style.top = (e.clientY - b.top + 14) + "px"; } else tip.hidden = true;
    });
    cv.addEventListener("pointerleave", () => { tip.hidden = true; });
    cv.addEventListener("pointerup", e => {
      drag = false;
      if (moved < 6) { const h = pick(e); if (h) document.getElementById(h.go).scrollIntoView(); }
    });

    const vis = visible(cv);
    addEventListener("resize", () => fit(r, cam, cv)); fit(r, cam, cv);
    (function loop(t) {
      requestAnimationFrame(loop); if (!vis.v) return;
      if (!drag) isl.rotation.y += .003;
      isl.position.y = Math.sin(t / 900) * .14; cloud.position.y = 2.8 + Math.sin(t / 700) * .12;
      r.render(sc, cam);
    })(0);
  }

  const start = () => { hero(); island(); };
  document.readyState === "complete" ? start() : addEventListener("load", start);
})();
