/* ════════════════════════════════════════════════════════════
   PEOS Scratchpad — Quick Capture (Ctrl+Shift+N).
   In PEOS the scratchpad posts a quick note as an ad-hoc search
   filter is not the point; it captures a free-text note to the
   header search (which filters the stream). Kept for parity with
   the rest of Autoregia's shells.
   ════════════════════════════════════════════════════════════ */
window.PEOS = window.PEOS || {};
PEOS.scratchpad = {
  open(){ document.getElementById('scratchpadOverlay').classList.remove('hidden'); const ta=document.getElementById('scratchpadText'); ta.value=''; setTimeout(()=>ta.focus(),100); },
  close(){ document.getElementById('scratchpadOverlay').classList.add('hidden'); },
  save(){ const t=document.getElementById('scratchpadText').value.trim(); if(!t) return; this.close(); PEOS.Store.applyFilter({q:t}); PEOS.renderSidebar(); PEOS.navigate('reading'); PEOS.toast('Filtering stream for: '+t); }
};

PEOS.toast = function(msg){
  let t=document.getElementById('peosToast');
  if(!t){ t=document.createElement('div'); t.id='peosToast'; t.className='wm-toast'; document.body.appendChild(t); }
  t.textContent=msg; t.classList.add('show');
  clearTimeout(this._tt); this._tt=setTimeout(()=>t.classList.remove('show'),2600);
};
