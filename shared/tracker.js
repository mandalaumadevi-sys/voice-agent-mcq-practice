/* Sends a student's progress to Supabase (database/schema.sql) through its RPC functions.
   Needs window.ESCAPE_DB = { url, anonKey } from shared/config.js. Without it, TRACK.on is false and nothing is sent. */
window.TRACK = (function () {
  const C = window.ESCAPE_DB || {};
  const on = !!(C.url && C.anonKey && !/YOUR[-_]/i.test(C.url + C.anonKey));
  const queue = [];
  let run = null, flushing = false;

  async function rpc(fn, args) {
    const r = await fetch(C.url.replace(/\/+$/, '') + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      // legacy anon keys are JWTs (eyJ…) and also go in Authorization; new sb_publishable_ keys go only in apikey
      headers: Object.assign({ apikey: C.anonKey, 'Content-Type': 'application/json' }, /^eyJ/.test(C.anonKey) ? { Authorization: 'Bearer ' + C.anonKey } : {}),
      body: JSON.stringify(args)
    });
    const text = await r.text();
    let j = null; try { j = text ? JSON.parse(text) : null; } catch (e) { }
    if (!r.ok) { const err = new Error((j && (j.message || j.hint)) || 'Server error ' + r.status); err.status = r.status; throw err; }
    return j;
  }
  const offline = e => !e.status || e.status >= 500;

  /* progress events go through a queue, so a short network drop loses nothing */
  async function flush() {
    if (flushing) return;
    flushing = true;
    while (queue.length) {
      try { await rpc(queue[0][0], queue[0][1]); queue.shift(); }
      catch (e) { if (offline(e)) await new Promise(r => setTimeout(r, 4000)); else queue.shift(); }
    }
    flushing = false;
  }
  function send(fn, args) { if (!on || !run) return; queue.push([fn, Object.assign({ p_run_id: run }, args)]); flush(); }
  async function drained(ms = 12000) { const end = Date.now() + ms; while (queue.length && Date.now() < end) await new Promise(r => setTimeout(r, 200)); }

  return {
    on,
    check: (userId, roll, name, room) => rpc('check_student', { p_user_id: userId, p_roll_no: roll, p_name: name, p_room: room }),
    async start(userId, room, total, locksTotal) {
      const j = await rpc('start_run', { p_user_id: userId, p_room: room, p_total: total, p_locks_total: locksTotal });
      if (j && j.run_id) run = j.run_id;
      return j;
    },
    answer: (objectId, idx, question, correct, firstTry, tryNo) =>
      send('log_answer', { p_object_id: objectId, p_question_idx: idx, p_question: question, p_correct: correct, p_first_try: firstTry, p_try_no: tryNo }),
    update: (locksOpened, currentLock, elapsed) => send('update_run', { p_locks_opened: locksOpened, p_current_lock: currentLock, p_elapsed_sec: elapsed }),
    async finish(elapsed) {
      if (!on || !run) return null;
      await drained();
      try { return await rpc('finish_run', { p_run_id: run, p_elapsed_sec: elapsed }); } catch (e) { return null; }
    }
  };
})();
