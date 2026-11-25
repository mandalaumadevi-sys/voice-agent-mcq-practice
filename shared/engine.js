/* Escape-room engine, shared by every room.
   A room page loads: questions.js, its scene.js (window.SCENE), its content.js (window.ROOM), then this file.
   Flow: intro -> dark room, find the switch -> objects in a chain (item -> lock -> questions -> item + clue) -> door key (+ keypad if ROOM.code is set) -> escaped. */
(function () {
  const R = window.ROOM, QR = window.QR;
  const $ = s => document.querySelector(s);
  const OBJ = Object.fromEntries(R.objects.map(o => [o.id, o]));
  const TOTAL = R.objects.reduce((n, o) => n + o.q.length, 0);
  const CIRCLED = ['', '①', '②', '③', '④', '⑤', '⑥'];
  const SAVE = 'escape-room:' + R.id;

  const S = {
    started: false, t0: 0, elapsed: 0, timer: null, light: false, escaped: false, sound: true,
    score: 0, tries: {}, missed: [], inv: [], sel: null, opened: new Set(),
    qi: {}, notes: [], used: {}, cur: null, idle: 0, busy: false, kpWrong: 0
  };

  /* ---------------- sound (synthesised, no files) ---------------- */
  const AU = (() => {
    let ctx;
    const get = () => ctx || (ctx = new (window.AudioContext || window.webkitAudioContext)());
    function tone(f, d, type = 'sine', v = .15, when = 0, slide) {
      if (!S.sound) return;
      try {
        const c = get(), t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.setValueAtTime(f, t);
        if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
        g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
        o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + .05);
      } catch (e) { }
    }
    function noise(d, v = .2, f = 1200) {
      if (!S.sound) return;
      try {
        const c = get(), b = c.createBuffer(1, Math.floor(c.sampleRate * d), c.sampleRate), a = b.getChannelData(0);
        for (let i = 0; i < a.length; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / a.length);
        const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
        s.buffer = b; fl.frequency.value = f; g.gain.value = v;
        s.connect(fl).connect(g).connect(c.destination); s.start();
      } catch (e) { }
    }
    return {
      wake: () => { try { get().resume(); } catch (e) { } },
      click: () => noise(.04, .25, 2600),
      ok: () => { tone(660, .15, 'triangle', .18); tone(990, .28, 'triangle', .15, .1); },
      bad: () => tone(150, .32, 'sawtooth', .1, 0, 80),
      unlock: () => { noise(.09, .35, 3200); [523, 659, 784, 1046].forEach((f, i) => tone(f, .4, 'triangle', .12, .1 + i * .08)); },
      pick: () => [880, 1320, 1760].forEach((f, i) => tone(f, .2, 'sine', .09, i * .06)),
      locked: () => { noise(.12, .4, 500); tone(85, .14, 'square', .07); },
      heart: () => { tone(58, .16, 'sine', .4); tone(52, .2, 'sine', .32, .2); },
      door: () => { noise(1.4, .22, 380); [262, 330, 392, 523, 659].forEach((f, i) => tone(f, 1.8, 'sine', .09, .4 + i * .12)); },
      sw: () => { noise(.03, .6, 4500); tone(2200, .03, 'square', .05); },
      beep: () => tone(1250, .06, 'square', .05),
      whoosh: () => noise(.35, .18, 900),
      snap: () => { noise(.05, .6, 3500); tone(1800, .05, 'square', .05, .05); },
      plug: () => { noise(.05, .5, 3000); tone(120, .6, 'sawtooth', .04, .1); [392, 523, 659, 784].forEach((f, i) => tone(f, .25, 'sine', .08, .5 + i * .18)); },
      key: () => { noise(.04, .5, 5000); noise(.04, .5, 4000); setTimeout(() => { noise(.06, .6, 2500); tone(900, .05, 'square', .05); }, 600); setTimeout(() => noise(.25, .3, 700), 1100); },
      tape: () => { noise(.08, .5, 1500); setTimeout(() => { noise(.1, .6, 900); tone(80, .1, 'square', .1); }, 400); setTimeout(() => [0, 1, 2, 3].forEach(i => tone(440, .08, 'square', .03, i * .25)), 900); },
      chip: () => { for (let i = 0; i < 18; i++) tone(1400 + Math.random() * 900, .05, 'square', .035, i * .07, 2400); },
      screw: () => [0, 1, 2, 3].forEach(i => { tone(2200, .25, 'sawtooth', .02, i * .5, 2600); setTimeout(() => noise(.05, .4, 3500), i * 500 + 300); }),
      card: () => { noise(.3, .25, 2500); [660, 880, 1320].forEach((f, i) => tone(f, .14, 'square', .04, .5 + i * .12)); },
      paper: () => { for (let i = 0; i < 6; i++) setTimeout(() => noise(.06, .25, 5000), i * 90); tone(300, .5, 'triangle', .05, .7, 600); },
      buzz: () => tone(110, .4, 'square', .07)
    };
  })();

  /* ---------------- build the page ---------------- */
  const IC = {
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    notes: '<path d="M5 3h11l3 3v15H5z"/><path d="M9 9h6M9 13h6M9 17h4"/>',
    hint: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    mute: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
    key: '<circle cx="7.5" cy="12" r="4"/><path d="M11.5 12H21M17 12v3M20 12v2"/>',
    box: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>',
    door: '<path d="M5 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17"/><path d="M3 21h18M13 12h.01"/>'
  };
  const svg = (p, extra = '') => `<svg viewBox="0 0 24 24" ${extra}>${p}</svg>`;

  document.body.insertAdjacentHTML('beforeend', `
<div id="app">
  <header id="hud">
    <div class="brand"><b>${QR.esc(R.title.toUpperCase())}</b><span>Escape Room · ${QR.esc(R.session)}</span></div>
    <div class="stats">
      <div class="stat time"><small>TIME</small><b id="time">00:00</b></div>
      <div class="stat score"><small>FIRST-TRY</small><b id="score">0/${TOTAL}</b></div>
      <div class="stat"><small>LOCKS</small><b id="locks">0/${R.objects.length}</b></div>
    </div>
    <div class="tools">
      <button id="howBtn" title="How to play">${svg(IC.play)}<span>How to play</span></button>
      <button id="notesBtn" title="Notes">${svg(IC.notes)}<span>Notes</span><i class="count" id="noteCount" hidden>0</i></button>
      <button id="hintBtn" title="Hint">${svg(IC.hint)}<span>Hint</span></button>
      <button id="soundBtn" title="Sound">${svg(IC.sound)}</button>
    </div>
  </header>
  <main id="stage">
    <div id="scene">${window.SCENE}</div>
    <div id="dim"></div>
    <div id="dark"></div>
    <div id="glowmark"></div>
    <div id="say"></div>
    <aside id="panel">
      <div class="ph">
        <div class="lockico">${svg(IC.lock)}</div>
        <div><div class="goal" id="pGoal"></div><h3 id="pTitle"></h3></div>
        <div class="tumblers" id="pTum"></div>
        <button class="back" id="pBack">Step back</button>
      </div>
      <div class="pq" id="pQ"></div>
      <div class="area" id="pArea"></div>
      <div class="pfoot"><div class="fb" id="pFb"></div><div class="acts" id="pAct"></div></div>
    </aside>
  </main>
  <footer id="inv"><span class="lbl">INVENTORY</span><div id="slots"></div><div id="selName"></div></footer>
</div>

<div class="ov on" id="signOv"><form class="signbox pop" id="signForm" autocomplete="on">
  <span class="tag">ESCAPE ROOM · ${QR.esc(R.session.toUpperCase())}</span>
  <h1>${QR.esc(R.title)}</h1>
  <p class="signsub">Sign in so your progress is saved.</p>
  <label>User ID<input id="fUser" name="user_id" required maxlength="60" autocomplete="username"></label>
  <label>Roll number<input id="fRoll" name="roll_no" required maxlength="40"></label>
  <label>Name<input id="fName" name="name" required maxlength="80" autocomplete="name"></label>
  <div class="signerr" id="signErr"></div>
  <button class="btn" id="signGo" type="submit">Continue</button>
  <div class="signnote" id="signNote"></div>
</form></div>

<div class="ov" id="blockOv"><div class="blockbox pop" id="blockBox"></div></div>

<div class="ov reel" id="howOv"><div class="reelbox pop">
  <video id="howVid" muted playsinline preload="auto"></video>
  <div class="reelshade"></div>
  <div class="reelbars" id="vidBar"></div>
  <div class="reeltop"><button class="reelskip" id="reelSkip">Skip ▸</button></div>
  <div class="reeltap l" id="tapL"></div><div class="reeltap r" id="tapR"></div>
  <div class="reelcap"><div class="reelstep" id="reelStep"></div><div class="reeltext" id="vidCap"></div></div>
  <div class="reelhint" id="reelHint">tap ▸ next · hold to pause</div>
  <div class="reelpause" id="reelPause">❚❚</div>
  <button class="reelplay" id="reelPlay"><span>▶</span>Tap to play</button>
  <div class="reelend" id="reelEnd">
    <span class="tag">ESCAPE ROOM · ${QR.esc(R.session.toUpperCase())}</span>
    <h2>${QR.esc(R.title)}</h2>
    <p class="tagline">${QR.esc(R.tagline || '')}</p>
    <div class="me"><div class="wholine" id="whoLine"></div><div class="attline" id="attLine"></div><div id="runsLine"></div></div>
    <div class="vidnote" id="vidNote"></div>
    <div class="introacts"><span class="howerr" id="howErr"></span><button class="btn ghost" id="howAgain">↺ Watch again</button><button class="btn" id="enter">Enter the room</button></div>
  </div>
</div></div>

<div class="ov" id="noteOv"><div class="note pop" id="note"></div></div>
<div class="ov" id="journalOv"><div class="journal pop" id="journal"></div></div>
<div class="ov" id="kpOv"><div class="kp pop">
  <h3>EXIT CODE</h3>
  <div class="kpd" id="kpd"><span></span><span></span><span></span><span></span></div>
  <div class="kpk" id="kpk"></div>
  <div class="kpmsg" id="kpmsg">Your notes hold one digit per wall.</div>
  <button class="close" id="kpClose">Step back</button>
</div></div>
<div class="ov" id="result"></div>
<div id="flash"></div>
<canvas id="fx"></canvas>`);

  const sceneSvg = $('#scene svg');
  const node = id => sceneSvg.querySelector(`[data-obj="${id}"]`);

  /* ---------------- helpers ---------------- */
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  let sayT;
  function say(t) { const b = $('#say'); b.innerHTML = QR.inline(t); b.classList.add('on'); clearTimeout(sayT); sayT = setTimeout(() => b.classList.remove('on'), 4200); }
  function nope(el) { if (!el) return; el.classList.remove('nope'); void el.getBBox?.(); el.getBoundingClientRect(); el.classList.add('nope'); setTimeout(() => el.classList.remove('nope'), 500); }
  function load() { try { return JSON.parse(localStorage.getItem(SAVE)) || {}; } catch (e) { return {}; } }
  function save(v) { try { localStorage.setItem(SAVE, JSON.stringify(v)); } catch (e) { } }
  const zoneOf = id => R.zones.findIndex(z => z.objs.includes(id));

  function hud() {
    $('#score').textContent = `${S.score}/${TOTAL}`;
    $('#locks').textContent = `${S.opened.size}/${R.objects.length}`;
    $('#noteCount').hidden = !S.notes.length; $('#noteCount').textContent = S.notes.length;
  }

  /* ---------------- intro ---------------- */
  /* ---------------- sign in: user ID, roll number, name; attempts are checked with the database ---------------- */
  const STU = 'escape-student';
  try { const v = JSON.parse(localStorage.getItem(STU)) || {}; $('#fUser').value = v.user_id || ''; $('#fRoll').value = v.roll_no || ''; $('#fName').value = v.name || ''; } catch (e) { }
  if (!TRACK.on) $('#signNote').textContent = 'Practice mode: the database is not set up, so this run is not saved.';
  /* opened from the portal with the student in the link: ?user_id=…&roll_no=…&name=… → no typing, fields locked */
  const qp = new URLSearchParams(location.search), pick = (...k) => k.map(x => qp.get(x)).find(v => v && v.trim());
  const portal = { user_id: pick('user_id', 'userId', 'uid'), roll_no: pick('roll_no', 'roll', 'rollNo'), name: pick('name', 'student_name') };
  let saved = null; try { saved = JSON.parse(localStorage.getItem(STU)); } catch (e) { }
  if (portal.user_id && portal.roll_no && portal.name) {
    $('#fUser').value = portal.user_id; $('#fRoll').value = portal.roll_no; $('#fName').value = portal.name;
    ['#fUser', '#fRoll', '#fName'].forEach(f => $(f).readOnly = true);
    $('.signsub').textContent = `Signed in from the portal as ${portal.name}.`;
    setTimeout(() => $('#signForm').requestSubmit(), 300);
  } else if (saved && saved.user_id && saved.roll_no && saved.name) {
    $('.signsub').textContent = `Welcome back, ${saved.name}…`;     // signed in before on this device: no form again
    setTimeout(() => $('#signForm').requestSubmit(), 300);
  }
  function switchStudent() {
    try { localStorage.removeItem(STU); } catch (e) { }
    ['#fUser', '#fRoll', '#fName'].forEach(f => { $(f).value = ''; $(f).readOnly = false; });
    $('.signsub').textContent = 'Sign in so your progress is saved.';
    $('#howOv').classList.remove('on'); vid.pause(); $('#signOv').classList.add('on');
  }
  $('#signForm').onsubmit = async e => {
    e.preventDefault();
    const st = { user_id: $('#fUser').value.trim(), roll_no: $('#fRoll').value.trim(), name: $('#fName').value.trim() };
    if (!st.user_id || !st.roll_no || !st.name) { $('#signErr').textContent = 'Fill in all three.'; return; }
    $('#signGo').disabled = true; $('#signErr').textContent = ''; $('#signGo').textContent = 'Checking…';
    try {
      const a = TRACK.on ? await TRACK.check(st.user_id, st.roll_no, st.name, R.id) : null;
      S.student = st; S.att = a;
      try { localStorage.setItem(STU, JSON.stringify(st)); } catch (er) { }
      if (a && a.attempts_left <= 0) return showBlocked(a);
      $('#signOv').classList.remove('on'); intro();
    } catch (er) {
      $('#signErr').textContent = /fetch|network/i.test(er.message) ? 'Can’t reach the server. Check your internet and try again.' : er.message;
    } finally { $('#signGo').disabled = false; $('#signGo').textContent = 'Continue'; }
  };
  function showBlocked(a) {
    ['signOv', 'howOv'].forEach(id => $('#' + id).classList.remove('on'));
    $('#blockBox').innerHTML = `<div class="lockbig">${svg(IC.lock)}</div>
      <h2>No attempts left</h2>
      <p>${QR.esc(S.student.name)}, you have used all <b>${a.max_attempts}</b> attempts for ${QR.esc(R.title)}.</p>
      ${a.escapes ? `<p class="bestrow">Your best: <b>${a.best_score}/${TOTAL}</b> first-try · <b>${fmt(a.best_time)}</b></p>` : ''}
      <p class="muted">Ask your instructor if you need more attempts.</p>`;
    $('#blockOv').classList.add('on');
  }
  const HIST = 'escape-history:' + R.id;
  const localRuns = () => { try { return JSON.parse(localStorage.getItem(HIST)) || []; } catch (e) { return []; } };
  /* best attempt = highest first-try score among escaped runs; a faster time wins a tie */
  const bestRun = runs => (runs || []).filter(r => r.status === 'escaped').sort((a, b) => b.score - a.score || a.elapsed_sec - b.elapsed_sec)[0] || null;
  function runsStrip(runs, current, compact) {
    if (!runs || !runs.length) return '';
    const last = runs.slice(-10), best = bestRun(runs);
    return `<div class="runs"><b>Your attempts</b>${best && !compact ? `<div class="bestline">★ Best: <b>${best.score}/${best.total}</b> first-try in <b>${fmt(best.elapsed_sec)}</b> · attempt #${best.attempt_no}</div>` : ''}<div class="runchips">${last.map(r => {
      const esc_ = r.status === 'escaped', isBest = best && r.attempt_no === best.attempt_no;
      return `<div class="runchip ${esc_ ? 'esc' : 'left'} ${r.attempt_no === current ? 'now' : ''} ${isBest ? 'best' : ''}" title="${isBest ? 'Your best attempt' : esc_ ? 'Escaped' : 'Left early'}">${isBest ? '<em>★ BEST</em>' : ''}
        <i>#${r.attempt_no}</i><span>${esc_ ? `${r.score}/${r.total}` : `${r.locks_opened}/${r.locks_total} 🔒`}</span><small>${esc_ ? fmt(r.elapsed_sec) : 'left early'}</small></div>`;
    }).join('')}</div></div>`;
  }
  function intro() {
    const a = S.att, runs = a ? a.runs : localRuns();
    $('#whoLine').innerHTML = `<b>${QR.esc(S.student.name)}</b> · ${QR.esc(S.student.roll_no)} <button class="linkbtn" id="switchBtn">Not you?</button>`;
    $('#switchBtn').onclick = switchStudent;
    $('#attLine').innerHTML = !a ? '' : a.is_test ? '<span class="testtag">TEST ACCOUNT</span> no attempt limit' : `Attempt <b>${a.attempts_used + 1}</b> of ${a.max_attempts}`;
    $('#runsLine').innerHTML = runsStrip(runs, null, true);
    openHow();
  }

  /* ---------------- how to play: a reel (story bars, one big caption per step, tap / hold) ---------------- */
  const HT = R.howto, vid = $('#howVid');
  let stepNow = -1, ended = false;
  /* caption words spring in one by one; *words like this* are highlighted (can span several words) */
  const words = txt => { let hi = false; return QR.esc(txt).split(' ').map((w, i) => {
    const open = w.startsWith('*'), close = w.endsWith('*'); w = w.replace(/^\*|\*$/g, '');
    if (open) hi = true; const em = hi; if (close) hi = false;
    return `<span class="w" style="--i:${i}">${em ? `<em>${w}</em>` : w}</span>`;
  }).join(' '); };
  function showStep(k) {
    if (k === stepNow) return; stepNow = k;
    const st = HT.steps[k];
    $('#reelStep').innerHTML = `<span>${st.icon || ''}</span>${QR.esc(st.title)}<small>${k + 1}/${HT.steps.length}</small>`;
    $('#vidCap').innerHTML = words(st.cap);
    ['#reelStep', '#vidCap'].forEach(id => { const e = $(id); e.classList.remove('in'); void e.offsetWidth; e.classList.add('in'); });
  }
  function bars() {
    const t = vid.currentTime; let k = 0;
    HT.steps.forEach((st, i) => { if (t >= st.t) k = i; });
    [...$('#vidBar').children].forEach((b, i) => {
      const a = HT.steps[i].t, z = i + 1 < HT.steps.length ? HT.steps[i + 1].t : vid.duration || a + 4;
      b.firstChild.style.width = (ended ? 1 : Math.max(0, Math.min(1, (t - a) / (z - a)))) * 100 + '%';
    });
    if (!ended) showStep(k);
  }
  function endCard() { ended = true; clearTimeout(watch); playBtn(false); vid.pause(); if (!vidBroken) bars(); $('#howOv').classList.add('ended'); $('#enter').classList.add('glow'); $('#howAgain').hidden = vidBroken; }
  /* if the browser blocks autoplay, a big Play button appears; if the clip can't load, go to the end card */
  let vidBroken = false, watch = null;
  const playBtn = on => $('#reelPlay').classList.toggle('on', on);
  function tryPlay() {
    const pr = vid.play(); if (pr) pr.then(() => playBtn(false)).catch(() => playBtn(true));
    clearTimeout(watch); watch = setTimeout(() => { if (vid.paused && !ended && !$('#reelPause').classList.contains('on')) playBtn(true); }, 1200);
  }
  function playFrom(t) {
    if (vidBroken) return endCard();
    ended = false; $('#howOv').classList.remove('ended'); $('#enter').classList.remove('glow');
    try { vid.currentTime = t; } catch (e) { }
    tryPlay();
  }
  function go(d) {
    if (ended) { if (d < 0) playFrom(HT.steps[HT.steps.length - 1].t + .05); return; }
    const k = Math.max(0, stepNow);
    if (d > 0) { if (k + 1 >= HT.steps.length) return endCard(); showStep(k + 1); return playFrom(HT.steps[k + 1].t + .05); }
    const back = vid.currentTime - HT.steps[k].t > 1.5 || k === 0 ? k : k - 1;     // first tap restarts the step, a second goes back
    stepNow = -1; showStep(back); playFrom(HT.steps[back].t + .05);
  }
  if (HT) {
    vid.src = HT.video;
    $('#vidBar').innerHTML = HT.steps.map(() => '<span><i></i></span>').join('');
    vid.addEventListener('timeupdate', bars);
    vid.addEventListener('ended', endCard);
    vid.addEventListener('playing', () => playBtn(false));
    vid.addEventListener('error', () => {
      vidBroken = true; playBtn(false);
      $('#vidNote').textContent = 'The how-to video can’t play in this browser. Open the game in Chrome or Edge to watch it.';
      endCard();
    });
    $('#reelPlay').onclick = e => { e.stopPropagation(); AU.wake(); playBtn(false); tryPlay(); };
    /* tap left / right to move, hold anywhere to pause */
    ['#tapL', '#tapR'].forEach((id, side) => {
      let hold = null, held = false;
      $(id).addEventListener('pointerdown', () => { held = false; hold = setTimeout(() => { held = true; vid.pause(); $('#reelPause').classList.add('on'); }, 260); });
      $(id).addEventListener('pointerup', () => {
        clearTimeout(hold);
        if (held) { $('#reelPause').classList.remove('on'); tryPlay(); }
        else { AU.click(); go(side ? 1 : -1); }
        $('#reelHint').classList.add('gone');
      });
      $(id).addEventListener('pointerleave', () => { clearTimeout(hold); if (held) { held = false; $('#reelPause').classList.remove('on'); tryPlay(); } });
    });
    $('#reelSkip').onclick = () => { AU.click(); endCard(); };
    document.addEventListener('keydown', e => {
      if (!$('#howOv').classList.contains('on')) return;
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === ' ') { e.preventDefault(); vid.paused ? tryPlay() : vid.pause(); }
      if (e.key === 'Enter' && ended) $('#enter').click();
    });
  }
  let pausedAt = 0;
  function openHow() {
    $('#howOv').classList.add('on');
    $('#howOv').classList.toggle('ingame', S.started);
    $('#enter').textContent = S.started ? 'Back to the room' : 'Enter the room';
    if (S.started && !S.escaped) pausedAt = Date.now();
    stepNow = -1; $('#reelHint').classList.remove('gone');
    if (HT) playFrom(0); else endCard();
  }
  $('#howAgain').onclick = () => { AU.click(); stepNow = -1; playFrom(0); };
  $('#howBtn').onclick = () => { AU.click(); openHow(); };
  $('#enter').onclick = () => {
    vid.pause();
    if (!S.started) return startRoom();
    $('#howOv').classList.remove('on');
    if (pausedAt) { S.t0 += Date.now() - pausedAt; pausedAt = 0; }
  };
  let starting = false;
  async function startRoom() {
    if (starting || S.started) return;
    if (TRACK.on) {
      starting = true;
      try {
        const j = await TRACK.start(S.student.user_id, R.id, TOTAL, R.objects.length);
        if (j.blocked) { starting = false; return showBlocked(Object.assign({}, S.att, j, { attempts_left: 0 })); }
        S.att = Object.assign({}, S.att, j);
        $('.brand span').textContent = S.att.is_test ? `${S.student.name} · TEST ACCOUNT · run ${j.attempt_no}` : `${S.student.name} · Attempt ${j.attempt_no} of ${j.max_attempts}`;
      } catch (e) {
        starting = false;
        $('#howOv').classList.add('on');
        $('#enter').textContent = 'Try again';
        say('Can’t reach the server. Check your internet, then tap Try again.');
        $('#howErr') && ($('#howErr').textContent = 'Can’t reach the server. Check your internet and try again.');
        return;
      }
      starting = false;
    }
    $('#howOv').classList.remove('on');
    AU.wake(); AU.sw();
    S.started = true; S.t0 = Date.now();
    S.timer = setInterval(tick, 1000);
    say((R.lines && R.lines.dark) || 'Pitch dark. Something on the wall is glowing green…');
  }

  function tick() {
    if (S.escaped || pausedAt) return;
    S.elapsed = Math.floor((Date.now() - S.t0) / 1000);
    $('#time').textContent = fmt(S.elapsed);
    const late = S.elapsed >= R.target - 120;
    $('.stat.time').classList.toggle('late', late);
    if (late && S.elapsed % 2 === 0) AU.heart();
    if (++S.idle === 45) hint(true);
    if (S.elapsed % 20 === 0) TRACK.update(S.opened.size, S.cur ? S.cur.id : null, S.elapsed);
  }

  /* the switch's glow sticker shows through the dark */
  function placeGlow() {
    const g = $('#glowmark'), sw = node('switch'); if (!g || !sw) return;
    const r = sw.getBoundingClientRect(), st = $('#stage').getBoundingClientRect();
    Object.assign(g.style, { left: r.left - st.left + 'px', top: r.top - st.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  }
  addEventListener('resize', placeGlow); requestAnimationFrame(placeGlow);

  /* flashlight follows the pointer while the room is dark */
  $('#stage').addEventListener('pointermove', e => {
    if (S.light) return;
    const r = $('#stage').getBoundingClientRect();
    $('#dark').style.setProperty('--x', (e.clientX - r.left) + 'px');
    $('#dark').style.setProperty('--y', (e.clientY - r.top) + 'px');
  });

  /* ---------------- clicks in the room ---------------- */
  sceneSvg.addEventListener('click', e => {
    if (!S.started || S.escaped || S.busy) return;
    S.idle = 0;
    const o = e.target.closest('[data-obj]'), d = e.target.closest('[data-dec]');
    if (!S.light) {
      if (o && o.dataset.obj === 'switch') return lightsOn();
      AU.locked(); return say((R.lines && R.lines.tooDark) || 'Too dark to see that. Find the light switch.');
    }
    if (d) { AU.click(); return say(R.decor[d.dataset.dec] || 'Nothing here.'); }
    if (!o) return;
    const id = o.dataset.obj;
    if (id === 'switch') { AU.sw(); return say((R.lines && R.lines.switchOn) || 'The lights are on. Better leave them that way.'); }
    clickObj(OBJ[id]);
  });

  function lightsOn() {
    S.light = true; AU.sw();
    node('switch').classList.add('on'); $('#glowmark').remove();
    const dk = $('#dark'); dk.classList.add('flicker');
    setTimeout(() => { dk.classList.remove('flicker'); dk.classList.add('off'); }, 900);
    setDim();
    say((R.lines && R.lines.light) || `Light! A desk, a mic, a big machine… and a locked door. Start with the desk drawer.`);
  }
  function setDim() { $('#dim').style.opacity = Math.max(.15, 1 - .22 * zonesDone()); }
  const zonesDone = () => R.zones.filter(z => z.objs.every(id => S.opened.has(id))).length;
  const prevOpen = o => { const k = R.objects.indexOf(o); return k === 0 || S.opened.has(R.objects[k - 1].id); };

  function clickObj(o) {
    const el = node(o.id);
    if (S.opened.has(o.id)) {
      if (o.id === 'door' && R.code) return openKeypad();
      AU.click(); return say(`The ${o.name.toLowerCase()} is open. Nothing more here.`);
    }
    const left = missing(o);
    if (!prevOpen(o) || (left.length && !left.includes(S.sel))) {
      AU.locked(); nope(el);
      return say(S.sel ? `The ${R.items[S.sel].name} doesn’t work here.` : (prevOpen(o) && used(o).size ? o.more || o.locked : o.locked));
    }
    if (left.length) return useItem(o, S.sel);
    if (S.sel) select(null);
    AU.click(); openLock(o);
  }

  /* the item flies from the inventory to its spot, then the object's own animation plays */
  function toScreen(x, y) { const pt = sceneSvg.createSVGPoint(); pt.x = x; pt.y = y; return pt.matrixTransform(sceneSvg.getScreenCTM()); }
  /* needs can be one item or a list; each used item plays its own animation (o.uses[item] overrides at/use/useMs/act) */
  const needsOf = o => [].concat(o.needs || []);
  const used = o => S.used[o.id] || (S.used[o.id] = new Set());
  const missing = o => needsOf(o).filter(n => !used(o).has(n));
  function useItem(o, item) {
    S.busy = true;
    const cfg = Object.assign({}, o, (o.uses || {})[item]);
    const k = S.inv.indexOf(item), slot = slots()[k], from = slot.getBoundingClientRect();
    select(null);
    if (!o.keep) slot.classList.add('used');
    const at = cfg.at ? toScreen(cfg.at[0], cfg.at[1]) : (r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 }))(node(o.id).getBoundingClientRect());
    const f = document.createElement('div'); f.className = 'flyitem'; f.innerHTML = svg(R.items[item].icon);
    f.style.left = f.style.top = '0'; document.body.appendChild(f);
    AU.whoosh();
    f.animate([
      { transform: `translate(${from.left}px,${from.top}px) scale(1)` },
      { transform: `translate(${(from.left + at.x) / 2 - 31}px,${Math.min(from.top, at.y) - 120}px) scale(1.25)`, offset: .5 },
      { transform: `translate(${at.x - 31}px,${at.y - 31}px) scale(.45)`, opacity: .2 }
    ], { duration: 950, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' }).onfinish = () => {
      f.remove();
      used(o).add(item); sceneSvg.classList.add('pow-' + item);
      const ready = !missing(o).length;
      if (ready) { node(o.id).classList.add('powered'); sceneSvg.classList.add('pow-' + o.id); }
      (AU[cfg.use] || AU.pick)();
      say(cfg.act || `You use the ${R.items[item].name}.`);
      setTimeout(() => { S.busy = false; if (ready) openLock(o); }, cfg.useMs || 1600);
    };
  }

  /* ---------------- inventory ---------------- */
  const slots = () => [...document.querySelectorAll('.slotbox')];
  function drawSlots() {
    const n = Object.keys(R.items).length;
    $('#slots').innerHTML = Array.from({ length: n }, (_, i) => `<div class="slotbox" data-i="${i}"></div>`).join('');
    slots().forEach(s => s.onclick = () => {
      const id = S.inv[+s.dataset.i];
      if (!id || s.classList.contains('used')) return;
      AU.click(); select(S.sel === id ? null : id);
    });
  }
  function select(id) {
    S.sel = id;
    slots().forEach((s, i) => s.classList.toggle('sel', !!id && S.inv[i] === id));
    $('#selName').innerHTML = id ? `Holding <b>${QR.esc(R.items[id].name)}</b> · tap where it fits` : '';
  }
  function addItem(id, from) {
    const k = S.inv.length; S.inv.push(id);
    const slot = slots()[k], to = slot.getBoundingClientRect();
    const f = document.createElement('div'); f.className = 'flyitem'; f.innerHTML = svg(R.items[id].icon);
    f.style.left = f.style.top = '0';
    document.body.appendChild(f);
    const x0 = from.left + from.width / 2 - 31, y0 = from.top + from.height / 2 - 31;
    f.animate([
      { transform: `translate(${x0}px,${y0}px) scale(.4)`, opacity: 0 },
      { transform: `translate(${x0}px,${y0 - 60}px) scale(1.3)`, opacity: 1, offset: .35 },
      { transform: `translate(${to.left}px,${to.top}px) scale(1)`, opacity: 1 }
    ], { duration: 900, easing: 'cubic-bezier(.5,0,.2,1)' }).onfinish = () => {
      f.remove(); slot.classList.add('has'); slot.innerHTML = svg(R.items[id].icon);
      slot.animate([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 300 });
      AU.pick();
    };
    f.style.left = f.style.top = '0';
  }

  /* ---------------- lock panel ---------------- */
  function openLock(o) {
    S.cur = o;
    $('#panel').classList.add('on'); $('#stage').classList.add('focus');
    drawQ();
  }
  function closeLock() { $('#panel').classList.remove('on'); $('#stage').classList.remove('focus'); S.cur = null; }
  $('#pBack').onclick = () => { AU.click(); closeLock(); };

  const HOW = {
    cloze: 'Drag each word into a gap, or tap words in order. Tap a gap to empty it.',
    terminal: 'Drag the right line into the terminal, then press Run.',
    swipe: 'Drag each card to TRUE or FALSE, or tap a side. Tap a placed card to take it back.',
    dial: 'Turn the knob, or tap a number.',
    flow: 'Drag the parts into the empty boxes, or tap them in order.',
    spot: 'Tap the part of the code.',
    dragto: 'Drag it onto the right place, or tap the place.',
    sort: 'Drag each card into a box, or tap a card and then a box.',
    match: 'Drag a wire from each plug to the right socket.',
    fill: 'Drag the code into the blanks, or tap it in order. Tap a blank to empty it.',
    order: 'Drag the steps into order, or tap them in order.',
    bug: 'Tap the line with the bug.',
    markup: 'Tap the pieces in order to build the string. Tap a placed piece to take it back.',
    typein: 'Click the terminal, type your answer and press Enter.',
    pickmany: 'Tap every card that fits, then lock in.'
  };
  function drawQ() {
    const o = S.cur, i = S.qi[o.id] || 0, q = o.q[i], qid = o.id + i;
    $('#pGoal').textContent = R.zones[zoneOf(o.id)].goal;
    $('#pTitle').textContent = o.name;
    $('#pTum').innerHTML = o.q.map((_, k) => `<i class="${k < i ? 'open' : k === i ? 'now' : ''}"></i>`).join('');
    const tries = S.tries[qid] || 0;
    $('#pQ').innerHTML = `<span class="qn">TUMBLER ${i + 1} OF ${o.q.length}${tries ? ' · RETRY' : ''}</span>${QR.inline(q.p)}${HOW[q.t] ? `<span class="how1">${HOW[q.t]}</span>` : ''}`;
    const area = $('#pArea'), act = $('#pAct'), fb = $('#pFb');
    area.innerHTML = ''; act.innerHTML = ''; fb.className = 'fb'; fb.innerHTML = '';
    if (q.code && !['fill', 'bug', 'spot'].includes(q.t)) area.appendChild(QR.codeBlock(q.code));
    const box = document.createElement('div'); area.appendChild(box);
    let answered = false;
    QR.render(q, { area: box, actions: act, done: ok => { if (answered) return; answered = true; answer(o, i, ok); } });
    area.scrollTop = 0;
  }

  function answer(o, i, ok) {
    const q = o.q[i], qid = o.id + i, first = !S.tries[qid];
    S.tries[qid] = (S.tries[qid] || 0) + 1;
    if (first && ok) S.score++;
    if (first && !ok) S.missed.push({ obj: o.name, p: q.p });
    TRACK.answer(o.id, i, q.p.replace(/`/g, ''), ok, first, S.tries[qid]);
    hud();
    const fb = $('#pFb'), act = $('#pAct');
    act.innerHTML = '';
    const btn = (label, fn) => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = label; b.onclick = fn; act.appendChild(b); b.focus(); };
    if (ok) {
      AU.ok();
      const t = $('#pTum').children[i]; t.classList.remove('now'); t.classList.add('open');
      fb.className = 'fb good';
      fb.innerHTML = `<b>${first ? 'Click! +1 · first try' : 'Click! It opens · no point this time'}</b>${QR.inline(q.why)}`;
      const last = i === o.q.length - 1;
      btn(last ? `Open the ${o.name.toLowerCase()}` : 'Next tumbler', () => {
        S.qi[o.id] = i + 1;
        if (last) { closeLock(); complete(o); } else { AU.click(); drawQ(); }
      });
    } else {
      AU.bad(); nope($('#panel'));
      fb.className = 'fb bad';
      fb.innerHTML = `<b>${first ? 'Locked. This one won’t score now.' : 'Still locked.'}</b>${QR.inline(q.hint)}`;
      btn('Try again', () => { AU.click(); drawQ(); });
    }
  }

  /* ---------------- an object opens ---------------- */
  function complete(o) {
    S.opened.add(o.id); S.busy = true;
    const el = node(o.id);
    el.classList.add('done'); sceneSvg.classList.add('got-' + o.id);
    AU.unlock();
    const z = zoneOf(o.id), zone = R.zones[z], zoneDone = zone.objs.every(id => S.opened.has(id));
    if (zoneDone) { const led = sceneSvg.querySelector(`.led[data-z="${z}"]`); if (led) led.classList.add('on'); setDim(); }
    hud();
    if (o.id !== 'door') TRACK.update(S.opened.size, (R.objects[R.objects.indexOf(o) + 1] || {}).id || null, Math.floor((Date.now() - S.t0) / 1000));
    if (o.id === 'door') { setTimeout(() => { S.busy = false; if (R.code) { say('The lock clicks. Now the keypad…'); openKeypad(); } else escape(); }, 1300); return; }
    S.notes.push({ clue: o.clue, digit: o.digit });
    hud();
    const gift = o.from ? sceneSvg.querySelector(o.from) : el.querySelector('.gift');
    setTimeout(() => burst(gift || el), 500);
    const it = o.gives && R.items[o.gives];
    setTimeout(() => {
      if (it) showPickup(o, it, gift || el, () => showClue(o, it, zoneDone));
      else showClue(o, null, zoneDone);
    }, o.doneMs || 1700);
  }

  /* the found item waits in the room with a tapping hand; touching it picks it up */
  const HAND = '<svg viewBox="0 0 64 72"><path d="M24 4c-3.3 0-6 2.7-6 6v29l-4.5-4.6c-2.5-2.5-6.4-2.5-8.8-.1-2.4 2.4-2.4 6.2-.1 8.7L20.5 60c3.6 4.6 8.4 8 14.8 8H41c10 0 17-7.5 17-17V33c0-3.3-2.7-6-6-6s-6 2.7-6 6v-2c0-3.3-2.7-6-6-6s-6 2.7-6 6v-2c0-3.3-2.7-6-6-6-1.5 0-2.8.5-4 1.4V10c0-3.3-2.7-6-6-6z" fill="#fff" stroke="#1b1108" stroke-width="3.2" stroke-linejoin="round"/><path d="M30 31v12M40 31v12M50 35v10" stroke="#1b1108" stroke-width="2.6" stroke-linecap="round" opacity=".35"/></svg>';
  function showPickup(o, it, target, then) {
    const st = $('#stage').getBoundingClientRect(), r = target.getBoundingClientRect();
    const size = Math.max(70, Math.min(150, Math.max(r.width, r.height) + 24));
    const cx = r.left + r.width / 2 - st.left, cy = r.top + r.height / 2 - st.top;
    const pk = document.createElement('button');
    pk.className = 'pickup'; pk.setAttribute('aria-label', 'Pick up the ' + it.name);
    Object.assign(pk.style, { left: cx - size / 2 + 'px', top: cy - size / 2 + 'px', width: size + 'px', height: size + 'px' });
    pk.innerHTML = `<span class="pkring"></span><span class="pkhand">${HAND}</span>`;
    const label = document.createElement('div');
    label.className = 'pklabel'; label.innerHTML = `Tap the <b>${QR.esc(it.name)}</b> to pick it up`;
    Object.assign(label.style, { left: cx + 'px', top: (cy - size / 2 - 14 < 40 ? cy + size / 2 + 50 : cy - size / 2 - 14) + 'px' });
    $('#stage').append(pk, label);
    say(`You found the ${it.name}! Tap it to pick it up.`);
    pk.onclick = () => {
      const from = target.getBoundingClientRect();
      pk.remove(); label.remove();
      node(o.id).classList.add('taken'); sceneSvg.classList.add('taken-' + o.id);
      addItem(o.gives, from);
      setTimeout(then, 950);
    };
  }
  function showClue(o, it, zoneDone) {
    $('#note').innerHTML = `
      ${it ? `<div class="item"><div>${svg(it.icon)}</div><span>Picked up<big>${QR.esc(cap(it.name))}</big></span></div>` : '<div class="item"><span>A clue</span></div>'}
      <p>${QR.inline(o.clue)}</p>
      ${o.digit ? `<div class="digit"><b>Keypad digit ${CIRCLED[o.digit.n]}</b>= ${QR.esc(o.digit.riddle)}</div>` : ''}
      <div class="tapon">Tap anywhere to continue</div>`;
    const ov = $('#noteOv'); ov.classList.add('on');
    let ready = false; setTimeout(() => ready = true, 700);      // avoids closing it with the same tap
    ov.onclick = () => {
      if (!ready) return;
      ov.onclick = null; ov.classList.remove('on'); S.busy = false;
      say(o.clue.split('. ').slice(-1)[0]);
      if (zoneDone) setTimeout(() => say(`A light above the door turns green. ${zonesDone()} of ${R.zones.length}.`), 2600);
    };
  }

  /* ---------------- keypad ---------------- */
  let code = [];
  (function buildKeypad() {
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OPEN'];
    $('#kpk').innerHTML = keys.map(k => `<button class="${k === 'OPEN' ? 'go' : ''}" data-k="${k}">${k}</button>`).join('');
    $('#kpk').onclick = e => {
      const k = e.target.dataset.k; if (!k) return;
      if (k === '⌫') { code.pop(); AU.beep(); }
      else if (k === 'OPEN') return tryCode();
      else if (code.length < 4) { code.push(k); AU.beep(); }
      drawCode();
    };
    $('#kpClose').onclick = () => $('#kpOv').classList.remove('on');
    document.addEventListener('keydown', e => {
      if (!$('#kpOv').classList.contains('on')) return;
      if (/^\d$/.test(e.key) && code.length < 4) { code.push(e.key); AU.beep(); drawCode(); }
      if (e.key === 'Backspace') { code.pop(); drawCode(); }
      if (e.key === 'Enter') tryCode();
      if (e.key === 'Escape') $('#kpOv').classList.remove('on');
    });
  })();
  function drawCode(marks) {
    [...$('#kpd').children].forEach((s, i) => { s.textContent = code[i] || ''; s.className = marks ? marks[i] : ''; });
    const kd = sceneSvg.querySelector('.kpdisp'); if (kd) kd.textContent = (code.join('') + '----').slice(0, 4);
  }
  function openKeypad() { code = []; drawCode(); $('#kpOv').classList.add('on'); }
  function tryCode() {
    if (code.length < 4) { AU.buzz(); $('#kpmsg').textContent = 'The code has 4 digits.'; return; }
    const want = R.code.split('');
    if (code.join('') === R.code) {
      drawCode(want.map(() => 'ok')); AU.unlock();
      setTimeout(() => { $('#kpOv').classList.remove('on'); escape(); }, 700);
      return;
    }
    S.kpWrong++; AU.buzz(); nope($('.kp'));
    drawCode(code.map((d, i) => d === want[i] ? 'ok' : 'no'));
    $('#kpmsg').innerHTML = 'Wrong code. Green digits are right.<br>Check the notes for the clues.';
    setTimeout(() => { code = []; drawCode(); }, 1400);
  }

  /* ---------------- escaped ---------------- */
  function escape() {
    S.escaped = true; clearInterval(S.timer);
    S.elapsed = Math.floor((Date.now() - S.t0) / 1000);
    $('#time').textContent = fmt(S.elapsed); $('.stat.time').classList.remove('late');
    node('door').classList.add('open'); sceneSvg.querySelector('.sunrays').classList.add('on');
    sceneSvg.querySelectorAll('.led').forEach(l => l.classList.add('on'));
    hud(); AU.door();
    setTimeout(() => $('#flash').classList.add('go'), 900);
    const fin = TRACK.finish(S.elapsed);
    setTimeout(async () => results(await fin), 2300);
  }

  function rank(s) {
    const p = s / TOTAL;
    return p === 1 ? 'Master Escapist' : p >= .85 ? 'Escape Artist' : p >= .65 ? 'Lock Picker' : 'Rookie Escapee';
  }
  function results(fin) {
    let runs = fin && fin.runs;
    if (!TRACK.on) {      // practice mode keeps its own history on this device
      const h = localRuns(); h.push({ attempt_no: h.length + 1, status: 'escaped', score: S.score, total: TOTAL, elapsed_sec: S.elapsed, locks_opened: R.objects.length, locks_total: R.objects.length });
      try { localStorage.setItem(HIST, JSON.stringify(h.slice(-50))); } catch (e) { }
      runs = h;
    }
    const cur = runs && runs.length ? runs[runs.length - 1].attempt_no : null;
    const prev = runs ? runs.filter(r => r.status === 'escaped' && r.attempt_no !== cur).slice(-1)[0] : null;
    const delta = prev ? S.score - prev.score : null;
    const best = load(), title = rank(S.score);
    const newBest = !best.time || S.score > best.score || (S.score === best.score && S.elapsed < best.time);
    if (newBest) save({ time: S.elapsed, score: S.score });
    const stars = S.score === TOTAL ? 3 : S.score / TOTAL >= .75 ? 2 : 1;
    const star = on => `<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" fill="${on ? '#ffb547' : '#2a1e17'}" stroke="${on ? '#ffd28a' : '#4a372b'}" stroke-width="1.2"/></svg>`;
    $('#result').innerHTML = `<div class="res pop">
      <div class="hero"><div class="stamp">ESCAPED</div>${newBest ? '<div><span class="newbest">NEW BEST</span></div>' : ''}</div>
      <div class="card solo">
        <div class="bigs"><div class="t"><small>ESCAPE TIME</small><b>${fmt(S.elapsed)}</b></div><div class="s"><small>FIRST-TRY SCORE</small><b>${S.score}/${TOTAL}</b></div></div>
        <div class="stars">${[0, 1, 2].map(i => star(i < stars)).join('')}</div>
        <div class="rank"><svg viewBox="0 0 24 24" fill="none" stroke="#ffb547" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/></svg><div><b>${title}</b></div></div>
      </div>
      ${runs ? `<div class="resruns">${runsStrip(runs, cur, true)}${delta != null ? `<div class="delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}">${delta > 0 ? '▲ +' + delta + ' vs last escape' : delta < 0 ? '▼ ' + delta + ' vs last escape' : 'Same as last escape'}</div>` : ''}</div>` : ''}
      ${fin ? `<div class="attleft">${S.att && S.att.is_test ? '<span class="testtag">TEST ACCOUNT</span> unlimited attempts' : `<b>${fin.attempts_left}</b> attempts left`}</div>` : (TRACK.on ? '<div class="attleft">Saving… if this stays, check your internet.</div>' : '')}
      <div class="resacts"><button class="btn" id="again" ${fin && fin.attempts_left <= 0 ? 'disabled' : ''}>${fin && fin.attempts_left <= 0 ? 'No attempts left' : 'Play again'}</button><button class="btn ghost" id="look">Look around</button></div>
    </div>`;
    $('#result').classList.add('on');
    $('#again').onclick = () => location.reload();
    $('#look').onclick = () => $('#result').classList.remove('on');
    confetti();
  }

  /* ---------------- hints, notes, sound ---------------- */
  function nextTarget() {
    if (!S.light) return { id: 'switch', line: (R.lines && R.lines.switchHint) || 'Look for the green glow on the wall. It’s a light switch.' };
    for (const o of R.objects) if (!S.opened.has(o.id)) return { id: o.id, line: o.hint };
    return { id: 'door', line: 'Use the door key on the door.' };
  }
  function hint(auto) {
    if (!S.started || S.escaped) return;
    const t = nextTarget(), el = node(t.id);
    if (el) { el.classList.remove('pulse'); el.getBoundingClientRect(); el.classList.add('pulse'); setTimeout(() => el.classList.remove('pulse'), 5600); }
    say((auto ? 'Stuck? ' : '') + t.line);
    S.idle = 0;
  }
  $('#hintBtn').onclick = () => { AU.click(); hint(false); };

  $('#notesBtn').onclick = () => {
    AU.click();
    $('#journal').innerHTML = `<h2>Notes</h2>${S.notes.length ? `<ol>${S.notes.map(n => `<li>${QR.inline(n.clue)}${n.digit ? `<div class="d">Keypad digit ${CIRCLED[n.digit.n]} = ${QR.esc(n.digit.riddle)}</div>` : ''}</li>`).join('')}</ol>` : '<p class="empty">No notes yet. Open something first.</p>'}<button class="btn" id="jClose" style="width:100%">Close</button>`;
    $('#journalOv').classList.add('on');
    $('#jClose').onclick = () => $('#journalOv').classList.remove('on');
  };
  $('#soundBtn').onclick = () => { S.sound = !S.sound; $('#soundBtn').innerHTML = svg(S.sound ? IC.sound : IC.mute); };
  document.querySelectorAll('.ov').forEach(ov => ov.addEventListener('click', e => {
    if (e.target === ov && (ov.id === 'journalOv' || ov.id === 'kpOv')) ov.classList.remove('on');
  }));

  /* ---------------- particles + confetti ---------------- */
  const cv = $('#fx'), cx = cv.getContext('2d'); let parts = [], raf = null;
  function fit() { cv.width = innerWidth; cv.height = innerHeight; }
  addEventListener('resize', fit); fit();
  function run() {
    cx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(p => p.life > 0);
    parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= .99; p.life--; p.r += p.spin;
      cx.save(); cx.globalAlpha = Math.min(1, p.life / 30); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c;
      p.sq ? cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2) : (cx.beginPath(), cx.arc(0, 0, p.s / 2, 0, 7), cx.fill());
      cx.restore();
    });
    raf = parts.length ? requestAnimationFrame(run) : null;
  }
  const COLS = ['#ffb547', '#3fd6c6', '#ff7a66', '#b58cff', '#9be564', '#fff3d6'];
  function burst(el) {
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    for (let i = 0; i < 46; i++) { const a = Math.random() * 6.28, v = 2 + Math.random() * 6; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, g: .15, life: 50 + Math.random() * 30, s: 4 + Math.random() * 5, c: COLS[i % 6], r: 0, spin: 0, sq: false }); }
    if (!raf) run();
  }
  function confetti() {
    for (let i = 0; i < 220; i++) parts.push({ x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * .6, vx: (Math.random() - .5) * 3, vy: 2 + Math.random() * 3, g: .05, life: 220 + Math.random() * 120, s: 8 + Math.random() * 8, c: COLS[i % 6], r: Math.random() * 6, spin: (Math.random() - .5) * .3, sq: true });
    if (!raf) run();
  }

  drawSlots(); hud();
})();
