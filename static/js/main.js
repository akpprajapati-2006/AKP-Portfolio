/* ===== main.js: UI interactions + calls to the Flask API ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

$("#yr").textContent = new Date().getFullYear();

/* Preloader (also hides if something is slow) */
const hideLoader = () => $("#loader").classList.add("off");
addEventListener("load", () => setTimeout(hideLoader, 400));
setTimeout(hideLoader, 3500);

/* Navbar: sticky style, mobile menu, active link */
addEventListener("scroll", () => $("#nav").classList.toggle("stuck", scrollY > 20), { passive: true });
$("#menu").onclick = e => {
  const open = $("#links").classList.toggle("open");
  e.currentTarget.setAttribute("aria-expanded", open);
};
$("#links").addEventListener("click", e => { if (e.target.closest("a")) $("#links").classList.remove("open"); });
const navLinks = $$(".links a[href^='#']:not(.btn)");
const spy = new IntersectionObserver(es => es.forEach(x => {
  if (x.isIntersecting) navLinks.forEach(a => a.classList.toggle("act", a.getAttribute("href") === "#" + x.target.id));
}), { rootMargin: "-45% 0px -50% 0px" });
$$("header[id],section[id]").forEach(s => spy.observe(s));

/* Resume button: if no resume.pdf exists, explain instead of a broken link */
$$(".nocv").forEach(a => a.addEventListener("click", e => {
  e.preventDefault();
  alert("Resume not added yet. Put your file at static/files/resume.pdf and restart the server.");
}));

/* Typed role text */
(function typed() {
  const el = $("#typed"), roles = window.ROLES || [];
  if (!el || !roles.length) return;
  if (reduce) { el.textContent = roles[0]; return; }
  let i = 0, j = 0, del = false;
  (function tick() {
    const word = roles[i];
    el.textContent = word.slice(0, j);
    if (!del && j === word.length) { del = true; return setTimeout(tick, 1400); }
    if (del && j === 0) { del = false; i = (i + 1) % roles.length; }
    j += del ? -1 : 1;
    setTimeout(tick, del ? 40 : 85);
  })();
})();

/* Scroll reveal (called again after dynamic content is added) */
const revealIO = new IntersectionObserver(es => es.forEach(x => {
  if (x.isIntersecting) { x.target.classList.add("in"); revealIO.unobserve(x.target); }
}), { threshold: .1 });
const observeReveal = () => $$(".rv:not(.in)").forEach(el => revealIO.observe(el));

/* 3D card tilt (mouse only) */
function bindTilt() {
  if (reduce) return;
  $$(".tilt:not([data-t])").forEach(el => {
    el.dataset.t = 1;
    el.addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `perspective(900px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateY(-4px)`;
    });
    el.addEventListener("pointerleave", () => el.style.transform = "");
  });
}

/* Cursor glow */
const glow = $("#glow");
if (matchMedia("(pointer:fine)").matches && !reduce) {
  addEventListener("pointermove", e => { glow.style.left = e.clientX + "px"; glow.style.top = e.clientY + "px"; }, { passive: true });
} else glow.style.display = "none";

/* Particle network background */
(function particles() {
  const cv = $("#bg"), ctx = cv.getContext("2d");
  if (reduce || !ctx) return;
  let w, h, pts = [], on = true;
  const size = () => {
    w = cv.width = innerWidth; h = cv.height = innerHeight;
    pts = Array.from({ length: Math.min(70, Math.floor(w * h / 22000)) }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25 }));
  };
  addEventListener("resize", size); size();
  document.addEventListener("visibilitychange", () => on = !document.hidden);
  (function frame() {
    requestAnimationFrame(frame);
    if (!on) return;
    ctx.clearRect(0, 0, w, h);
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      ctx.fillStyle = "rgba(94,200,255,.55)"; ctx.beginPath(); ctx.arc(p.x, p.y, 1.4, 0, 6.283); ctx.fill();
    }
    for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) {
      const dx = pts[a].x - pts[b].x, dy = pts[a].y - pts[b].y, d = dx * dx + dy * dy;
      if (d < 12000) { ctx.strokeStyle = `rgba(56,189,248,${.16 * (1 - d / 12000)})`; ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); ctx.stroke(); }
    }
  })();
})();

/* Counter animation */
function counter(el, to) {
  if (reduce) { el.textContent = to; return; }
  let n = 0; const step = Math.max(1, Math.ceil(to / 30));
  const t = setInterval(() => { n = Math.min(to, n + step); el.textContent = n; if (n >= to) clearInterval(t); }, 40);
}

/* Load data from the Flask API */
async function getJSON(url) {
  const fb = window.FALLBACK && window.FALLBACK[url.split("/").pop()];
  if (location.protocol === "file:" && fb) return fb; /* double-clicked index.html: no server */
  try { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return await r.json(); }
  catch (e) { const f = window.FALLBACK && window.FALLBACK[url.split("/").pop()]; if (f) return f; throw e; } /* works without Flask too */
}

