/* AOOS Google Calendar - status, auth, calendars, sync (Component C) */
window.AO = window.AO || {};

AO.GoogleView = function () {
  return '<div class="content-header"><div><span class="eyebrow">Component C · Platforms Integration</span><h1>Google Calendar</h1></div></div>' +
    '<div id="gcContent"></div>';
};

AO.Google = AO.Google || {};
AO.Google.bind = function () { AO.Google.render(); };

AO.Google.render = async function () {
  const el = document.getElementById('gcContent'); if (!el) return;
  el.innerHTML = '<p class="text-muted">Loading…</p>';
  let status = {};
  try { const res = await fetch('/aoos/api/calendar/google/status'); status = await res.json(); }
  catch (e) { el.innerHTML = '<p class="text-muted">Failed to load status.</p>'; return; }

  let calList = '';
  if (status.status === 'connected') {
    try {
      const cr = await fetch('/aoos/api/calendar/google/calendars');
      const cd = await cr.json();
      calList = '<div class="card"><div class="card-body"><div class="stat-label">Calendars</div>' +
        (cd.calendars || []).map(c => '<div class="detail-row"><span class="mono">' + AO.esc(c.id) + '</span> <span>' + AO.esc(c.summary) + '</span>' +
        (c.primary ? ' <span class="badge badge-neutral">primary</span>' : '') + '</div>').join('') + '</div></div>';
    } catch (e) { calList = '<p class="text-muted">Could not list calendars.</p>'; }
  }

  const color = status.status === 'connected' ? '#2D6A4F' : (status.status === 'mock' ? '#9A9589' : '#B4742A');
  el.innerHTML =
    '<div class="card"><div class="card-body">' +
    '<div class="detail-row"><span class="stat-label">Status</span> <strong style="color:' + color + '">' + AO.prettyEnum(status.status) + '</strong></div>' +
    '<div class="detail-row"><span class="stat-label">Scopes</span> <span class="mono text-sm">' + (status.scopes || []).join(', ') + '</span></div>' +
    '<div class="detail-row"><span class="stat-label">Client secret</span> <span class="mono text-sm">' + AO.esc(status.client_secret_path) + '</span></div>' +
    '<div class="detail-row"><span class="stat-label">Token</span> <span class="mono text-sm">' + AO.esc(status.token_path) + '</span></div>' +
    '</div></div>' +
    calList +
    '<div class="card"><div class="card-body"><div class="stat-label">Actions</div>' +
    (status.status === 'connected'
      ? '<button class="btn btn-primary btn-sm" onclick="AO.doGoogleSync()"><ao-icon name="refresh-cw" size="15"></ao-icon> Sync Now</button>'
      : '<button class="btn btn-primary btn-sm" onclick="AO.Google.startAuth()"><ao-icon name="cloud" size="15"></ao-icon> Connect Google Calendar</button>') +
    ' <button class="btn btn-ghost btn-sm" onclick="AO.doGoogleSync()"><ao-icon name="refresh-cw" size="15"></ao-icon> Test Sync</button>' +
    '</div></div>' +
    (status.status === 'mock'
      ? '<div class="card"><div class="card-body"><p class="text-muted text-sm"><strong>Mock mode.</strong> No <code>client_secret.json</code> found. To enable live two-way sync:</p>' +
        '<ol class="text-sm text-muted"><li>Create a Google Cloud project; enable the Google Calendar API.</li>' +
        '<li>Create an OAuth 2.0 Client ID (Desktop app).</li>' +
        '<li>Download it as <code>client_secret.json</code> into <code>aoos/config/</code> (or set <code>AOOS_GC_CLIENT_SECRET</code>).</li>' +
        '<li>Click “Connect” above and complete the consent flow.</li></ol></div></div>'
      : '');
};

AO.Google.startAuth = async function () {
  AO.toast('Requesting authorization URL…');
  try {
    const res = await fetch('/aoos/api/calendar/google/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const d = await res.json();
    if (d.authorization_url) { window.open(d.authorization_url, '_blank'); }
    else if (d.detail) { AO.toast(d.detail); }
  } catch (e) { AO.toast('Auth request failed'); }
};
