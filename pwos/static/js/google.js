/* PWOS Google Calendar - status, auth, calendars, sync (Component C) */
window.PW = window.PW || {};

PW.GoogleView = function () {
  return '<div class="content-header"><div><span class="eyebrow">Component C · Platforms Integration</span><h1>Google Calendar</h1></div></div>' +
    '<div id="gcContent"></div>';
};

PW.Google = PW.Google || {};
PW.Google.bind = function () { PW.Google.render(); };

PW.Google.render = async function () {
  const el = document.getElementById('gcContent'); if (!el) return;
  el.innerHTML = '<p class="text-muted">Loading…</p>';
  let status = {};
  try { const res = await fetch('/api/calendar/google/status'); status = await res.json(); }
  catch (e) { el.innerHTML = '<p class="text-muted">Failed to load status.</p>'; return; }

  let calList = '';
  if (status.status === 'connected') {
    try {
      const cr = await fetch('/api/calendar/google/calendars');
      const cd = await cr.json();
      calList = '<div class="card"><div class="card-body"><div class="stat-label">Calendars</div>' +
        (cd.calendars || []).map(c => '<div class="detail-row"><span class="mono">' + PW.esc(c.id) + '</span> <span>' + PW.esc(c.summary) + '</span>' +
        (c.primary ? ' <span class="badge badge-neutral">primary</span>' : '') + '</div>').join('') + '</div></div>';
    } catch (e) { calList = '<p class="text-muted">Could not list calendars.</p>'; }
  }

  const color = status.status === 'connected' ? '#2D6A4F' : (status.status === 'mock' ? '#9A9589' : '#B4742A');
  el.innerHTML =
    '<div class="card"><div class="card-body">' +
    '<div class="detail-row"><span class="stat-label">Status</span> <strong style="color:' + color + '">' + PW.prettyEnum(status.status) + '</strong></div>' +
    '<div class="detail-row"><span class="stat-label">Scopes</span> <span class="mono text-sm">' + (status.scopes || []).join(', ') + '</span></div>' +
    '<div class="detail-row"><span class="stat-label">Client secret</span> <span class="mono text-sm">' + PW.esc(status.client_secret_path) + '</span></div>' +
    '<div class="detail-row"><span class="stat-label">Token</span> <span class="mono text-sm">' + PW.esc(status.token_path) + '</span></div>' +
    '</div></div>' +
    calList +
    '<div class="card"><div class="card-body"><div class="stat-label">Actions</div>' +
    (status.status === 'connected'
      ? '<button class="btn btn-primary btn-sm" onclick="PW.doGoogleSync()"><pw-icon name="refresh-cw" size="15"></pw-icon> Sync Now</button>'
      : '<button class="btn btn-primary btn-sm" onclick="PW.Google.startAuth()"><pw-icon name="cloud" size="15"></pw-icon> Connect Google Calendar</button>') +
    ' <button class="btn btn-ghost btn-sm" onclick="PW.doGoogleSync()"><pw-icon name="refresh-cw" size="15"></pw-icon> Test Sync</button>' +
    '</div></div>' +
    (status.status === 'mock'
      ? '<div class="card"><div class="card-body"><p class="text-muted text-sm"><strong>Mock mode.</strong> No <code>client_secret.json</code> found. To enable live two-way sync:</p>' +
        '<ol class="text-sm text-muted"><li>Create a Google Cloud project; enable the Google Calendar API.</li>' +
        '<li>Create an OAuth 2.0 Client ID (Desktop app).</li>' +
        '<li>Download it as <code>client_secret.json</code> into <code>pwos/config/</code> (or set <code>PWOS_GC_CLIENT_SECRET</code>).</li>' +
        '<li>Click “Connect” above and complete the consent flow.</li></ol></div></div>'
      : '');
};

PW.Google.startAuth = async function () {
  PW.toast('Requesting authorization URL…');
  try {
    const res = await fetch('/api/calendar/google/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const d = await res.json();
    if (d.authorization_url) { window.open(d.authorization_url, '_blank'); }
    else if (d.detail) { PW.toast(d.detail); }
  } catch (e) { PW.toast('Auth request failed'); }
};
