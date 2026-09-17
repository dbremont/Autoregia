/* ════════════════════════════════════════════════════════════
   PKTS Scratchpad — Quick Capture (Ctrl+Shift+N)
   Capture is acknowledged via a toast; continuous keystroke
   telemetry is the collector's concern (pkts/collector.py),
   not this analysis client.
   ════════════════════════════════════════════════════════════ */
window.PKTS = window.PKTS || {};
PKTS.scratchpad = {
  open() {
    const ov = document.getElementById('scratchpadOverlay');
    ov.classList.remove('hidden');
    PKTS._scratchDlg = AUTOREGIA.dialog(ov, { label: 'Quick capture' });
    const ta = document.getElementById('scratchpadText'); ta.value='';
    setTimeout(()=>ta.focus(),100);
  },
  close() {
    document.getElementById('scratchpadOverlay').classList.add('hidden');
    if (PKTS._scratchDlg) { PKTS._scratchDlg.close(); PKTS._scratchDlg = null; }
  },
  save() {
    const text = document.getElementById('scratchpadText').value.trim();
    if (!text) return;
    this.close();
    PKTS.toast('Note captured — not persisted in the analysis client.');
  }
};

PKTS.toast = function(msg) { AUTOREGIA.toast(msg, { id: 'toast' }); };
