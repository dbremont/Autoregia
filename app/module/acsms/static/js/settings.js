/* ════════════════════════════════════════════════════════════
   ACSMS Settings — the one recording preference.
   Session controls (kind, length, punctuation, key sounds) belong to
   the practice surface itself, where they persist; the only setting
   that lives here is whether completed training tests are logged on
   the skill's practice log.
   ════════════════════════════════════════════════════════════ */
window.ACSMS = window.ACSMS || {};

ACSMS.Settings = (() => {
  const AUTO_KEY = 'acsms.training.autorecord';

  function autoLog() {
    try { const v = localStorage.getItem(AUTO_KEY); return v === null ? true : v === '1'; } catch (e) { return true; }
  }

  function render() {
    return `<div class="animate-in">
      ${ACSMS.view.header('Settings')}
      <div class="docs-page"><div class="docs-prose">
        <h4>Training</h4>
        <p>Session controls — kind, duration or length, punctuation, key sounds — live in the practice surface itself, where they persist. The trainer keeps its own session ledger in the browser.</p>
        <div class="settings-grid">
          <label class="settings-toggle">
            <input type="checkbox" id="setAutoLog" ${autoLog() ? 'checked' : ''}>
            <span>Auto Log Practice</span>
            <em class="settings-hint">completed tests post to the skill's practice log</em>
          </label>
        </div>
      </div></div>
    </div>`;
  }

  function afterRender() {
    document.getElementById('setAutoLog')?.addEventListener('change', (e) => {
      try { localStorage.setItem(AUTO_KEY, e.target.checked ? '1' : '0'); } catch (err) {}
      ACSMS.toast(e.target.checked ? 'Auto Log Practice on — completed tests join the skill log'
                                   : 'Auto Log Practice off — tests stay in the trainer only');
    });
  }

  return { render, afterRender };
})();
