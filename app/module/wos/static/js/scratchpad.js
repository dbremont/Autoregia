/* ════════════════════════════════════════════════════════════
   WOS Scratchpad — Quick Capture (Ctrl+Shift+N).
   In WOS the scratchpad posts a quick note as an ad-hoc search
   filter is not the point; it captures a free-text note to the
   header search (which filters the stream). Kept for parity with
   the rest of Autoregia's shells.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.scratchpad = {
  open(){ document.getElementById('scratchpadOverlay').classList.remove('hidden'); const ta=document.getElementById('scratchpadText'); ta.value=''; setTimeout(()=>ta.focus(),100); },
  close(){ document.getElementById('scratchpadOverlay').classList.add('hidden'); },
  save(){ const t=document.getElementById('scratchpadText').value.trim(); if(!t) return; this.close(); WOS.Store.applyFilter({q:t}); WOS.renderSidebar(); WOS.navigate('search'); WOS.toast('Filtering stream for: '+t); }
};

WOS.toast = function(msg){
  let t=document.getElementById('wosToast');
  if(!t){ t=document.createElement('div'); t.id='wosToast'; t.className='wm-toast'; document.body.appendChild(t); }
  t.textContent=msg; t.classList.add('show');
  clearTimeout(this._tt); this._tt=setTimeout(()=>t.classList.remove('show'),2600);
};
