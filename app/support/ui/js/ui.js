/* ════════════════════════════════════════════════════════════
   Autoregia Shared UI Behaviors (served at /ui/js/ui.js)
   confirmDialog + toast — the canonical implementations.
   Tools keep thin aliases (AO.toast = AUTOREGIA.toast …) so call
   sites never change. Markup is still owned per tool (ui.spec §12);
   behaviors are the layer that shares.
   ════════════════════════════════════════════════════════════ */
window.AUTOREGIA = window.AUTOREGIA || {};

/* APG confirm dialog (ui.spec §10.6). Resolves true/false.
   The shell must provide .modal-overlay/.modal/.btn css (§7.5). */
AUTOREGIA.confirmDialog = function (opts) {
  return new Promise(function (resolve) {
    const ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.innerHTML = '<div class="modal" role="dialog" aria-modal="true" style="max-width:420px">' +
      '<div class="modal-header"><h2>' + AUTOREGIA.esc(opts.title) + '</h2>' +
      '<button class="btn-icon" aria-label="Close" data-x="no">' + AUTOREGIA._xSvg + '</button></div>' +
      '<div class="modal-body"><p>' + AUTOREGIA.esc(opts.message) + '</p></div>' +
      '<div class="modal-footer"><button class="btn btn-secondary btn-sm" data-x="no">Cancel</button>' +
      '<button class="btn btn-primary btn-sm" style="background:var(--color-danger,#A33434);border-color:var(--color-danger,#A33434)" data-x="yes">' +
      AUTOREGIA.esc(opts.confirmText || 'Confirm') + '</button></div></div>';
    const done = function (v) { document.removeEventListener('keydown', onKey); ov.remove(); resolve(v); };
    const onKey = function (e) { if (e.key === 'Escape') done(false); };
    ov.addEventListener('click', function (e) {
      if (e.target === ov) { done(false); return; }
      const b = e.target.closest('[data-x]');
      if (b) done(b.getAttribute('data-x') === 'yes');
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(ov);
    ov.querySelector('[data-x="yes"]').focus();
  });
};

/* Toast: textContent into #<id> (+ .show), auto-hide. */
AUTOREGIA.toast = function (msg, opts) {
  const o = opts || {};
  const t = document.getElementById(o.id || 'toast');
  if (!t) return;
  const cls = o.cls || 'show';
  t.textContent = msg; t.classList.add(cls);
  clearTimeout(t._autoregiaToastTimer);
  t._autoregiaToastTimer = setTimeout(function () { t.classList.remove(cls); }, o.ms || 2200);
};

/* ── internals ──────────────────────────────────────────── */
AUTOREGIA.esc = function (s) {
  if (s == null) return '';
  const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML;
};
AUTOREGIA._xSvg = '<svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
