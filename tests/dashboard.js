/* Opens the dashboard against a mock Supabase (auth + REST) filled with sample students, and takes screenshots.
   NODE_PATH=<node_modules with playwright> node dashboard.js <outdir> */
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || '.';
const PAGE = 'file://' + path.resolve(__dirname, '..', 'dashboard', 'index.html');
const MOCK = 'https://mock.supabase.test';

/* sample data shaped like the views in database/schema.sql */
const names = ['Asha Rao', 'Vikram S', 'Meera K', 'Rahul T', 'Divya P', 'Arjun M', 'Sneha R', 'Kiran B', 'Pooja N', 'Rohit V', 'Anjali D', 'Sai Teja', 'Nikhil G', 'Lavanya C', 'Harsha Y', 'Keerthi L', 'Manoj A', 'Swathi J', 'Varun E', 'Priya H', 'Ganesh F', 'Ritika W', 'Akhil Q', 'Bhavana Z'];
const now = Date.now(), iso = ms => new Date(now - ms).toISOString();
let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const summary = names.map((n, i) => {
  const used = 1 + Math.floor(rnd() * 10), esc = Math.min(used, Math.floor(rnd() * (used + 1)));
  return { user_id: 'u' + (100 + i), roll_no: '22B81A0' + (300 + i), name: n, room: 'voice-agent', attempts_used: used, escapes: esc, best_score: esc ? 8 + Math.floor(rnd() * 13) : null, best_time: esc ? 300 + Math.floor(rnd() * 900) : null, total: 20, last_seen: iso(rnd() * 86400000 * 3), playing_now: false };
});
summary.push({ user_id: 'TEST-01', roll_no: 'TEST', name: 'Test Account', room: 'voice-agent', attempts_used: 14, escapes: 9, best_score: 20, best_time: 95, total: 20, last_seen: iso(30000), playing_now: false, is_test: true });
summary.forEach(s => { if (s.is_test === undefined) s.is_test = false; });
const live = [0, 3, 7].map((k, j) => ({ id: 'r' + k, user_id: summary[k].user_id, attempt_no: summary[k].attempts_used, score: 4 + j * 3, total: 20, locks_opened: 2 + j * 3, locks_total: 11, current_lock: ['case', 'speakers', 'transcriber'][j], elapsed_sec: 200 + j * 160, last_seen: iso(8000 * (j + 1)), started_at: iso(600000) }));
live.forEach(r => { const s = summary.find(x => x.user_id === r.user_id); s.last_seen = r.last_seen; });
const qs = [['drawer', 2], ['laptop', 2], ['case', 2], ['mic', 2], ['deck', 2], ['enter', 1], ['speakers', 2], ['poster', 2], ['transcriber', 2], ['mixer', 2], ['door', 1]];
const stats = []; qs.forEach(([o, n]) => { for (let i = 0; i < n; i++) { const ft = 20 + Math.floor(rnd() * 30), pct = 25 + Math.floor(rnd() * 70); stats.push({ room: 'voice-agent', object_id: o, question_idx: i, question: 'Sample question', first_tries: ft, first_try_correct: Math.round(ft * pct / 100), first_try_pct: pct, avg_tries_to_solve: (1 + rnd() * 1.5).toFixed(1) }); } });
const feed = Array.from({ length: 30 }, (_, k) => ({ id: 1000 - k, user_id: live[k % 3].user_id, object_id: qs[k % 11][0], question_idx: 0, question: 'q', correct: k % 4 !== 0, first_try: k % 3 !== 0, try_no: k % 3 ? 1 : 2, created_at: iso(k * 20000) }));
const runsFor = uid => { const s = summary.find(x => x.user_id === uid); return Array.from({ length: s.attempts_used }, (_, k) => ({ id: uid + '-' + k, attempt_no: k + 1, status: k < s.escapes ? 'escaped' : 'playing', score: 6 + k, total: 20, locks_opened: k < s.escapes ? 11 : 4, locks_total: 11, elapsed_sec: 400 + k * 30, started_at: iso((10 - k) * 3600000), last_seen: iso((10 - k) * 3600000) })); };

(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  await ctx.addInitScript(m => { window.ESCAPE_DB = { url: m, anonKey: 'anon' }; }, MOCK);
  const errs = [];
  await ctx.route(MOCK + '/**', async route => {
    const u = new URL(route.request().url()), p = u.pathname, json = (d, s = 200) => route.fulfill({ status: s, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(d) });
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (p === '/auth/v1/token') {
      const body = JSON.parse(route.request().postData());
      if (body.password !== 'right') return json({ error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials' }, 400);
      return json({ access_token: 'aaa.eyJzdWIiOiJ0ZWFjaGVyIiwiZXhwIjo5OTk5OTk5OTk5fQ.sig', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(now / 1000) + 3600, refresh_token: 'r', user: { id: 't1', email: 'teacher@x.com', aud: 'authenticated', role: 'authenticated' } });
    }
    if (p === '/rest/v1/rpc/is_dashboard_admin') return json(true);
    const table = p.split('/').pop(), uid = (u.searchParams.get('user_id') || '').replace('eq.', '');
    if (table === 'student_summary') return json(summary);
    if (table === 'runs') return json(uid ? runsFor(uid) : live);
    if (table === 'question_stats') return json(stats);
    if (table === 'answers') return json(uid ? [] : feed);
    if (table === 'room_settings') return json({ max_attempts: 10 });
    return json([]);
  });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(PAGE); await p.waitForSelector('#lf', { timeout: 15000 });
  await p.fill('#le', 'teacher@x.com'); await p.fill('#lp', 'wrong'); await p.click('#lgo'); await p.waitForTimeout(800);
  console.log('wrong password message:', await p.textContent('#lerr'));
  await p.fill('#lp', 'right'); await p.click('#lgo');
  await p.waitForSelector('#tiles .tile', { timeout: 15000 }); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/dash-1366.png`, fullPage: true });
  console.log('tiles:', (await p.$$eval('.tile', t => t.map(x => x.querySelector('small').textContent + '=' + x.querySelector('b').textContent))).join(' | '));
  console.log('test hidden by default:', !(await p.$$eval('#tbody tr', r => r.some(x => x.textContent.includes('Test Account')))));
  await p.check('#showTests'); await p.waitForTimeout(300);
  console.log('test shown with box ticked:', await p.$$eval('#tbody tr.testrow', r => r.length));
  await p.uncheck('#showTests');
  console.log('playing rows:', await p.$$eval('.lrow', r => r.length), '· table rows:', await p.$$eval('#tbody tr', r => r.length), '· question bars:', await p.$$eval('.qrow', r => r.length));
  await p.fill('#search', 'meera'); await p.waitForTimeout(200);
  console.log('search meera rows:', await p.$$eval('#tbody tr', r => r.length));
  await p.click('#tbody tr'); await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/dash-drawer.png` });
  console.log('drawer runs:', await p.$$eval('.runs tbody tr', r => r.length));
  await p.setViewportSize({ width: 390, height: 844 }); await p.click('#dClose'); await p.fill('#search', ''); await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/dash-phone.png`, fullPage: true });
  console.log('phone horizontal scroll:', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth));
  console.log('errors', errs);
  await b.close();
})();
