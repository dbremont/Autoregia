/* ════════════════════════════════════════════════════════════
   LOOP Scratchpad — Quick Capture (Ctrl+Shift+N)
   In this mock prototype, capture is acknowledged via a toast;
   no telemetry is injected (capture is the data-source layer's
   concern, not the analysis client).
   ════════════════════════════════════════════════════════════ */
window.LOOP = window.LOOP || {};
LOOP.scratchpad = {
  open() {
    document.getElementById('scratchpadOverlay').classList.remove('hidden');
    const ta = document.getElementById('scratchpadText'); ta.value='';
    setTimeout(()=>ta.focus(),100);
  },
  close() { document.getElementById('scratchpadOverlay').classList.add('hidden'); },
  save() {
    const text = document.getElementById('scratchpadText').value.trim();
    if (!text) return;
    this.close();
    LOOP.toast('Note captured — not persisted in the analysis client.');
  }
};

LOOP.toast = function(msg) {
  let t = document.getElementById('loopToast');
  if (!t) { t = document.createElement('div'); t.id='loopToast'; t.className='wm-toast';
    document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(this._toastT); this._toastT = setTimeout(()=>t.classList.remove('show'), 2600);
};
