/* ════════════════════════════════════════════════════════════
   PKTS Scratchpad — Quick Capture (Ctrl+Shift+N)
   Capture is acknowledged via a toast; continuous keystroke
   telemetry is the collector's concern (pkts/collector.py),
   not this analysis client.
   ════════════════════════════════════════════════════════════ */
window.PKTS = window.PKTS || {};
PKTS.scratchpad = {
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
    PKTS.toast('Note captured — not persisted in the analysis client.');
  }
};

PKTS.toast = function(msg) {
  let t = document.getElementById('pktsToast');
  if (!t) { t = document.createElement('div'); t.id='pktsToast'; t.className='wm-toast';
    document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(this._toastT); this._toastT = setTimeout(()=>t.classList.remove('show'), 2600);
};
