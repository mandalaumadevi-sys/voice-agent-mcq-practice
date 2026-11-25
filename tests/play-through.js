/* Plays a whole escape room in headless Chrome and takes screenshots.
   NODE_PATH=<a node_modules with playwright> node play-through.js <width> <height> <outdir> [room] */
const { chromium } = require('playwright');
const path = require('path');
const MOCK = process.env.MOCK_DB;
const W = +process.argv[2] || 1280, H = +process.argv[3] || 800, OUT = process.argv[4] || '.', ROOM = process.argv[5] || 'voice-agent';
const URL = 'file://' + path.resolve(__dirname, '..', 'rooms', ROOM, 'index.html');

(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const ctx = await b.newContext({ viewport: { width: W, height: H } });
  const p = await ctx.newPage();
  const calls = [];
  // never touch the live database from a test: practice mode by default, a fake Supabase with MOCK_DB=1
  await ctx.addInitScript(m => { window.ESCAPE_DB = m ? { url: 'https://mock.supabase.test', anonKey: 'k' } : { url: 'https://YOUR-PROJECT.supabase.co', anonKey: 'YOUR-ANON-KEY' }; }, !!MOCK);
  await ctx.route('https://*.supabase.co/**', r => r.abort());
  if (MOCK) {
    await ctx.route('https://mock.supabase.test/rest/v1/rpc/*', r => {
      const fn = r.request().url().split('/').pop(); calls.push(fn);
      const body = { check_student: { attempts_used: 2, max_attempts: 10, attempts_left: 8, escapes: 1, best_score: 14, best_time: 700, runs: [{ attempt_no: 1, status: 'playing', score: 2, total: 20, locks_opened: 3, locks_total: 11, elapsed_sec: 200 }, { attempt_no: 2, status: 'escaped', score: 14, total: 20, locks_opened: 11, locks_total: 11, elapsed_sec: 700 }] }, start_run: { run_id: '00000000-0000-0000-0000-000000000001', attempt_no: 3, max_attempts: 10, attempts_left: 7 }, finish_run: { score: 19, attempt_no: 3, attempts_left: 7, best_score: 19, best_time: 90, escapes: 2, runs: [{ attempt_no: 1, status: 'playing', score: 2, total: 20, locks_opened: 3, locks_total: 11, elapsed_sec: 200 }, { attempt_no: 2, status: 'escaped', score: 14, total: 20, locks_opened: 11, locks_total: 11, elapsed_sec: 700 }, { attempt_no: 3, status: 'escaped', score: 19, total: 20, locks_opened: 11, locks_total: 11, elapsed_sec: 100 }] } }[fn] ?? null;
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
  }
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const shot = name => p.screenshot({ path: `${OUT}/${name}-${W}.png` });
  await p.goto(URL);
  await p.waitForTimeout(600); await shot('00-signin');
  await p.fill('#fUser', 'u-test'); await p.fill('#fRoll', 'R001'); await p.fill('#fName', 'Test Student');
  await p.click('#signGo');
  await p.waitForTimeout(3500); await shot('01-intro');
  const p2 = await ctx.newPage(); await p2.goto(URL); await p2.waitForTimeout(1500);
  console.log('second visit skips sign-in:', !(await p2.isVisible('#signOv.on')) && await p2.isVisible('#howOv.on'));
  await p2.close();
  await p.waitForTimeout(16000); await shot('01b-intro-video');
  await p.waitForTimeout(14000); await shot('01c-intro-video');
  if (await p.isVisible('#reelSkip')) await p.click('#reelSkip'); await p.click('#enter'); await p.click('#soundBtn');
  await p.mouse.move(W * .4, H * .5); await shot('02-dark');
  await p.click('[data-obj="switch"]', { force: true }); await p.waitForTimeout(1300); await shot('03-lit');

  const objs = await p.evaluate(() => ROOM.objects.map(o => ({ id: o.id, needs: o.needs, n: o.q.length, gives: o.gives })));
  const inv = []; let wrongDone = false; const overflow = [], fails = [];
  for (const o of objs) {
    const target = { mic: '[data-obj="mic"] rect', speakers: '[data-obj="speakers"] .cone >> nth=0', transcriber: '[data-obj="transcriber"] .cardslot > rect >> nth=0', mixer: '[data-obj="mixer"] .sdoor rect' }[o.id] || `[data-obj="${o.id}"]`;
    const needs = [].concat(o.needs || []);
    if (!needs.length) await p.click(target, { force: true });
    for (const n of needs) {
      await p.click(`.slotbox[data-i="${inv.indexOf(n)}"]`);
      await p.click(target, { force: true });
      await p.waitForTimeout(1500); await shot(`use-${o.id}-${n}`);
      if (n !== needs[needs.length - 1]) await p.waitForTimeout(1400);
    }
    await p.waitForSelector('#panel.on', { timeout: 8000 });
    await p.waitForTimeout(500);
    for (let i = 0; i < o.n; i++) {
      const q = await p.evaluate(([id, i]) => ROOM.objects.find(x => x.id === id).q[i], [o.id, i]);
      const of = await p.evaluate(() => { const a = document.querySelector('#pArea'); return a.scrollHeight - a.clientHeight; });
      if (of > 2) overflow.push(`${o.id}#${i} (${q.t}) +${of}px`);
      await shot(`q-${o.id}-${i}-${q.t}`);
      // one deliberate wrong answer: the first terminal question gets a wrong command
      if (!wrongDone && q.t === 'terminal') {
        wrongDone = true;
        await p.evaluate(q => {   // fill every slot, in the wrong order
          const toks = [...document.querySelectorAll('.tok')], wrong = q.ans.length > 1 ? [...q.ans].reverse() : [toks.find(b => b.textContent !== q.ans[0]).textContent];
          wrong.forEach(a => toks.find(b => b.textContent === a && !b.classList.contains('used')).click());
        }, q);
        await p.click('#pAct .btn:not(.ghost)'); await p.waitForTimeout(300); await shot('wrong');
        await p.click('#pAct .btn');
      }
      if (q.t === 'match') {
        for (let k = 0; k < q.L.length; k++) {
          const a = await p.locator('.plug').nth(k).boundingBox(), s = await p.locator(`.sock[data-r="${k}"]`).boundingBox();
          await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await p.mouse.down();
          await p.mouse.move((a.x + s.x) / 2 + 40, a.y + 30, { steps: 5 });
          await p.mouse.move(s.x + s.width / 2, s.y + s.height / 2, { steps: 5 }); await p.mouse.up();
        }
        await p.waitForTimeout(300); await shot('match-wired');
        await p.click('#pAct .btn:not(.ghost)');
      } else if (q.t === 'sort') {
        // real drag and drop for the first card, taps for the rest
        const first = q.items[0];
        const c = p.locator('.pool .chip', { hasText: first[0] }).first(), bx = await c.boundingBox(), bk = await p.locator('.bucket').nth(first[1]).boundingBox();
        await p.mouse.move(bx.x + 10, bx.y + 10); await p.mouse.down(); await p.mouse.move(bk.x + 40, bk.y + 50, { steps: 8 }); await p.mouse.up();
        for (const [txt, bi] of q.items.slice(1)) { await p.locator('.pool .chip', { hasText: txt }).first().click(); await p.locator('.bucket').nth(bi).click(); }
        await p.click('#pAct .btn:not(.ghost)');
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
          if (q.t === 'markup') q.ans.forEach(tapTok);
          if (q.t === 'pickmany') q.a.forEach(i => document.querySelectorAll('.pickrow')[i].click());
          if (q.t === 'typein') { const inp = document.querySelector('.tinput'); inp.value = q.ans[0]; inp.dispatchEvent(new Event('input')); }
          const go = $$('#pAct .btn').find(b => !b.classList.contains('ghost')); if (go && !document.querySelector('.fb')?.classList.contains('good') && !document.querySelector('.fb.bad')) go.click();
        }, q);
        if (q.t === 'terminal' || q.t === 'typein') await p.waitForTimeout(1500);    // the output types out before the lock opens
      }
      await p.waitForTimeout(250);
      if (!(await p.$('.fb.good'))) { fails.push(`${o.id}#${i} ${q.t}`); await shot(`ERR-${o.id}-${i}`); }
      await p.click('#pAct .btn');
      await p.waitForTimeout(250);
    }
    if (o.id === 'door') break;
    await p.waitForTimeout(900); await shot(`reveal-${o.id}`);
    await p.waitForSelector('.pickup', { timeout: 6000 }); await p.waitForTimeout(500);
    await shot(`pickup-${o.id}`);
    await p.click('.pickup');
    await p.waitForSelector('#noteOv.on', { timeout: 6000 }); await p.waitForTimeout(800);
    await shot(`note-${o.id}`);
    await p.click('#noteOv'); await p.waitForTimeout(700);
    if (o.gives) inv.push(o.gives);
  }
  const code = await p.evaluate(() => ROOM.code);
  if (code) {
    await p.waitForSelector('#kpOv.on', { timeout: 6000 });
    for (const k of code) await p.click(`#kpk [data-k="${k}"]`);
    await p.click('#kpk [data-k="OPEN"]');
  }
  await p.waitForTimeout(2600); await shot('door');
  await p.waitForTimeout(2200); await shot('result');
  const st = await p.evaluate(() => [document.querySelector('#score').textContent, document.querySelector('#time').textContent, document.querySelector('#locks').textContent]);
  if (MOCK) {
    const c = fn => calls.filter(x => x === fn).length;
    console.log('rpc calls', { check: c('check_student'), start: c('start_run'), answers: c('log_answer'), updates: c('update_run'), finish: c('finish_run') });
    console.log('results line:', await p.textContent('.attleft'));
  }
  console.log('score/time/locks', st, '\noverflow', overflow, '\nfails', fails, '\nerrors', errs);
  await b.close();
})();