async function loadSkills() {
  try {
    const data = await getJSON("/api/skills");
    let total = 0;
    $("#skgrid").innerHTML = Object.entries(data).map(([group, items]) => {
      total += items.length;
      return `<div class="glass rv"><h3>${esc(group)}</h3><div class="icons">${items.map(([name, ab, col, tip], i) =>
        `<div class="ico" tabindex="0" data-tip="${esc(name + ": " + tip)}" style="--c:${esc(col)};animation-delay:${i * .35}s"><b>${esc(ab)}</b>${esc(name)}</div>`).join("")}</div></div>`;
    }).join("");
    return total;
  } catch { $("#skgrid").innerHTML = '<p class="sub">Could not load skills. Start the app with python app.py.</p>'; return 0; }
}

async function loadProjects() {
  try {
    const list = await getJSON("/api/projects");
    $("#pgrid").innerHTML = list.map(p => {
      const bg = p.image ? `url('static/images/${encodeURIComponent(p.image)}')` : `linear-gradient(135deg,${esc(p.grad[0])},${esc(p.grad[1])})`;
      const btn = p.link ? `<a class="btn" href="${esc(p.link)}" target="_blank" rel="noopener">View Project</a>` : `<span class="btn off" aria-disabled="true">Link coming soon</span>`;
      return `<article class="glass card tilt rv" data-c="${esc(p.cats.join(" "))}"><div class="thumbbox"><div class="thumb" style="background-image:${bg}">${p.image ? "" : esc(p.icon)}</div></div>
      <div class="in"><h3>${esc(p.title)}</h3><small>${esc(p.subtitle)}</small><p>${esc(p.desc)}</p>${p.tags.map(t => `<span class="chip">${esc(t)}</span>`).join("")}<br>${btn}</div></article>`;
    }).join("");
    return list.length;
  } catch { $("#pgrid").innerHTML = '<p class="sub">Could not load projects. Start the app with python app.py.</p>'; return 0; }
}

$("#filters").addEventListener("click", e => {
  const f = e.target.dataset.f; if (!f) return;
  $$("#filters button").forEach(b => b.classList.toggle("on", b === e.target));
  $$(".card").forEach(c => c.classList.toggle("hide", f !== "all" && !c.dataset.c.split(" ").includes(f)));
});

(async () => {
  const [tech, projects] = [await loadSkills(), await loadProjects()];
  $("#stats").innerHTML = `<div><b id="c1">0</b><small>Projects</small></div><div><b id="c2">0</b><small>Technologies</small></div><div><b id="c3">4</b><small>Focus areas</small></div>`;
  counter($("#c1"), projects); counter($("#c2"), tech);
  observeReveal(); bindTilt();
})();
observeReveal(); bindTilt();

/* Pin buttons scroll to sections */
$$(".pin[data-go]").forEach(b => b.onclick = () => document.getElementById(b.dataset.go).scrollIntoView());

/* If the backend is not running, open the visitor's email app instead */
function openMail(v) {
  const em = window.FALLBACK && window.FALLBACK.email; if (!em) return false;
  location.href = `mailto:${em}?subject=${encodeURIComponent("Portfolio message from " + v.name)}&body=${encodeURIComponent(v.message + "\n\nFrom: " + v.email)}`;
  return true;
}
/* Safety net: if any script error happens, never leave sections invisible */
addEventListener("error", () => document.documentElement.classList.add("fix"));

/* Contact form -> POST /api/contact */
$("#form").addEventListener("submit", async ev => {
  ev.preventDefault();
  const v = { name: $("#n").value.trim(), email: $("#e").value.trim(), message: $("#m").value.trim() };
  const err = {
    name: v.name.length >= 2 ? "" : "Please enter your name.",
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email) ? "" : "Enter a valid email.",
    message: v.message.length >= 10 ? "" : "Message must be at least 10 characters."
  };
  $("#en").textContent = err.name; $("#ee").textContent = err.email; $("#em").textContent = err.message;
  if (err.name || err.email || err.message) return;
  const btn = $("#send"), st = $("#status");
  btn.disabled = true; btn.textContent = "Sending..."; st.className = ""; st.textContent = "";
  try {
    const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
    const d = await r.json().catch(() => null);
    if (!d) throw new Error("backend not running");
    if (r.ok && d.ok) { st.className = "ok"; st.textContent = "Message received. Thank you, I will get back to you soon!"; $("#form").reset(); }
    else {
      if (d.errors) { $("#en").textContent = d.errors.name || ""; $("#ee").textContent = d.errors.email || ""; $("#em").textContent = d.errors.message || ""; }
      st.className = "bad"; st.textContent = d.error || "Please fix the highlighted fields.";
    }
  } catch { if (openMail(v)) { st.className = "ok"; st.textContent = "Backend is not running, so your email app was opened instead."; $("#form").reset(); } else { st.className = "bad"; st.textContent = "Server not reachable. Please email me directly."; } }
  btn.disabled = false; btn.textContent = "Send Message";
});
