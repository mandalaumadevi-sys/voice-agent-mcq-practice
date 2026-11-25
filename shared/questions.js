/* Question renderers for the escape rooms.
   QR.render(q, ctx) draws one question into ctx.area and calls ctx.done(isCorrect) once.
   ctx = { area, actions, done }
   Types (drag and drop, every drag also works by tapping):
     cloze   drag words into a sentence        terminal  drag a command/output into a terminal, it then runs
     swipe   fling statement cards TRUE/FALSE  dial      turn a studio knob to a value
     flow    drag parts into a flow diagram    spot      tap the exact part of the code
     dragto  drag one item onto its target     sort      drag cards into two boxes
     match   wire plugs to sockets             fill      drag code tokens into blanks
     order   drag steps into order             bug       tap the buggy line
     choice  (kept for future rooms, not used in the Voice Agent room) */
(function () {
  const KEYS = ['#ffb547', '#3fd6c6', '#ff7a66', '#b58cff', '#9be564'];
  const KW = new Set(['def', 'return', 'for', 'in', 'if', 'else', 'not', 'or', 'and', 'import', 'from', 'as', 'with', 'while', 'break', 'None', 'True', 'False']);
  const BI = new Set(['print', 'str', 'len', 'os', 'np', 'sd', 'sf', 'aai', 'console']);

  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const inline = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');

  function hl(line) {
    const re = /(#.*$)|((?:r|f)?"(?:[^"\\]|\\.)*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)(?=\s*\()|([A-Za-z_]\w*)/g;
    let out = '', last = 0, m;
    while ((m = re.exec(line))) {
      out += esc(line.slice(last, m.index));
      const t = esc(m[0]);
      if (m[1]) out += `<span class="cm">${t}</span>`;
      else if (m[2]) out += `<span class="st">${t}</span>`;
      else if (m[3]) out += `<span class="nu">${t}</span>`;
      else if (m[4]) out += KW.has(m[4]) ? `<span class="kw">${t}</span>` : `<span class="fn">${t}</span>`;
      else out += KW.has(m[5]) ? `<span class="kw">${t}</span>` : BI.has(m[5]) ? `<span class="bi">${t}</span>` : t;
      last = re.lastIndex;
    }
    return out + esc(line.slice(last));
  }
  function codeBlock(src) {
    const pre = document.createElement('pre');
    pre.className = 'code';
    pre.innerHTML = src.split('\n').map(l => `<span class="ln">${hl(l) || ' '}</span>`).join('');
    return pre;
  }
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
  function chip(t, mono) { const b = el('button', 'chip' + (mono ? ' mono' : '')); b.textContent = t; return b; }
  function button(ctx, label, onClick, ghost) { const b = el('button', ghost ? 'btn ghost' : 'btn'); b.textContent = label; b.onclick = onClick; ctx.actions.appendChild(b); return b; }


  /* ---------- drag and drop: drag onto a target, or tap (onTap) ---------- */
  function dnd(item, targets, onDrop, onTap) {
    item.style.touchAction = 'none';
    let justDragged = false;
    /* a tap is a normal click (mouse, touch or keyboard); a click right after a drag is ignored */
    item.addEventListener('click', () => { if (justDragged) { justDragged = false; return; } if (onTap && !item.classList.contains('locked')) onTap(); });
    item.addEventListener('pointerdown', e => {
      if (item.disabled || item.classList.contains('locked')) return;
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY; let ghost = null, over = null, dx = 0, dy = 0;
      const move = ev => {
        if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        if (!ghost) {
          const r = item.getBoundingClientRect(); dx = sx - r.left; dy = sy - r.top;
          ghost = item.cloneNode(true); ghost.classList.add('ghost');
          Object.assign(ghost.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', margin: 0, zIndex: 100, pointerEvents: 'none' });
          document.body.appendChild(ghost); item.classList.add('dragging');
        }
        ghost.style.left = ev.clientX - dx + 'px'; ghost.style.top = ev.clientY - dy + 'px';
        const hit = document.elementFromPoint(ev.clientX, ev.clientY), t = hit && targets().find(x => x.contains(hit));
        if (t !== over) { over && over.classList.remove('over'); over = t; over && over.classList.add('over'); }
      };
      const up = () => {
        removeEventListener('pointermove', move); removeEventListener('pointerup', up);
        item.classList.remove('dragging');
        if (ghost) { justDragged = true; setTimeout(() => justDragged = false, 0); ghost.remove(); if (over) { over.classList.remove('over'); onDrop(over); } }
      };
      addEventListener('pointermove', move); addEventListener('pointerup', up);
    });
  }

  /* slots + a bank of word chips: drag a chip onto any slot, or tap it to fill the next empty slot; tap a slot to empty it */
  function placer(ctx, slots, toks, answer, opts = {}) {
    const vals = slots.map(() => null);
    const bank = el('div', 'tokens' + (opts.wide ? ' wide' : ''));
    const chips = shuffle(toks).map((t, n) => { const b = el('button', 'tok' + (opts.mono === false ? ' prose' : '')); b.textContent = t; b.style.setProperty('--k', KEYS[n % 5]); bank.appendChild(b); return b; });
    function put(i, t) { const prev = vals.indexOf(t); if (prev > -1) vals[prev] = null; vals[i] = t; paint(); }
    function paint() {
      slots.forEach((s, i) => { s.textContent = vals[i] ?? (opts.blank || '?'); s.classList.toggle('full', vals[i] != null); s.classList.remove('right', 'wrong'); });
      chips.forEach(c => c.classList.toggle('used', vals.includes(c.textContent)));
      go.disabled = vals.includes(null);
    }
    chips.forEach(c => dnd(c, () => slots, s => put(slots.indexOf(s), c.textContent), () => {
      if (vals.includes(c.textContent)) return;
      const i = vals.indexOf(null); if (i > -1) put(i, c.textContent);
    }));
    slots.forEach((s, i) => s.addEventListener('click', () => { if (vals[i] != null) { vals[i] = null; paint(); } }));
    const go = button(ctx, opts.go || 'Lock in', () => {
      const ok = vals.map((v, i) => v === answer[i]);
      slots.forEach((s, i) => s.classList.add(ok[i] ? 'right' : 'wrong'));
      chips.forEach(c => c.classList.add('locked'));
      const all = ok.every(Boolean);
      if (opts.after && all) opts.after(() => ctx.done(true)); else ctx.done(all);
    });
    paint();
    return bank;
  }
  const slotHTML = (txt, cls) => esc(txt).replace(/\[\[(\d)\]\]/g, `<span class="${cls}" data-b="$1"></span>`);
  const R = {
    choice(q, ctx) {
      const g = el('div', 'opts');
      shuffle(q.o.map((t, k) => ({ t, k }))).forEach((x, n) => {
        const b = el('button', 'opt' + (q.mono ? ' mono' : ''), `<span class="k">${'ABCD'[n]}</span><span>${esc(x.t)}</span>`);
        b.style.setProperty('--k', KEYS[n]);
        b.onclick = () => { g.querySelectorAll('.opt').forEach(o => o.disabled = true); b.classList.add(x.k === q.a ? 'right' : 'wrong'); ctx.done(x.k === q.a); };
        g.appendChild(b);
      });
      ctx.area.appendChild(g);
    },

    /* sentence with blanks: drag words in */
    cloze(q, ctx) {
      const p = el('div', 'cloze', slotHTML(q.text, 'cslot'));
      const slots = [...p.querySelectorAll('.cslot')].sort((a, b) => a.dataset.b - b.dataset.b);
      ctx.area.append(p, placer(ctx, slots, q.tok, q.ans, { mono: false, blank: '      ' }));
    },

    /* a terminal: drag the command / output into the prompt; on a right answer it "runs" */
    terminal(q, ctx) {
      const t = el('div', 'term');
      t.innerHTML = `<div class="termbar"><i></i><i></i><i></i><span>${esc(q.title || 'Terminal')}</span></div>` +
        `<div class="termbody">${q.lines.map(l => `<div class="tl">${slotHTML(l, 'tslot')}</div>`).join('')}</div>`;
      const slots = [...t.querySelectorAll('.tslot')].sort((a, b) => a.dataset.b - b.dataset.b);
      ctx.area.append(t, placer(ctx, slots, q.tok, q.ans, {
        blank: '▮', go: 'Run ▸',
        after: next => {
          if (!q.out) return next();
          const out = el('div', 'tl out'); t.querySelector('.termbody').appendChild(out);
          let k = 0; const iv = setInterval(() => { out.textContent = q.out.slice(0, ++k); if (k >= q.out.length) { clearInterval(iv); setTimeout(next, 350); } }, 18);
        }
      }));
    },

    /* statement cards: fling each one into TRUE or FALSE */
    swipe(q, ctx) {
      const cards = shuffle(q.S.map(([s, v], k) => ({ s, v, k }))), placed = [];
      const w = el('div', 'swipe');
      const binF = el('div', 'swbin f', '<b>✗ FALSE</b><div class="swlist"></div>');
      const binT = el('div', 'swbin t', '<b>TRUE ✓</b><div class="swlist"></div>');
      const deck = el('div', 'swdeck');
      w.append(binF, deck, binT); ctx.area.appendChild(w);
      function place(isTrue) {
        const c = cards.find(x => !placed.some(p => p.k === x.k)); if (!c) return;
        placed.push({ k: c.k, ans: isTrue }); draw();
      }
      function draw() {
        deck.innerHTML = '';
        const left = cards.filter(x => !placed.some(p => p.k === x.k));
        left.slice(0, 3).reverse().forEach((c, i, arr) => {
          const top = i === arr.length - 1;
          const card = el('div', 'swcard' + (top ? ' top' : ''), `<p>${inline(c.s)}</p>${top ? '<small>drag me ◀ ▶</small>' : ''}`);
          card.style.setProperty('--d', arr.length - 1 - i);
          if (top) { card.dataset.k = c.k; dnd(card, () => [binF, binT], b => place(b === binT)); }
          deck.appendChild(card);
        });
        if (!left.length) deck.innerHTML = '<div class="swdone">All sorted. Lock in?</div>';
        [binF, binT].forEach((b, bi) => {
          b.querySelector('.swlist').innerHTML = placed.filter(p => p.ans === !!bi).map(p => `<span data-k="${p.k}">${inline(cards.find(c => c.k === p.k).s)}</span>`).join('');
          b.querySelectorAll('span').forEach(sp => sp.onclick = e => { e.stopPropagation(); if (ctx.locked) return; placed.splice(placed.findIndex(p => p.k === +sp.dataset.k), 1); draw(); });
        });
        go.disabled = placed.length !== cards.length;
      }
      binF.addEventListener('click', () => place(false)); binT.addEventListener('click', () => place(true));
      const go = button(ctx, 'Lock in', () => {
        ctx.locked = true;
        [binF, binT].forEach(b => b.querySelectorAll('span').forEach(sp => { const p = placed.find(x => x.k === +sp.dataset.k); sp.classList.add(q.S[p.k][1] === p.ans ? 'right' : 'wrong'); }));
        ctx.done(placed.every(p => q.S[p.k][1] === p.ans));
      });
      draw();
    },

    /* a studio knob: turn it (drag around it) or tap a value */
    dial(q, ctx) {
      const n = q.values.length, a0 = -130, a1 = 130, ang = i => a0 + (a1 - a0) * i / (n - 1);
      let cur = 0;
      const w = el('div', 'dialw');
      const R0 = 92, C = 120;
      const labels = q.values.map((v, i) => { const t = (ang(i) - 90) * Math.PI / 180; return `<button class="dval" data-i="${i}" style="left:${C + Math.cos(t) * (R0 + 34)}px;top:${C + Math.sin(t) * (R0 + 34)}px">${esc(v)}</button>`; }).join('');
      const ticks = q.values.map((_, i) => `<line x1="${C}" y1="${C - R0 + 4}" x2="${C}" y2="${C - R0 + 16}" transform="rotate(${ang(i)} ${C} ${C})"/>`).join('');
      w.innerHTML = `<div class="dialbox"><svg viewBox="0 0 240 240" class="dialsvg"><circle cx="120" cy="120" r="${R0}" class="ring"/><g class="ticks">${ticks}</g>
        <g class="knob"><circle cx="120" cy="120" r="62"/><circle cx="120" cy="120" r="52" class="inner"/><rect x="116" y="66" width="8" height="26" rx="4" class="mark"/></g></svg>${labels}</div>
        <div class="dialread"><b id="dialv"></b><span>${esc(q.unit || '')}</span></div>`;
      ctx.area.appendChild(w);
      const knob = w.querySelector('.knob'), box = w.querySelector('.dialbox');
      function set(i) { cur = Math.max(0, Math.min(n - 1, i)); knob.style.transform = `rotate(${ang(cur)}deg)`; w.querySelector('#dialv').textContent = q.values[cur]; w.querySelectorAll('.dval').forEach((b, k) => b.classList.toggle('on', k === cur)); }
      w.querySelectorAll('.dval').forEach(b => b.onclick = () => set(+b.dataset.i));
      w.querySelector('.dialsvg').addEventListener('pointerdown', e => {
        e.preventDefault();
        const turn = ev => { const r = box.getBoundingClientRect(); const deg = Math.atan2(ev.clientY - (r.top + r.height / 2), ev.clientX - (r.left + r.width / 2)) * 180 / Math.PI + 90; const d = ((deg + 540) % 360) - 180; set(Math.round((d - a0) / (a1 - a0) * (n - 1))); };
        turn(e);
        const up = () => { removeEventListener('pointermove', turn); removeEventListener('pointerup', up); };
        addEventListener('pointermove', turn); addEventListener('pointerup', up);
      });
      set(q.start ?? 0);
      button(ctx, 'Lock in', () => { w.classList.add(cur === q.a ? 'right' : 'wrong'); ctx.done(cur === q.a); });
    },

    /* a flow diagram with empty boxes: drag the parts in */
    flow(q, ctx) {
      const f = el('div', 'flow');
      f.innerHTML = q.nodes.map((nd, i) => (i ? '<span class="farrow">→</span>' : '') + (/^\[\[\d\]\]$/.test(nd) ? slotHTML(nd, 'fslot') : `<span class="fnode">${inline(nd)}</span>`)).join('');
      const slots = [...f.querySelectorAll('.fslot')].sort((a, b) => a.dataset.b - b.dataset.b);
      ctx.area.append(f, placer(ctx, slots, q.tok, q.ans, { blank: 'drop here' }));
    },

    /* tap the exact part of the code; parts are marked {{like this}} */
    spot(q, ctx) {
      const pre = el('pre', 'code spot'); let k = 0;
      pre.innerHTML = q.code.split('\n').map(l => `<span class="ln">${l.split(/(\{\{.*?\}\})/).map(part => {
        const m = part.match(/^\{\{(.*)\}\}$/);
        return m ? `<span class="spotpart" data-i="${k++}">${hl(m[1])}</span>` : hl(part);
      }).join('') || ' '}</span>`).join('');
      ctx.area.appendChild(pre);
      pre.querySelectorAll('.spotpart').forEach(sp => sp.onclick = () => {
        if (pre.classList.contains('done')) return; pre.classList.add('done');
        const ok = +sp.dataset.i === q.a; sp.classList.add(ok ? 'right' : 'wrong');
        if (!ok) pre.querySelector(`.spotpart[data-i="${q.a}"]`).classList.add('hint');
        ctx.done(ok);
      });
    },

    /* drag one item onto the target where it belongs (or tap the target) */
    dragto(q, ctx) {
      const w = el('div', 'dragto');
      const item = el('div', 'dtitem', `<span class="dticon">${q.icon || '✋'}</span><span>${inline(q.item)}</span>`);
      const row = el('div', 'dttargets');
      const targets = q.targets.map((t, i) => { const d = el('button', 'dttarget', inline(t)); d.dataset.i = i; row.appendChild(d); return d; });
      w.append(item, el('div', 'dthint', '↓ drag it onto the right place ↓'), row); ctx.area.appendChild(w);
      const pick = t => {
        if (w.classList.contains('done')) return; w.classList.add('done');
        const ok = +t.dataset.i === q.a; t.classList.add(ok ? 'right' : 'wrong'); t.appendChild(item); item.classList.add('landed');
        ctx.done(ok);
      };
      dnd(item, () => targets, pick);
      targets.forEach(t => t.addEventListener('click', () => pick(t)));
    },

    /* cards into two boxes */
    sort(q, ctx) {
      const put = new Map(); let pick = null;
      const w = el('div', 'sortw'), pool = el('div', 'pool'), bk = el('div', 'buckets');
      const buckets = q.B.map((name, bi) => {
        const d = el('div', 'bucket', `<b>${esc(name)}</b>`); d.style.setProperty('--bc', KEYS[bi + 1]);
        d.onclick = () => { if (pick === null) return; put.set(pick, bi); pick = null; refresh(); };
        bk.appendChild(d); return d;
      });
      const items = shuffle(q.items.map((it, k) => ({ t: it[0], k })));
      function refresh() {
        pool.innerHTML = '';
        buckets.forEach(d => { d.querySelectorAll('.chip').forEach(c => c.remove()); d.classList.toggle('ready', pick !== null); });
        items.forEach(x => {
          const c = chip(x.t, q.mono);
          if (put.has(x.k)) { c.onclick = e => { e.stopPropagation(); put.delete(x.k); refresh(); }; buckets[put.get(x.k)].appendChild(c); }
          else {
            if (pick === x.k) c.classList.add('act');
            dnd(c, () => buckets, b => { put.set(x.k, buckets.indexOf(b)); pick = null; refresh(); }, () => { pick = pick === x.k ? null : x.k; refresh(); });
            pool.appendChild(c);
          }
        });
        if (!pool.children.length) pool.appendChild(el('span', 'pooldone', 'All placed. Lock in?'));
        go.disabled = put.size !== q.items.length;
      }
      w.append(pool, bk); ctx.area.appendChild(w);
      const go = button(ctx, 'Lock in', () => ctx.done(q.items.every((it, k) => put.get(k) === it[1])));
      refresh();
    },

    /* match = wiring: drag a wire from each plug (left) to a socket (right); tap plug then socket also works */
    match(q, ctx) {
      const cols = ['#ffb547', '#3fd6c6', '#ff7a66', '#b58cff', '#9be564'], NS = 'http://www.w3.org/2000/svg';
      const wrap = el('div', 'wire'), L = el('div', 'wcol'), Rc = el('div', 'wcol');
      const sv = document.createElementNS(NS, 'svg'); sv.setAttribute('class', 'wires');
      wrap.append(L, Rc, sv); ctx.area.appendChild(wrap);
      const pairs = {}; let drag = null, armed = null, fresh = null, judged = null;
      const plugs = q.L.map((t, k) => {
        const b = el('div', 'plug', `<span>${esc(t)}</span><i class="jack"></i>`);
        b.style.setProperty('--c', cols[k % cols.length]); L.appendChild(b); return b;
      });
      const socks = [];
      shuffle(q.R.map((t, k) => ({ t, k }))).forEach(x => { const b = el('div', 'sock', `<i class="jack"></i><span>${esc(x.t)}</span>`); b.dataset.r = x.k; socks[x.k] = b; Rc.appendChild(b); });
      const jack = e => { const j = e.querySelector('.jack').getBoundingClientRect(), w = wrap.getBoundingClientRect(); return [j.left + j.width / 2 - w.left, j.top + j.height / 2 - w.top]; };
      const curve = (a, b) => { const dx = Math.max(30, Math.abs(b[0] - a[0]) * .5); return `M${a[0]} ${a[1]} C${a[0] + dx} ${a[1]} ${b[0] - dx} ${b[1]} ${b[0]} ${b[1]}`; };
      function path(d, color, cls) { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('stroke', color); p.setAttribute('pathLength', '100'); if (cls) p.setAttribute('class', cls); sv.appendChild(p); return p; }
      function draw() {
        sv.innerHTML = '';
        sv.setAttribute('viewBox', `0 0 ${wrap.clientWidth} ${wrap.clientHeight}`);
        Object.keys(pairs).forEach(l => {
          const c = cols[l % cols.length], a = jack(plugs[l]), b = jack(socks[pairs[l]]);
          const cls = judged ? (pairs[l] === +l ? 'ok' : 'bad') : (+l === fresh ? 'new' : '');
          path(curve(a, b), c, cls);
          if (+l === fresh) { const sp = document.createElementNS(NS, 'circle'); sp.setAttribute('cx', b[0]); sp.setAttribute('cy', b[1]); sp.setAttribute('r', 14); sp.setAttribute('fill', c); sp.setAttribute('class', 'spark'); sv.appendChild(sp); }
        });
        if (drag) path(curve(jack(plugs[drag.k]), [drag.x, drag.y]), cols[drag.k % cols.length], 'live');
        plugs.forEach((p, k) => { p.classList.toggle('on', k in pairs); p.classList.toggle('armed', armed === k); });
        socks.forEach((s, r) => { const l = Object.keys(pairs).find(k => pairs[k] === r); s.classList.toggle('on', l !== undefined); if (l !== undefined) s.style.setProperty('--c', cols[l % cols.length]); });
        go.disabled = Object.keys(pairs).length !== q.L.length;
        fresh = null;
      }
      function connect(k, r) {
        for (const l in pairs) if (pairs[l] === r) delete pairs[l];
        pairs[k] = r; fresh = k; armed = null; draw();
      }
      plugs.forEach((p, k) => p.addEventListener('pointerdown', e => {
        if (judged) return;
        e.preventDefault();
        delete pairs[k];
        const w = wrap.getBoundingClientRect();
        drag = { k, x: e.clientX - w.left, y: e.clientY - w.top, x0: e.clientX, y0: e.clientY };
        draw();
      }));
      const move = e => { if (!drag) return; const w = wrap.getBoundingClientRect(); drag.x = e.clientX - w.left; drag.y = e.clientY - w.top; draw(); };
      const up = e => {
        if (!drag) return;
        const k = drag.k, tap = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6;
        drag = null;
        const hit = document.elementFromPoint(e.clientX, e.clientY), s = hit && hit.closest('.sock');
        if (s && wrap.contains(s)) connect(k, +s.dataset.r);
        else { armed = tap ? k : null; draw(); }
      };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
      socks.forEach((s, r) => s.addEventListener('click', () => { if (armed !== null && !judged) connect(armed, r); }));
      const ro = new ResizeObserver(() => { if (!wrap.isConnected) { ro.disconnect(); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); return; } draw(); });
      ro.observe(wrap);
      const go = button(ctx, 'Lock in', () => { judged = true; draw(); ctx.done(q.L.every((_, k) => pairs[k] === k)); });
      draw();
    },

    /* code with blanks: drag tokens in */
    fill(q, ctx) {
      const pre = el('pre', 'code');
      pre.innerHTML = q.code.split('\n').map(l => `<span class="ln">${hl(l.replace(/\[\[(\d)\]\]/g, 'BLANKx$1x')).replace(/(?:<span class="\w+">)?BLANKx(\d)x(?:<\/span>)?/g, '<span class="blank" data-b="$1"></span>') || ' '}</span>`).join('');
      const slots = [...pre.querySelectorAll('.blank')].sort((a, b) => a.dataset.b - b.dataset.b);
      ctx.area.append(pre, placer(ctx, slots, q.tok, q.ans));
    },
    bug(q, ctx) {
      const pre = codeBlock(q.code); pre.classList.add('bug'); ctx.area.appendChild(pre);
      const lines = q.code.split('\n');
      [...pre.children].forEach((ln, k) => {
        if (!lines[k].trim()) return;
        ln.onclick = () => {
          pre.querySelectorAll('.ln').forEach(x => x.onclick = null);
          ln.classList.add(k === q.line ? 'got' : 'hit');
          ctx.done(k === q.line);
        };
      });
    },

    /* steps into numbered slots: drag them in (or tap in order) */
    order(q, ctx) {
      const w = el('div', 'ordlist');
      q.o.forEach((_, n) => w.appendChild(el('div', 'ordrow', `<i>${n + 1}</i><span class="oslot" data-b="${n}"></span>`)));
      const slots = [...w.querySelectorAll('.oslot')];
      const plain = q.o.map(t => t.replace(/`/g, ''));
      const two = el('div', 'ordtwo'); two.append(w, placer(ctx, slots, plain, plain, { mono: false, blank: 'drop a step here', wide: true }));
      ctx.area.appendChild(two);
    }
  };

  window.QR = { esc, inline, hl, codeBlock, render(q, ctx) { R[q.t](q, ctx); } };
})();
