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
  function practiceCard(doc) {
    const stars = (n) => n ? `<span class="rc-rating rating-stars" title="${n}/5">${'★'.repeat(n)}<span class="off">${'★'.repeat(5 - n)}</span></span>` : '';
    return `<div class="record-card animate-in" data-id="${doc.id}">
      <button class="btn-icon rc-del" data-del="${doc.id}" aria-label="Delete practice report">${ACSMS.icon('trash-2', 15)}</button>
      <div class="rc-title"><a href="#skills/${doc.skill_id}">${ACSMS.esc(doc.skill_name || nameOf(doc))}</a></div>
      ${doc.notes ? `<div class="rc-preview">${ACSMS.esc(doc.notes)}</div>` : ''}
      <div class="rc-meta">
        <span>${ACSMS.fmtTime(doc.practiced_at_ms)}</span>
        ${doc.duration_min != null ? `<span>· ${doc.duration_min} min</span>` : ''}
        ${stars(doc.quality)}${stars(doc.confidence)}
        ${doc.evidence_url ? `<a class="rc-tag" href="${ACSMS.esc(doc.evidence_url)}" target="_blank" rel="noopener">evidence ↗</a>` : ''}
      </div>
    </div>`;
  }

  function nameOf(doc) {
    return ACSMS.Store.skillById(doc.skill_id)?.name || doc.skill_id;
  }

  return {
    formHTML, bindRatings, readForm, submitForm, resetForm,
    practiceCard, nameOf,
  };
})();
