/* ════════════════════════════════════════════════════════════
   ACSMS Practice — the self-report form machinery + record cards.
   There is no standalone practice-log view: the form is shared by
   the quick-capture overlay (Ctrl+Shift+N), the skill-detail views
   and the path stepper, and practice history is reached through
   the skills (detail views, dashboard feed). The form only offers
   skills that already exist — you cannot self-report practice on
   a skill that does not exist (the server enforces this too).
   ════════════════════════════════════════════════════════════ */
window.ACSMS = window.ACSMS || {};
ACSMS.Practice = (() => {

  function ratingField(p, name, label, hint) {
    let btns = '';
    for (let i = 1; i <= 5; i++) btns += `<button type="button" data-val="${i}">${i}</button>`;
    return `<div class="rating-field"><label>${label}</label>
      <div class="rating-seg" id="${p}-${name}">${btns}</div>
      <span class="rating-hint">${hint}</span></div>`;
  }

  function formHTML(p, selectedSkillId) {
    const opts = ACSMS.Store.activeSkills().map(s =>
      `<option value="${s.id}" ${s.id === selectedSkillId ? 'selected' : ''}>${ACSMS.esc(s.name)}</option>`).join('');
    return `<div class="form-grid">
      <div class="form-group">
        <label for="${p}-skill">Skill</label>
        <select id="${p}-skill"><option value="">Select a skill…</option>${opts}</select>
        <div class="form-hint">Only defined skills can be practiced — define the skill first.</div>
      </div>
      <div class="form-group">
        <label for="${p}-date">Date</label>
        <input type="date" id="${p}-date" value="${ACSMS.dateInputVal()}">
      </div>
      <div class="form-group">
        <label for="${p}-dur">Duration (min)</label>
        <input type="number" id="${p}-dur" min="0" max="1440" placeholder="e.g. 45">
      </div>
      <div class="form-group">
        <label for="${p}-url">Evidence URL</label>
        <input type="text" id="${p}-url" placeholder="link to the output (optional)">
      </div>
      <div class="form-group span-2">
        <label for="${p}-notes">Notes</label>
        <textarea id="${p}-notes" rows="2" placeholder="What did you do? What was produced?"></textarea>
      </div>
      ${ratingField(p, 'quality', 'Quality', 'how well did the session go?')}
      ${ratingField(p, 'confidence', 'Confidence', 'how capable do you feel now?')}
    </div>`;
  }

  function bindRatings(p) {
    ['quality', 'confidence'].forEach(name => {
      const seg = document.getElementById(`${p}-${name}`);
      if (!seg || seg.dataset.bound) return;
      seg.dataset.bound = '1';
      seg.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        const on = b.classList.contains('active');
        seg.querySelectorAll('button').forEach(x => x.classList.remove('active'));
        if (!on) b.classList.add('active');   // click the active value to clear
      });
    });
  }

  function readForm(p) {
    const skillId = document.getElementById(`${p}-skill`)?.value;
    if (!skillId) { ACSMS.toast('Choose a skill first — define it if it does not exist'); return null; }
    const dateVal = document.getElementById(`${p}-date`)?.value;
    const durRaw = document.getElementById(`${p}-dur`)?.value;
    return {
      skill_id: skillId,
      practiced_at_ms: dateVal ? new Date(dateVal + 'T12:00:00').getTime() : Date.now(),
      duration_min: durRaw ? parseInt(durRaw, 10) : null,
      notes: document.getElementById(`${p}-notes`)?.value.trim() || '',
      quality: document.getElementById(`${p}-quality`)?.querySelector('.active')?.dataset.val || null,
      confidence: document.getElementById(`${p}-confidence`)?.querySelector('.active')?.dataset.val || null,
      evidence_url: document.getElementById(`${p}-url`)?.value.trim() || '',
    };
  }

  async function submitForm(p) {
    const body = readForm(p);
    if (!body) return null;
    try {
      const doc = await ACSMS.Store.createPractice(body);
      await ACSMS.Store.refresh();
      ACSMS.resetForm(p);
      ACSMS.toast('Practice recorded — ' + doc.skill_name);
      // the current view may surface this skill's stats or feed — re-render it
      if (ACSMS.currentBase === 'skills' && (ACSMS.current || '').indexOf('/') > 0) {
        ACSMS.navigate(ACSMS.current);
      } else if (ACSMS.currentBase === 'dashboard') {
        ACSMS.navigate('dashboard');
      }
      return doc;
    } catch (e) {
      ACSMS.toast('Could not record practice: ' + e.message);
      return null;
    }
  }

  function resetForm(p) {
    const ids = [`${p}-dur`, `${p}-notes`, `${p}-url`];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    ['quality', 'confidence'].forEach(name => {
      document.getElementById(`${p}-${name}`)?.querySelectorAll('.active').forEach(b => b.classList.remove('active'));
    });
  }

  // ── record card (dashboard feed + skill-detail history) ──
  function safeEvidenceHref(url) {
    // an http page may never link file:// — render such values as text
    return /^file:/i.test(url || '') ? null : url;
  }

  function practiceCard(doc) {
    const stars = (n) => n ? `<span class="rc-rating rating-stars" title="${n}/5">${'★'.repeat(n)}<span class="off">${'★'.repeat(5 - n)}</span></span>` : '';
    const evHref = safeEvidenceHref(doc.evidence_url);
    const ev = doc.evidence_url
      ? (evHref ? `<a class="rc-tag" href="${ACSMS.esc(evHref)}" target="_blank" rel="noopener">evidence ↗</a>`
                : `<span class="rc-tag">${ACSMS.esc(doc.evidence_url)}</span>`)
      : '';
    return `<div class="record-card animate-in" data-id="${doc.id}" data-open="${doc.id}" title="Open the session detail">
      <button class="btn-icon rc-del" data-del="${doc.id}" aria-label="Delete practice report">${ACSMS.icon('trash-2', 15)}</button>
      <div class="rc-title"><a href="#skills/${doc.skill_id}">${ACSMS.esc(doc.skill_name || nameOf(doc))}</a></div>
      ${doc.notes ? `<div class="rc-preview">${ACSMS.esc(doc.notes)}</div>` : ''}
      <div class="rc-meta">
        <span>${ACSMS.fmtTime(doc.practiced_at_ms)}</span>
        ${doc.duration_min != null ? `<span>· ${doc.duration_min} min</span>` : ''}
        ${stars(doc.quality)}${stars(doc.confidence)}
        ${ev}
      </div>
    </div>`;
  }

  // ── session detail modal — the complete assessment of one record ──
  // Practice records may carry a structured `data` payload owned by the
  // skill kind (typing: wpm/raw/acc/cons, per-second series, key report).
  // This modal renders that payload; records without one fall back to
  // the shared fields.
  const INK = '#2C2A26', MUT = '#8C877B', RED = '#7A1A2A', HAIR = 'rgba(44,42,38,.12)';

  function niceStep(max) {
    for (const s of [5, 10, 20, 25, 50, 100]) if (max / s <= 6) return s;
    return 100;
  }

  function drawSessionChart(cv, sec, animate) {
    const w = cv.clientWidth || 600, h = 230, dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.height = h + 'px';
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const P = { l: 46, r: 14, t: 18, b: 30 };
    const n = Math.max(sec.length, 2);
    const maxV = Math.max(20, ...sec.map(s => Math.max(s.w, s.r)));
    const yMax = Math.ceil(maxV * 1.15 / 10) * 10;
    const X = i => P.l + (i / (n - 1)) * (w - P.l - P.r);
    const Y = v => P.t + (1 - v / yMax) * (h - P.t - P.b);
    const t0 = performance.now(), dur = animate ? 850 : 1;
    function draw(now) {
      const p = animate ? Math.min(1, (now - t0) / dur) : 1;
      const e = 1 - Math.pow(1 - p, 3);
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1; ctx.strokeStyle = HAIR; ctx.fillStyle = MUT;
      ctx.font = '500 9px "IBM Plex Mono", monospace'; ctx.textAlign = 'right';
      const step = niceStep(yMax);
      for (let v = step; v <= yMax; v += step) {
        const y = Math.round(Y(v)) + .5;
        ctx.beginPath(); ctx.moveTo(P.l, y); ctx.lineTo(w - P.r, y); ctx.stroke();
        ctx.fillText(v, P.l - 8, y + 3);
      }
      ctx.textAlign = 'center';
      const xs = Math.max(1, Math.ceil(n / 9));
      for (let i = 0; i < sec.length; i += xs) ctx.fillText((i + 1) + 's', X(i), h - 10);
      ctx.strokeStyle = HAIR;
      ctx.beginPath(); ctx.moveTo(P.l, h - P.b + .5); ctx.lineTo(w - P.r, h - P.b + .5); ctx.stroke();
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, P.l + (w - P.l - P.r) * e + 2, h); ctx.clip();
      ctx.strokeStyle = MUT; ctx.lineWidth = 1.4; ctx.beginPath();
      sec.forEach((s, i) => { i ? ctx.lineTo(X(i), Y(s.r)) : ctx.moveTo(X(i), Y(s.r)); }); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      sec.forEach((s, i) => { i ? ctx.lineTo(X(i), Y(s.w)) : ctx.moveTo(X(i), Y(s.w)); }); ctx.stroke();
      ctx.fillStyle = INK;
      sec.forEach((s, i) => { ctx.beginPath(); ctx.arc(X(i), Y(s.w), 2.2, 0, 7); ctx.fill(); });
      ctx.fillStyle = RED;
      sec.forEach((s, i) => { if (s.e > 0) { const bh = Math.min(16, 3 + s.e * 3); ctx.fillRect(X(i) - 1.5, h - P.b - bh, 3, bh); } });
      ctx.restore();
      if (animate && p < 1) requestAnimationFrame(draw);
    }
    if (animate) requestAnimationFrame(draw); else draw(performance.now());
  }

  function renderKbdInto(el, ke) {
    const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    el.innerHTML = ROWS.map(row => `<div class="ses-kbd-row">${[...row].map(ch => {
      const s = ke[ch] || { p: 0, e: 0 };
      const rate = s.p ? s.e / s.p : 0;
      let style = '', badge = '';
      if (s.e > 0) {
        const a = Math.min(.85, .15 + rate * 2.2);
        style = ` style="background:rgba(122,26,42,${a});border-color:rgba(122,26,42,.55);${a > .45 ? 'color:#FAF1E6' : ''}"`;
        badge = `<span class="ses-key-n">${s.e}</span>`;
      }
      const title = `${ch} — ${s.p} presses · ${s.e} misses · ${(100 * (1 - rate)).toFixed(1)}% key accuracy`;
      return `<div class="ses-key"${style} title="${title}">${badge}${ch.toUpperCase()}</div>`;
    }).join('')}</div>`).join('');
  }

  function renderTroubleInto(el, ke, ty, top) {
    const rows = [];
    for (const ch in ke) {
      if (!/[a-z]/.test(ch)) continue;
      if (ke[ch].e > 0) rows.push({ ch, s: ke[ch] });
    }
    rows.sort((a, b) => b.s.e - a.s.e);
    if (!rows.length) { el.innerHTML = '<div class="ses-tempty">flawless — not a single wrong key.</div>'; return; }
    el.innerHTML = rows.slice(0, top).map(({ ch, s }) => {
      const rate = 100 * (1 - s.e / s.p);
      let wrong = null, wc = 0;
      if (ty && ty[ch]) for (const g in ty[ch]) if (ty[ch][g] > wc) { wc = ty[ch][g]; wrong = g; }
      const wrongHtml = wrong ? ` · usually hit <b>${wrong === ' ' ? '␣' : wrong}</b> instead (${wc}×)` : '';
      return `<div class="ses-trow">
        <span class="ses-tkey">${ch}</span>
        <div class="ses-tdesc"><b>${s.e}</b> ${s.e === 1 ? 'miss' : 'misses'}${wrongHtml}</div>
        <div class="ses-tacc">${rate.toFixed(0)}%<span>key acc</span></div>
      </div>`;
    }).join('');
  }

  function showSessionModal(doc) {
    if (!doc) return;
    document.querySelectorAll('.session-overlay').forEach(m => m.remove());
    const d = doc.data || {};
    const isTyping = d.skill === 'typing';
    const dur = doc.duration_min != null ? doc.duration_min + ' min' : '—';
    const evHref = safeEvidenceHref(doc.evidence_url);
    const evHtml = doc.evidence_url
      ? (evHref ? `<a href="${ACSMS.esc(evHref)}" target="_blank" rel="noopener">evidence ↗</a>`
                : ACSMS.esc(doc.evidence_url))
      : '';
    const ov = document.createElement('div');
    ov.className = 'modal-overlay session-overlay';
    ov.innerHTML = `<div class="modal session-modal" role="dialog" aria-modal="true" aria-label="Training session">
      <div class="modal-header"><h2>Training session</h2>
        <button class="btn-icon" aria-label="Close" data-close>${AUTOREGIA._xSvg}</button></div>
      <div class="modal-body">
      <div class="sm-sub">${ACSMS.fmtTime(doc.practiced_at_ms)} · ${dur}${isTyping ? ' · typing' : ''}</div>
      ${isTyping ? `
      <div class="ses-hero">
        <div><span class="lbl">net speed</span>
          <div class="ses-big"><span>0</span><em>wpm</em></div></div>
        <div class="ses-cells">
          <div class="ses-cell"><span class="lbl">raw speed</span><b data-c="raw">–</b></div>
          <div class="ses-cell"><span class="lbl">accuracy</span><b data-c="acc">–</b></div>
          <div class="ses-cell"><span class="lbl">consistency</span><b data-c="cons">–</b></div>
          <div class="ses-cell"><span class="lbl">characters</span><b data-c="chars">–</b></div>
          <div class="ses-cell"><span class="lbl">errors</span><b data-c="err">–</b></div>
          <div class="ses-cell"><span class="lbl">duration</span><b data-c="time">–</b></div>
        </div>
      </div>
      <div class="sm-block"><div class="sm-block-head"><span>speed, second by second</span>
        <span class="ses-legend"><i class="l-ink"></i>net wpm<i class="l-mut"></i>raw wpm<i class="l-red"></i>errors</span></div>
        <canvas class="ses-chart"></canvas></div>
      <div class="sm-block"><div class="sm-block-head"><span>key report</span><span class="fb-sub" data-keys-summary></span></div>
        <div class="ses-kbd" data-kbd></div>
        <div class="ses-trouble" data-trouble></div></div>
      ` : `
      <div class="ses-fallback">
        <div><span class="lbl">duration</span><b>${dur}</b></div>
        <div><span class="lbl">quality</span><b>${doc.quality ? doc.quality + '/5' : '—'}</b></div>
        <div><span class="lbl">confidence</span><b>${doc.confidence ? doc.confidence + '/5' : '—'}</b></div>
        ${evHtml ? `<div><span class="lbl">evidence</span><b>${evHtml}</b></div>` : ''}
      </div>
      `}
      ${doc.notes ? `<p class="sm-notes">${ACSMS.esc(doc.notes)}</p>` : ''}
      </div>
    </div>`;
    document.body.appendChild(ov);
    const dlg = AUTOREGIA.dialog(ov, { label: 'Training session' });
    const close = () => { dlg.close(); ov.remove(); };
    ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    if (isTyping) {
      const root = ov.querySelector('.session-modal');
      root.querySelector('.ses-big span').textContent = Math.round(d.wpm || 0);
      root.querySelector('[data-c="raw"]').textContent = Math.round(d.raw || 0);
      root.querySelector('[data-c="acc"]').textContent = ((d.acc || 0) * 100).toFixed(1) + '%';
      root.querySelector('[data-c="cons"]').textContent = d.cons == null ? '—' : Math.round(d.cons) + '%';
      root.querySelector('[data-c="chars"]').textContent = d.c || 0;
      root.querySelector('[data-c="err"]').textContent = (d.i || 0) + (d.m || 0);
      root.querySelector('[data-c="time"]').textContent =
        doc.duration_min != null ? dur : (d.sec && d.sec.length ? d.sec.length + 's' : '—');
      drawSessionChart(root.querySelector('.ses-chart'), d.sec || [], true);
      const presses = Object.values(d.ke || {}).reduce((a, s) => a + s.p, 0);
      const errs = Object.values(d.ke || {}).reduce((a, s) => a + s.e, 0);
      root.querySelector('[data-keys-summary]').textContent =
        presses ? `${presses} key presses · ${errs} misses` : '';
      renderKbdInto(root.querySelector('[data-kbd]'), d.ke || {});
      renderTroubleInto(root.querySelector('[data-trouble]'), d.ke || {}, d.ty || {}, 5);
    }
  }

  function nameOf(doc) {
    return ACSMS.Store.skillById(doc.skill_id)?.name || doc.skill_id;
  }

  return {
    formHTML, bindRatings, readForm, submitForm, resetForm,
    practiceCard, nameOf, showSessionModal,
  };
})();
