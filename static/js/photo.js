/* 3D tilt + chip parallax for the About photo (desktop with mouse only) */
(() => {
  const t = document.querySelector('.me-tilt');
  if (!t || !matchMedia('(hover:hover) and (prefers-reduced-motion:no-preference)').matches) return;
  const box = t.parentElement, set = (a, b, c, d) => {
    t.style.setProperty('--rx', a); t.style.setProperty('--ry', b);
    t.style.setProperty('--px', c); t.style.setProperty('--py', d);
  };
  box.addEventListener('pointermove', e => {
    const r = box.getBoundingClientRect(),
          x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    set((x * 12).toFixed(2) + 'deg', (-y * 10).toFixed(2) + 'deg', (x * -14).toFixed(1) + 'px', (y * -14).toFixed(1) + 'px');
  });
  box.addEventListener('pointerleave', () => set('0deg', '0deg', '0px', '0px'));
})();
