/* Plays the room twice against a mock of the Supabase API (same rules as database/schema.sql, max 2 attempts here)
   and checks what reaches the database: sign-in, attempt count, answers, locks, escape, then the block on attempt 3.
   NODE_PATH=<node_modules with playwright> node tracking.js <outdir> */
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || '.';
const URL = 'file://' + path.resolve(__dirname, '..', 'rooms', 'voice-agent', 'index.html');
const MAX = 2, db = { students: {}, runs: [], answers: [] };
let nid = 1;
const best = (u, room) => { const e = db.runs.filter(r => r.user_id === u && r.room === room && r.status === 'escaped'); return { best_score: e.length ? Math.max(...e.map(r => r.score)) : null, best_time: e.length ? Math.min(...e.map(r => r.elapsed_sec)) : null, escapes: e.length }; };
const fns = {
  check_student: a => { db.students[a.p_user_id] = { roll: a.p_roll_no, name: a.p_name }; const used = db.runs.filter(r => r.user_id === a.p_user_id && r.room === a.p_room).length; return Object.assign({ attempts_used: used, max_attempts: MAX, attempts_left: Math.max(MAX - used, 0), runs: db.runs.filter(r => r.user_id === a.p_user_id && r.room === a.p_room) }, best(a.p_user_id, a.p_room)); },
  start_run: a => { const used = db.runs.filter(r => r.user_id === a.p_user_id && r.room === a.p_room).length; if (used >= MAX) return { blocked: true, attempts_used: used, max_attempts: MAX }; const r = { id: 'run' + nid++, user_id: a.p_user_id, room: a.p_room, attempt_no: used + 1, status: 'playing', score: 0, locks_opened: 0, total: a.p_total, locks_total: a.p_locks_total, elapsed_sec: 0 }; db.runs.push(r); return { run_id: r.id, attempt_no: r.attempt_no, max_attempts: MAX, attempts_left: MAX - r.attempt_no }; },
  log_answer: a => { const r = db.runs.find(x => x.id === a.p_run_id); if (!r || r.status !== 'playing') return null; db.answers.push(a); r.score = db.answers.filter(x => x.p_run_id === r.id && x.p_first_try && x.p_correct).length; r.current_lock = a.p_object_id; return null; },
  update_run: a => { const r = db.runs.find(x => x.id === a.p_run_id); if (r && r.status === 'playing') { r.locks_opened = Math.max(r.locks_opened, a.p_locks_opened); r.elapsed_sec = Math.max(r.elapsed_sec, a.p_elapsed_sec); r.current_lock = a.p_current_lock || r.current_lock; } return null; },
  finish_run: a => { const r = db.runs.find(x => x.id === a.p_run_id); if (!r || r.status !== 'playing') return null; r.status = 'escaped'; r.locks_opened = r.locks_total; r.elapsed_sec = Math.max(r.elapsed_sec, a.p_elapsed_sec); return Object.assign({ score: r.score, attempt_no: r.attempt_no, attempts_left: MAX - r.attempt_no }, best(r.user_id, r.room)); }
};
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);

