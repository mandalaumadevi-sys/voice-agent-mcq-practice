/* Records the intro clip: lock 1 solved by dragging, the item picked up, the clue, the item used,
   then (after the middle locks are played off-camera and cut) the last key opening the door.
   NODE_PATH=<node_modules with playwright> node record-how-to-play.js <room> <outdir>
   Writes raw.webm + marks.json (seconds from the start of the recording). Never touches the live database. */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const ROOM = process.argv[2] || 'voice-agent', OUT = process.argv[3] || '.';

const CURSOR = () => addEventListener('DOMContentLoaded', () => {
  const c = document.createElement('div');
  c.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24"><path d="M4 2l15 9-7 1.5L8.5 20z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  Object.assign(c.style, { position: 'fixed', left: 0, top: 0, zIndex: 99999, pointerEvents: 'none', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.6))' });
  document.body.appendChild(c);
  addEventListener('pointermove', e => { c.style.transform = `translate(${e.clientX - 5}px,${e.clientY - 3}px)`; }, true);
  addEventListener('pointerdown', e => {
    const r = document.createElement('div');
    Object.assign(r.style, { position: 'fixed', left: e.clientX - 24 + 'px', top: e.clientY - 24 + 'px', width: '48px', height: '48px', borderRadius: '50%', border: '4px solid #ffb547', zIndex: 99998, pointerEvents: 'none' });
    document.body.appendChild(r);
    r.animate([{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(1.4)', opacity: 0 }], { duration: 550 }).onfinish = () => r.remove();
  }, true);
});

(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: OUT, size: { width: 1280, height: 720 } } });
  await ctx.addInitScript(() => { window.ESCAPE_DB = { url: 'https://YOUR-PROJECT.supabase.co', anonKey: 'YOUR-ANON-KEY' }; });
  await ctx.route('https://*.supabase.co/**', r => r.abort());
  await ctx.addInitScript(CURSOR);
  const T0 = Date.now(), marks = {}, mark = id => { marks[id] = (Date.now() - T0) / 1000; };
  const p = await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '..', 'rooms', ROOM, 'index.html'));
  const wait = ms => p.waitForTimeout(ms);
  let cx = 640, cy = 360;
  async function glide(x, y, ms = 650) { const n = Math.max(8, Math.round(ms / 25)); for (let i = 1; i <= n; i++) { const k = i / n, e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; await p.mouse.move(cx + (x - cx) * e, cy + (y - cy) * e); await wait(ms / n); } cx = x; cy = y; }
  const centre = async sel => { const bx = await p.locator(sel).first().boundingBox(); return [bx.x + bx.width / 2, bx.y + bx.height / 2]; };
  async function tap(sel, ms) { const [x, y] = await centre(sel); await glide(x, y, ms); await wait(150); await p.mouse.down(); await p.mouse.up(); }
  async function drag(from, to, ms = 700) { const [x, y] = await centre(from); await glide(x, y, 500); await wait(120); await p.mouse.down(); const [x2, y2] = await centre(to); await glide(x2, y2, ms); await wait(120); await p.mouse.up(); }

  /* sign in (practice mode) and enter, off the clip */
  await p.fill('#fUser', 'demo'); await p.fill('#fRoll', 'DEMO'); await p.fill('#fName', 'Demo'); await p.click('#signGo');
  await wait(800); await p.evaluate(() => document.querySelector('#enter').click()); await p.click('#soundBtn');
  await p.mouse.move(cx, cy); await wait(300);

  /* ---- clip A: find the light, solve lock 1 by dragging, pick up, read the clue, use the item */
  mark('a0');
  await glide(900, 300, 700); await glide(380, 380, 800);
  await tap('[data-obj="switch"] rect', 600); mark('light');
  await wait(1400);
  await tap('[data-obj="drawer"] .front rect', 800); mark('lock');
  await wait(900);
  const q = await p.evaluate(() => ROOM.objects[0].q);
  for (let i = 0; i < q[0].ans.length; i++) await drag(`.tok:text-is("${q[0].ans[i]}")`, `.cslot[data-b="${i}"]`, 600);
  await tap('#pAct .btn:not(.ghost)', 500); mark('first');
  await wait(1700);
  await tap('#pAct .btn', 500); await wait(700);
  await drag(`.tok:text-is("${q[1].ans[0]}")`, '.tslot', 650);
  await tap('#pAct .btn:not(.ghost)', 500); await wait(2300);
  await tap('#pAct .btn', 500);
  await p.waitForSelector('.pickup'); mark('pickup'); await wait(1700);
  await tap('.pickup', 700);
  await p.waitForSelector('#noteOv.on'); mark('clue'); await wait(2300);
  await glide(640, 160, 400); await p.mouse.down(); await p.mouse.up(); await wait(700);
  await tap('.slotbox[data-i="0"]', 800); mark('use');
  await wait(500);
  await tap('[data-obj="laptop"] > rect', 800);
  await wait(3800); mark('a1');

  /* ---- off the clip: play the middle locks quickly until the door key is in the inventory */
  const objs = await p.evaluate(() => ROOM.objects.map(o => ({ id: o.id, needs: [].concat(o.needs || []), n: o.q.length, gives: o.gives })));
  const inv = ['charger'];
  const target = { mic: '[data-obj="mic"] rect', speakers: '[data-obj="speakers"] .cone >> nth=0', transcriber: '[data-obj="transcriber"] .cardslot > rect >> nth=0', mixer: '[data-obj="mixer"] .sdoor rect' };
  async function answerAll(o) {
    for (let i = (o.id === 'laptop' ? 0 : 0); i < o.n; i++) {
      const qq = await p.evaluate(([id, i]) => ROOM.objects.find(x => x.id === id).q[i], [o.id, i]);
      if (qq.t === 'match') {
        for (let k = 0; k < qq.L.length; k++) await drag(`.plug >> nth=${k}`, `.sock[data-r="${k}"]`, 80);
      } else if (qq.t === 'sort') {
        for (const [t, bi] of qq.items) { await p.locator('.pool .chip', { hasText: t }).first().click(); await p.locator('.bucket').nth(bi).click(); }
      } else {
        await p.evaluate(q => {
          const $$ = s => [...document.querySelectorAll(s)], txt = e => e.textContent.trim();
          const tapTok = a => $$('.tok').find(b => txt(b) === a && !b.classList.contains('used')).click();
          if (['cloze', 'terminal', 'flow', 'fill'].includes(q.t)) q.ans.forEach(tapTok);
          if (q.t === 'order') q.o.forEach(o => tapTok(o.replace(/`/g, '')));
          if (q.t === 'swipe') q.S.forEach(() => { const k = +document.querySelector('.swcard.top').dataset.k; document.querySelector(q.S[k][1] ? '.swbin.t' : '.swbin.f').click(); });
          if (q.t === 'dial') document.querySelector(`.dval[data-i="${q.a}"]`).click();
          if (q.t === 'spot') document.querySelector(`.spotpart[data-i="${q.a}"]`).click();
          if (q.t === 'dragto') document.querySelector(`.dttarget[data-i="${q.a}"]`).click();
          if (q.t === 'bug') document.querySelectorAll('pre.code.bug .ln')[q.line].click();
        }, qq);
      }
      const go = p.locator('#pAct .btn:not(.ghost)');
      if (!(await p.$('.fb.good'))) await go.first().click();
      if (qq.t === 'terminal') await wait(1500);
      await p.waitForSelector('.fb.good'); await p.click('#pAct .btn'); await wait(120);
    }
  }
  for (const o of objs) {
    if (o.id === 'drawer') continue;
    if (o.id === 'door') break;
    if (o.id !== 'laptop') {
      if (!o.needs.length) await p.click(target[o.id] || `[data-obj="${o.id}"]`, { force: true });
      for (const n of o.needs) { await p.click(`.slotbox[data-i="${inv.indexOf(n)}"]`); await p.click(target[o.id] || `[data-obj="${o.id}"]`, { force: true }); await wait(3200); }
      try { await p.waitForSelector('#panel.on', { timeout: 10000 }); } catch (e) { await p.screenshot({ path: path.join(OUT, 'stuck-' + o.id + '.png') }); console.log('STUCK at', o.id, 'inv', inv, 'say:', await p.textContent('#say')); throw e; }
    }
    await answerAll(o);
    await p.waitForSelector('.pickup', { timeout: 8000 }); await p.click('.pickup');
    await p.waitForSelector('#noteOv.on'); await wait(800); await p.click('#noteOv'); await wait(700);
    if (o.gives) inv.push(o.gives);
  }
  await p.mouse.move(cx, cy); await wait(1500);

  /* ---- clip B: the last key opens the door */
  mark('b0');
  await wait(600);
  await tap(`.slotbox[data-i="${inv.indexOf('doorkey')}"]`, 800); await wait(300);
  await tap('[data-obj="door"] .leaf rect', 900); mark('door');
  await p.waitForSelector('#panel.on', { timeout: 8000 }); await wait(900);
  const last = (await p.evaluate(() => ROOM.objects.find(o => o.id === 'door').q[0]));
  await drag('.dtitem', `.dttarget[data-i="${last.a}"]`, 800); await wait(1300);
  await tap('#pAct .btn', 600); mark('escape');
  await wait(6200); mark('b1');

  const v = p.video(); await ctx.close(); await b.close();
  fs.renameSync(await v.path(), path.join(OUT, 'raw.webm'));
  fs.writeFileSync(path.join(OUT, 'marks.json'), JSON.stringify(marks, null, 1));
  console.log(marks);
})();
