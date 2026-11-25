/* 3D depth layer for Lost in Orbit: camera tilt that follows the pointer,
   floating star dust at three depths, and a fly-through when the pod opens.
   The tilt goes flat while a lock panel, a pickup or a flying item is on screen,
   so click targets always line up with the scene. */
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function start() {
    const stage = document.getElementById('stage'), scene = document.getElementById('scene');
    if (!stage || !scene) return setTimeout(start, 200);

    /* star dust: three layers, nearer layers are bigger and move more */
    const dust = document.createElement('div'); dust.className = 'dust3d';
    [0, 1, 2].forEach(z => {
      const layer = document.createElement('div'); layer.className = 'dl dl' + z;
      for (let i = 0; i < 18 + z * 6; i++) {
        const p = document.createElement('i');
        p.style.left = Math.random() * 100 + '%'; p.style.top = Math.random() * 100 + '%';
        p.style.animationDelay = (-Math.random() * 14) + 's';
        layer.appendChild(p);
      }
      dust.appendChild(layer);
    });
    stage.appendChild(dust);
    if (reduce) return;

    let tx = 0, ty = 0, cx = 0, cy = 0, sc = 1, escaping = false;
    stage.addEventListener('pointermove', e => {
      const r = stage.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5;
    });
    stage.addEventListener('pointerleave', () => { tx = ty = 0; });

    const busy = () => document.getElementById('panel')?.classList.contains('on') ||
      document.querySelector('.pickup,.flyitem') || escaping;
    (function tick() {
      const flat = busy();
      const gx = flat ? 0 : tx, gy = flat ? 0 : ty;
      cx += (gx - cx) * .06; cy += (gy - cy) * .06; sc += ((flat ? 1 : 1.03) - sc) * .06;
      if (!stage.classList.contains('escape3d')) {
        scene.style.transform = `rotateY(${(cx * 3.2).toFixed(3)}deg) rotateX(${(-cy * 2.4).toFixed(3)}deg) scale(${sc.toFixed(4)})`;
      }
      dust.style.setProperty('--px', cx.toFixed(4)); dust.style.setProperty('--py', cy.toFixed(4));
      requestAnimationFrame(tick);
    })();

    /* when the hatch opens, the camera flies into the pod */
    const door = scene.querySelector('[data-obj="door"]');
    if (door) new MutationObserver(() => {
      if (door.classList.contains('open') && !escaping) {
        escaping = true;                                   // the camera levels out first, then flies in
        setTimeout(() => {
          scene.style.transform = 'none';
          const b = door.getBoundingClientRect(), r = scene.getBoundingClientRect();
          scene.style.transformOrigin = `${b.left + b.width / 2 - r.left}px ${b.top + b.height / 2 - r.top}px`;
          stage.classList.add('escape3d');
        }, 1100);
      }
    }).observe(door, { attributes: true, attributeFilter: ['class'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