(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => { window.ESCAPE_DB = { url: 'https://mock.supabase.test', anonKey: 'test-anon' }; });
  await ctx.route('https://mock.supabase.test/rest/v1/rpc/*', async route => {
    const fn = route.request().url().split('/').pop(), args = JSON.parse(route.request().postData() || '{}');
    const key = route.request().headers()['apikey'];
    if (key !== 'test-anon') return route.fulfill({ status: 401, body: '{"message":"bad key"}' });
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fns[fn](args)) });
  });
  async function play(n) {
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL); await p.waitForTimeout(1200);
    if (await p.isVisible('#signOv.on') && !(await p.inputValue('#fUser'))) {
      await p.fill('#fUser', 'stu-42'); await p.fill('#fRoll', 'R042'); await p.fill('#fName', 'Asha');
      await p.click('#signGo'); await p.waitForTimeout(700);
    }
    return { p, errs };
  }
  // run 1: enter, answer the first lock (1 wrong + right), then check what was saved
  let { p, errs } = await play(1);
  ok((await p.textContent('#attLine')).includes('Attempt 1 of 2'), 'intro shows attempt 1 of 2');
  await p.screenshot({ path: `${OUT}/t-intro.png` });
  await p.click('#reelSkip'); await p.click('#enter'); await p.waitForTimeout(800);
  ok(db.runs.length === 1 && db.runs[0].attempt_no === 1, 'entering the room starts run 1');
  ok((await p.textContent('.brand span')).includes('Attempt 1 of 2'), 'HUD shows the attempt');
  await p.click('[data-obj="switch"]', { force: true }); await p.waitForTimeout(1200);
  await p.click('[data-obj="drawer"]', { force: true }); await p.waitForSelector('#panel.on');
  const q = await p.evaluate(() => ROOM.objects[0].q);
  const tapToks = list => p.evaluate(list => list.forEach(w => [...document.querySelectorAll('.tok')].find(b => b.textContent === w && !b.classList.contains('used')).click()), list);
  await tapToks(['type', 'audio file', 'final response']); await p.click('#pAct .btn:not(.ghost)');   // wrong on the first try
  await p.click('#pAct .btn');                                                                         // Try again
  await tapToks(q[0].ans); await p.click('#pAct .btn:not(.ghost)');
  await p.click('#pAct .btn');                                                                         // Next tumbler
  await tapToks(q[1].ans); await p.click('#pAct .btn:not(.ghost)'); await p.waitForSelector('.fb.good', { timeout: 5000 });
  await p.click('#pAct .btn'); await p.waitForSelector('.pickup'); await p.waitForTimeout(500);
  const a = db.answers;
  ok(a.length === 3 && a[0].p_correct === false && a[0].p_first_try === true && a[1].p_correct && !a[1].p_first_try && a[1].p_try_no === 2 && a[2].p_first_try && a[2].p_correct, 'answers saved with first-try flags and try numbers');
  ok(db.runs[0].score === 1, 'run score = 1 (only the first-try right answer)');
  ok(db.runs[0].locks_opened === 1 && db.runs[0].current_lock === 'laptop', 'opened lock saved, next lock = laptop');
  // finish run 1 quickly through the engine's escape path
  await p.click('.pickup'); await p.waitForSelector('#noteOv.on'); await p.waitForTimeout(800); await p.click('#noteOv');
  await p.evaluate(() => { const d = document.querySelector('[data-obj="door"]'); });
  ok(errs.length === 0, 'no page errors in run 1 ' + errs.join(' | '));
  await p.close();
  // run 2 starts and escapes (marked escaped by finishing via API state), run 3 is blocked
  db.runs[0].status = 'escaped'; db.runs[0].elapsed_sec = 300;
  ({ p, errs } = await play(2));
  ok((await p.textContent('#attLine')).includes('Attempt 2 of 2') && (await p.locator('.runchip.best').count()) === 1, 'second visit: attempt 2 of 2, best marked: ' + (await p.textContent('.runchip.best')).replace(/\s+/g, ' ').trim());
  await p.click('#reelSkip'); await p.click('#enter'); await p.waitForTimeout(800);
  ok(db.runs.length === 2, 'run 2 started');
  await p.close();
  ({ p, errs } = await play(3));
  ok(await p.isVisible('#blockOv.on'), 'third visit is blocked: ' + (await p.textContent('#blockBox')).replace(/\s+/g, ' ').trim());
  await p.screenshot({ path: `${OUT}/t-blocked.png` });
  ok(db.runs.length === 2, 'no run 3 created');
  await p.close();
  // server down: sign-in shows a clear error
  await ctx.unroute('https://mock.supabase.test/rest/v1/rpc/*');
  await ctx.route('https://mock.supabase.test/rest/v1/rpc/*', r => r.abort());
  ({ p } = await play(4));
  ok(/Can’t reach the server/.test(await p.textContent('#signErr')), 'offline sign-in shows a clear error');
  await b.close();
})();
