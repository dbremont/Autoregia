/* ════════════════════════════════════════════════════════════
   LOOP Scratchpad — Quick Capture (Ctrl+Shift+N)
   In this mock prototype, capture is acknowledged via a toast;
   no telemetry is injected (capture is the data-source layer's
   concern, not the analysis client).
   ════════════════════════════════════════════════════════════ */
window.LOOP = window.LOOP || {};
LOOP.scratchpad = {
  open() {
    const ov = document.getElementById('scratchpadOverlay');
    ov.classList.remove('hidden');
    LOOP._scratchDlg = AUTOREGIA.dialog(ov, { label: 'Quick capture' });
    const ta = document.getElementById('scratchpadText'); ta.value='';
    setTimeout(()=>ta.focus(),100);
  },
  close() {
    document.getElementById('scratchpadOverlay').classList.add('hidden');
    if (LOOP._scratchDlg) { LOOP._scratchDlg.close(); LOOP._scratchDlg = null; }
  },
  save() {
    const text = document.getElementById('scratchpadText').value.trim();
    if (!text) return;
    this.close();
    LOOP.toast('Note captured — not persisted in the analysis client.');
  }
};

LOOP.toast = function(msg) { AUTOREGIA.toast(msg, { id: 'toast' }); };
