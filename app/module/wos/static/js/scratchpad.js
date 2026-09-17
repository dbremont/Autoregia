/* ════════════════════════════════════════════════════════════
   WOS Scratchpad — Quick Capture (Ctrl+Shift+N).
   In WOS the scratchpad posts a quick note as an ad-hoc search
   filter is not the point; it captures a free-text note to the
   header search (which filters the stream). Kept for parity with
   the rest of Autoregia's shells.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.scratchpad = {
  open(){ const ov=document.getElementById('scratchpadOverlay'); ov.classList.remove('hidden'); WOS._scratchDlg = AUTOREGIA.dialog(ov, { label: 'Quick capture' }); const ta=document.getElementById('scratchpadText'); ta.value=''; setTimeout(()=>ta.focus(),100); },
  close(){ document.getElementById('scratchpadOverlay').classList.add('hidden'); if (WOS._scratchDlg) { WOS._scratchDlg.close(); WOS._scratchDlg = null; } },
  save(){ const t=document.getElementById('scratchpadText').value.trim(); if(!t) return; this.close(); WOS.Store.applyFilter({q:t}); WOS.renderSidebar(); WOS.navigate('search'); WOS.toast('Filtering stream for: '+t); }
};

WOS.toast = function(msg){ AUTOREGIA.toast(msg, { id: 'toast' }); };
