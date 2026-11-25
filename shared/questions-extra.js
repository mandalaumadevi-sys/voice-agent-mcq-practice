/* Extra question types, loaded after questions.js. They plug into QR.render.
     markup    build a rich markup string from pieces; a live terminal shows what rich prints, next to the goal
     typein    a live terminal (or editor line): type the answer and press Enter
     pickmany  tap every card that fits (e.g. which messages get printed)
     spot      same as the base "tap the part", but parts are marked ⟦like this⟧ so code with { } works */
(function () {
  const QR = window.QR, esc = QR.esc, inline = QR.inline;
  const KEYS = ['#ffb547', '#3fd6c6', '#ff7a66', '#b58cff', '#9be564'];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const button = (ctx, label, fn) => { const b = el('button', 'btn'); b.textContent = label; b.onclick = fn; ctx.actions.appendChild(b); return b; };

  /* what rich prints for a markup string: emoji codes become emoji, [style] … [/] become styled spans */
  const EMOJI = { green_circle: '🟢', white_circle: '⚪', red_circle: '🔴', yellow_circle: '🟡' };
  function rich(s) {
    let out = '', open = 0, last = 0, m;
    const re = /\[(\/?)([a-z0-9_ ]*)\]|:([a-z_]+):/g;
    while ((m = re.exec(s))) {
      out += esc(s.slice(last, m.index));
      if (m[3]) out += EMOJI[m[3]] || esc(m[0]);
      else if (m[1]) { if (open) { out += '</span>'; open--; } }
      else { out += `<span class="rs-${m[2].replace(/\s+/g, '-')}">`; open++; }
      last = re.lastIndex;
    }
    return out + esc(s.slice(last)) + '</span>'.repeat(open);
  }
  /* pieces join with a space, except right after an opening tag and right before [/] */
  const isOpen = t => /^\[[a-z0-9_ ]+\]$/.test(t);
  const joinPieces = ps => ps.reduce((s, t, i) => s + (i && !isOpen(ps[i - 1]) && t !== '[/]' ? ' ' : '') + t, '');

  const X = {
    markup(q, ctx) {
      const placed = [];
      const w = el('div', 'mk');
      w.innerHTML = `
        <div class="mkgoal"><small>GOAL · what the terminal must show</small><div class="mkscreen">${rich(joinPieces(q.ans))}</div></div>
        <pre class="code mkline"><span class="mkpre">${esc(q.pre || 'console.print("')}</span><span class="mkslot"></span><span class="mkpost">${esc(q.post || '")')}</span></pre>
        <div class="mkgoal live"><small>YOUR OUTPUT · live</small><div class="mkscreen" id="mkOut"></div></div>`;
      const slot = w.querySelector('.mkslot'), outEl = w.querySelector('#mkOut');
      const bank = el('div', 'tokens');
      const chips = shuffle(q.tok).map((t, n) => { const b = el('button', 'tok'); b.textContent = t; b.style.setProperty('--k', KEYS[n % 5]); bank.appendChild(b); return b; });
      function paint() {
        slot.innerHTML = '';
        if (!placed.length) slot.innerHTML = '<span class="mkhint">tap the pieces below…</span>';
        placed.forEach((t, i) => {
          if (i && !isOpen(placed[i - 1]) && t !== '[/]') slot.appendChild(document.createTextNode(' '));
          const p = el('button', 'mkp'); p.textContent = t;
          p.onclick = () => { if (ctx.locked) return; placed.splice(i, 1); paint(); };
          slot.appendChild(p);
        });
        outEl.innerHTML = placed.length ? rich(joinPieces(placed)) : '<span class="mkempty">nothing printed yet</span>';
        outEl.classList.remove('flash'); void outEl.offsetWidth; outEl.classList.add('flash');
        chips.forEach(c => c.classList.toggle('used', placed.includes(c.textContent)));
        go.disabled = !placed.length;
      }
      chips.forEach(c => c.onclick = () => { if (ctx.locked || placed.includes(c.textContent)) return; placed.push(c.textContent); paint(); });
      ctx.area.append(w, bank);
      const go = button(ctx, 'Print ▸', () => {
        ctx.locked = true; chips.forEach(c => c.classList.add('locked'));
        const ok = placed.length === q.ans.length && placed.every((t, i) => t === q.ans[i]);
        w.classList.add(ok ? 'right' : 'wrong');
        ctx.done(ok);
      });
      paint();
    },

    typein(q, ctx) {
      const t = el('div', 'term tin' + (q.editor ? ' editor' : ''));
      const lines = (q.lines || []).map((l, i) => q.editor
        ? `<div class="tl"><i class="lnum">${i + 1}</i>${QR.hl(l) || ' '}</div>`
        : `<div class="tl">${rich(l)}</div>`).join('');
      const panel = q.panel ? `<div class="rpanel"><span class="rptitle">${esc(q.panel.title)}</span><div>${rich(q.panel.body).replace(/\n/g, '<br>')}</div></div>` : '';
      t.innerHTML = `<div class="termbar"><i></i><i></i><i></i><span>${esc(q.title || 'Terminal')}</span></div>
        <div class="termbody">${lines}${panel}<label class="tl tinrow">${q.editor ? `<i class="lnum">${(q.lines || []).length + 1}</i>` : ''}<span class="tprompt">${rich(q.prompt || '')}</span><input class="tinput" spellcheck="false" autocomplete="off" autocapitalize="off" maxlength="80"><b class="caret"></b></label></div>`;
      ctx.area.appendChild(t);
      const inp = t.querySelector('.tinput'), body = t.querySelector('.termbody');
      const norm = s => q.loose ? s.replace(/\s+/g, '').replace(/'/g, '"') : s.trim();
      function size() { inp.style.width = Math.max(2, inp.value.length + 1) + 'ch'; go.disabled = !inp.value.trim(); }
      inp.addEventListener('input', size);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !go.disabled) go.click(); });
      const go = button(ctx, 'Enter ↵', () => {
        if (ctx.locked) return; ctx.locked = true; inp.readOnly = true;
        const ok = q.ans.some(a => norm(a) === norm(inp.value));
        t.classList.add(ok ? 'right' : 'wrong');
        if (!ok || !q.out) return ctx.done(ok);
        const out = el('div', 'tl out'); body.appendChild(out);
        let k = 0; const txt = q.out; const iv = setInterval(() => { out.textContent = txt.slice(0, ++k); if (k >= txt.length) { clearInterval(iv); setTimeout(() => ctx.done(true), 300); } }, 18);
      });
      size();
      setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) { } }, 350);
    },

    pickmany(q, ctx) {
      const on = new Set();
      const w = el('div', 'pick');
      if (q.head) w.appendChild(el('div', 'pickhead', inline(q.head)));
      const rows = q.items.map((it, i) => {
        const r = el('button', 'pickrow', `<i>${i}</i><span class="ptag ${esc(it.tag || '')}">${esc(it.tag || '')}</span><span class="ptxt">${inline(it.text)}</span><b class="pcheck"></b>`);
        r.onclick = () => { if (ctx.locked) return; on.has(i) ? on.delete(i) : on.add(i); r.classList.toggle('on'); go.disabled = !on.size; };
        w.appendChild(r); return r;
      });
      ctx.area.appendChild(w);
      const go = button(ctx, 'Lock in', () => {
        ctx.locked = true;
        rows.forEach((r, i) => { const want = q.a.includes(i); if (want || on.has(i)) r.classList.add(want === on.has(i) ? 'right' : 'wrong'); });
        ctx.done(q.a.length === on.size && q.a.every(i => on.has(i)));
      });
      go.disabled = true;
    },

    spot(q, ctx) {
      const pre = el('pre', 'code spot'); let k = 0;
      pre.innerHTML = q.code.split('\n').map(l => `<span class="ln">${l.split(/(⟦.*?⟧)/).map(part => {
        const m = part.match(/^⟦(.*)⟧$/);
        return m ? `<span class="spotpart" data-i="${k++}">${QR.hl(m[1])}</span>` : QR.hl(part);
      }).join('') || ' '}</span>`).join('');
      ctx.area.appendChild(pre);
      pre.querySelectorAll('.spotpart').forEach(sp => sp.onclick = () => {
        if (pre.classList.contains('done')) return; pre.classList.add('done');
        const ok = +sp.dataset.i === q.a; sp.classList.add(ok ? 'right' : 'wrong');
        if (!ok) pre.querySelector(`.spotpart[data-i="${q.a}"]`).classList.add('hint');
        ctx.done(ok);
      });
    }
  };

  const base = QR.render;
  QR.rich = rich;
  QR.render = (q, ctx) => (X[q.t] && (q.t !== 'spot' || q.code.includes('⟦')) ? X[q.t] : base)(q, ctx);
})();
