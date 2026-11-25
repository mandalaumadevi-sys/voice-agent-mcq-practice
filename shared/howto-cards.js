/* "How to play" as short animated cards instead of a recorded video. Loaded after engine.js.
   A room opts in with ROOM.howcards = [{ art, title, icon, cap, ms }]; art = one of the scenes below.
   Each card plays a small looping animation of one game move, with a one-line caption. */
(function () {
  const R = window.ROOM, CARDS = R.howcards;
  if (!CARDS || R.howto) return;
  const $ = s => document.querySelector(s), esc = window.QR.esc;

  /* plays inside the engine's full-screen reel: our card stage replaces the video,
     the engine's bars, step pill and caption are reused */
  const vid = $('#howVid'), box = $('.reelbox');
  if (vid) { vid.play = () => Promise.resolve(); vid.pause = () => { }; }
  box.classList.add('hcards');
  const holder = document.createElement('div'); holder.className = 'hcholder';
  holder.innerHTML = '<div class="hcstage" id="hcStage"></div>';
  box.insertBefore(holder, vid ? vid.nextSibling : box.firstChild);
  const HAND = '<svg class="hchand" viewBox="0 0 64 72"><path d="M24 4c-3.3 0-6 2.7-6 6v29l-4.5-4.6c-2.5-2.5-6.4-2.5-8.8-.1-2.4 2.4-2.4 6.2-.1 8.7L20.5 60c3.6 4.6 8.4 8 14.8 8H41c10 0 17-7.5 17-17V33c0-3.3-2.7-6-6-6s-6 2.7-6 6v-2c0-3.3-2.7-6-6-6s-6 2.7-6 6v-2c0-3.3-2.7-6-6-6-1.5 0-2.8.5-4 1.4V10c0-3.3-2.7-6-6-6z" fill="#fff" stroke="#0b1020" stroke-width="3.2" stroke-linejoin="round"/></svg>';
  const ITEM = '<svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M10 3v-1h4v1M9 8h6M9 12h6M9 16h6"/></svg>';
  const LOCK = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  const inv = (n, hasAt) => `<div class="hcinv">${Array.from({ length: n }, (_, i) => `<span class="${i === hasAt ? 'got' : ''}">${i === hasAt ? ITEM : ''}</span>`).join('')}</div>`;

  /* each scene is plain HTML; the motion lives in howto-cards CSS (room-themed via CSS variables) */
  const ART = {
    dark: () => `<div class="hc hc-dark">
        <div class="hcwin"></div><div class="hcbox b1"></div><div class="hcbox b2"></div><div class="hcbox b3"></div>
        <div class="hclever"><i></i></div>
        <div class="hcbeam"></div><div class="hcpow">POWER ON</div></div>`,
    search: () => `<div class="hc hc-search">
        <div class="hcwin"></div><div class="hcbox b1 tgt"><span class="hclock">${LOCK}</span></div><div class="hcbox b2"></div><div class="hcbox b3"></div>
        ${HAND}
        <div class="hcpanel"><div class="hcph">${LOCK}<b>Locked</b><span><i class="t now"></i><i class="t"></i></span></div><div class="hcq"><em></em><em></em></div><div class="hcopts"><u></u><u></u><u></u></div></div></div>`,
    answer: () => `<div class="hc hc-answer">
        <div class="hcside ok"><small>FIRST TRY</small><div class="hcopts"><u></u><u class="pick"></u><u></u></div><div class="hcres">+1 point</div></div>
        <div class="hcside bad"><small>WRONG FIRST</small><div class="hcopts"><u class="pick"></u><u class="pick2"></u><u></u></div><div class="hcres r1">Try again</div><div class="hcres r2">Opens · no point</div></div></div>`,
    pickup: () => `<div class="hc hc-pickup">
        <div class="hcbox b1 open"></div><div class="hcbox b2"></div><div class="hcbox b3"></div>
        <div class="hcitem">${ITEM}<i class="ring"></i></div>${HAND}
        ${inv(5, -1)}<div class="hcslotfill">${ITEM}</div></div>`,
    use: () => `<div class="hc hc-use">
        <div class="hcbox b1 open"></div><div class="hcbox b2 tgt"><span class="hcglow"></span></div><div class="hcbox b3"></div>
        ${inv(5, 0)}<div class="hcfly">${ITEM}</div>${HAND}<div class="hcwork">It works!</div></div>`,
    escape: () => `<div class="hc hc-escape">
        <div class="hcdoor"><div class="hcleds"><i></i><i></i><i></i><i></i><i></i></div><div class="hcleaf l"></div><div class="hcleaf r"></div><div class="hclight"></div></div>
        <div class="hcstats"><span><small>TIME</small><b>09:12</b></span><span><small>FIRST-TRY</small><b>18/20</b></span></div></div>`
  };

  const stage = $('#hcStage'), cap = $('#vidCap'), pill = $('#reelStep'), bar = $('#vidBar'), ov = $('#howOv');
  bar.innerHTML = CARDS.map(() => '<span><i></i></span>').join('');
  /* caption words spring in one by one; *words like this* are highlighted */
  const words = txt => { let hi = false; return esc(txt).split(' ').map((w, i) => {
    const open = w.startsWith('*'), close = w.endsWith('*'); w = w.replace(/^\*|\*$/g, '');
    if (open) hi = true; const em = hi; if (close) hi = false;
    return `<span class="w" style="--i:${i}">${em ? `<em>${w}</em>` : w}</span>`;
  }).join(' '); };
  let k = 0, t0 = 0, raf = 0, playing = false, held = 0;

  function show(i) {
    k = i; t0 = performance.now(); held = 0;
    stage.innerHTML = ART[CARDS[i].art]();           // re-inserting the scene restarts its animation
    holder.classList.remove('flip'); void holder.offsetWidth; holder.classList.add('flip');
    pill.innerHTML = `<span>${CARDS[i].icon || ''}</span>${esc(CARDS[i].title)}<small>${i + 1}/${CARDS.length}</small>`;
    cap.innerHTML = words(CARDS[i].cap);
    [pill, cap].forEach(e => { e.classList.remove('in'); void e.offsetWidth; e.classList.add('in'); });
  }
  function finish() {
    playing = false; cancelAnimationFrame(raf);
    [...bar.children].forEach(b => b.firstChild.style.width = '100%');
    ov.classList.add('ended'); $('#enter').classList.add('glow');
  }
  function frame(now) {
    if (!playing) return;
    if (held) { t0 += now - held; held = now; }
    const ms = CARDS[k].ms || 5200, p = Math.min(1, (now - t0) / ms);
    [...bar.children].forEach((b, n) => b.firstChild.style.width = (n < k ? 100 : n === k ? p * 100 : 0) + '%');
    if (p >= 1) { if (k + 1 < CARDS.length) show(k + 1); else return finish(); }
    raf = requestAnimationFrame(frame);
  }
  function play(from) {
    cancelAnimationFrame(raf); playing = true;
    ov.classList.remove('ended'); $('#enter').classList.remove('glow');
    show(from); raf = requestAnimationFrame(frame);
  }
  const go = d => { if (!playing) return d < 0 && play(CARDS.length - 1); d > 0 && k + 1 >= CARDS.length ? finish() : play(Math.max(0, k + d)); };

  /* tap left / right to move, hold to pause (the engine adds these only for a video) */
  [['#tapL', -1], ['#tapR', 1]].forEach(([id, d]) => {
    let timer = null, hold = false;
    const el = $(id);
    el.addEventListener('pointerdown', () => { hold = false; timer = setTimeout(() => { hold = true; held = performance.now(); stage.classList.add('paused'); $('#reelPause').classList.add('on'); }, 260); });
    const up = () => { clearTimeout(timer); if (hold) { hold = false; held = 0; stage.classList.remove('paused'); $('#reelPause').classList.remove('on'); return true; } };
    el.addEventListener('pointerup', () => { if (!up()) go(d); $('#reelHint').classList.add('gone'); });
    el.addEventListener('pointerleave', up);
  });
  $('#reelSkip').addEventListener('click', finish);
  $('#howAgain').addEventListener('click', () => play(0));
  $('#enter').addEventListener('click', () => { playing = false; cancelAnimationFrame(raf); });
  document.addEventListener('keydown', e => {
    if (!ov.classList.contains('on')) return;
    if (e.key === 'ArrowRight') go(1);
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'Enter' && !playing) $('#enter').click();
  });
  /* start whenever the How-to-play screen opens (the engine shows the end card at once when there is no video) */
  new MutationObserver(() => { if (ov.classList.contains('on')) { if (!playing && !ov.dataset.hcseen) { ov.dataset.hcseen = 1; play(0); } } else { playing = false; cancelAnimationFrame(raf); delete ov.dataset.hcseen; } })
    .observe(ov, { attributes: true, attributeFilter: ['class'] });
  if (ov.classList.contains('on')) { ov.dataset.hcseen = 1; play(0); }
})();
