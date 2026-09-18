/* ════════════════════════════════════════════════════════════
   ACSMS Quick Capture — Ctrl+Shift+N. The self-report practice
   form as an overlay: pick an existing skill, record what
   happened, back to work in seconds.
   ════════════════════════════════════════════════════════════ */
window.ACSMS = window.ACSMS || {};
ACSMS.capture = {
  open(skillId) {
    const ov = document.getElementById('captureOverlay');
    ov.classList.remove('hidden');
    ACSMS._captureDlg = AUTOREGIA.dialog(ov, { label: 'Quick capture' });
    const holder = document.getElementById('captureForm');
    // rebuild each open so the skill select always reflects the catalog
    holder.innerHTML = ACSMS.Practice.formHTML('qc', skillId);
    ACSMS.Practice.bindRatings('qc');
    setTimeout(() => document.getElementById('qc-skill')?.focus(), 100);
  },
  close() {
    document.getElementById('captureOverlay').classList.add('hidden');
    if (ACSMS._captureDlg) { ACSMS._captureDlg.close(); ACSMS._captureDlg = null; }
  },
};

// The footer buttons are static markup — bind once, never rebind.
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('qc-save')?.addEventListener('click', async () => {
    if (await ACSMS.Practice.submitForm('qc')) { ACSMS.capture.close(); ACSMS.updateFooter(); }
  });
});
