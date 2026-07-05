/* AOOS Calendar — multi-view (Day / Week / Month / Year) + block scheduling (Component B) */
window.AO = window.AO || {};

/* ── Header: view switch, navigation, today, label, schedule ── */
AO.CalendarView = function () {
  return '<div class="content-header">' +
    '<div><span class="eyebrow">Component B · Work Calendarization</span><h1>Calendar</h1></div>' +
    '<div class="actions cal-toolbar">' +
      AO.Calendar._viewSwitch() +
      '<span class="cal-nav">' +
        '<button class="btn btn-ghost btn-sm" id="btnCalPrev" title="Previous"><ao-icon name="chevron-left" size="15"></ao-icon></button>' +
        '<button class="btn btn-ghost btn-sm" id="btnCalToday">Today</button>' +
        '<button class="btn btn-ghost btn-sm" id="btnCalNext" title="Next"><ao-icon name="chevron-right" size="15"></ao-icon></button>' +
      '</span>' +
      '<span id="calLabel" class="cal-label"></span>' +
      '<button class="btn btn-primary btn-sm" onclick="AO.Calendar.openBlockEditor()"><ao-icon name="plus" size="15"></ao-icon> Schedule Block</button>' +
    '</div></div>' +
    '<div id="calGrid"></div>';
};

AO.Calendar = AO.Calendar || {};

/* ── View state ─────────────────────────────────────────────── */
AO.Calendar._mode = 'week';                 // 'day' | 'week' | 'month' | 'year'
AO.Calendar._cursor = null;                  // a local Date focused on the current period
AO.Calendar.START_HOUR = 6;                  // time-grid window start
AO.Calendar.END_HOUR = 22;                   // time-grid window end
AO.Calendar.PX_PER_HOUR = 48;
AO.Calendar.WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

AO.Calendar._viewSwitch = function () {
  const modes = [['day', 'Day'], ['week', 'Week'], ['month', 'Month'], ['year', 'Year']];
  return '<div class="view-switch">' + modes.map(m =>
    '<button class="view-switch-btn' + (AO.Calendar._mode === m[0] ? ' is-active' : '') +
    '" onclick="AO.Calendar.setMode(\'' + m[0] + '\')">' + m[1] + '</button>').join('') + '</div>';
};

AO.Calendar.bind = function () {
  const saved = sessionStorage.getItem('aoos_cal_mode');
  if (saved) AO.Calendar._mode = saved;
  const now = new Date();
  AO.Calendar._cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const prev = document.getElementById('btnCalPrev');
  const next = document.getElementById('btnCalNext');
  const today = document.getElementById('btnCalToday');
  if (prev) prev.onclick = () => AO.Calendar.step(-1);
  if (next) next.onclick = () => AO.Calendar.step(1);
  if (today) today.onclick = () => AO.Calendar.goToday();
  AO.Calendar.render();
};

AO.Calendar.setMode = function (mode) {
  AO.Calendar._mode = mode;
  sessionStorage.setItem('aoos_cal_mode', mode);
  const sw = document.querySelector('.cal-toolbar .view-switch');
  if (sw) sw.outerHTML = AO.Calendar._viewSwitch();
  AO.Calendar.render();
};

AO.Calendar.step = function (dir) {
  const c = AO.Calendar._cursor;
  if (AO.Calendar._mode === 'day') c.setDate(c.getDate() + dir);
  else if (AO.Calendar._mode === 'week') c.setDate(c.getDate() + 7 * dir);
  else if (AO.Calendar._mode === 'month') c.setMonth(c.getMonth() + dir);
  else c.setFullYear(c.getFullYear() + dir);
  AO.Calendar.render();
};

AO.Calendar.goToday = function () {
  const now = new Date();
  AO.Calendar._cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  AO.Calendar.render();
};

/* ── Render dispatcher ──────────────────────────────────────── */
AO.Calendar.render = function () {
  AO.Calendar._updateLabel();
  if (AO.Calendar._mode === 'day') AO.Calendar._renderDay();
  else if (AO.Calendar._mode === 'week') AO.Calendar._renderWeek();
  else if (AO.Calendar._mode === 'month') AO.Calendar._renderMonth();
 else AO.Calendar._renderYear();
};

AO.Calendar._updateLabel = function () {
  const label = document.getElementById('calLabel'); if (!label) return;
  const c = AO.Calendar._cursor;
  if (AO.Calendar._mode === 'day') {
    label.textContent = c.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  } else if (AO.Calendar._mode === 'week') {
    const mon = AO.Calendar._mondayOf(c);
    const sun = new Date(mon.getTime() + 6 * 86400000);
    label.textContent = mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' — ' +
      sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } else if (AO.Calendar._mode === 'month') {
    label.textContent = c.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } else {
    label.textContent = c.getFullYear().toString();
  }
};

AO.Calendar._mondayOf = function (d) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
};

AO.Calendar._sameDay = function (a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
};

/* ═══ DAY + WEEK — vertical time-grid (Google/Apple-style) ═══ */
AO.Calendar._renderDay = async function () {
  const grid = document.getElementById('calGrid'); if (!grid) return;
  grid.innerHTML = '<p class="text-muted">Loading…</p>';
  try {
    const res = await fetch('/aoos/api/calendar/day?start=' + AO.Calendar._cursor.toISOString());
    const day = await res.json();
    grid.innerHTML = '<div class="time-grid time-grid-day">' +
      '<div class="time-top"><div class="time-corner"></div>' +
      '<div class="time-head">' + AO.Calendar._dayHead(day) + '</div></div>' +
      '<div class="time-body">' + AO.Calendar._timeGutter() +
      '<div class="time-days">' + AO.Calendar._dayLane(day) + '</div></div></div>';
    AO.Calendar._scrollToNow();
  } catch (e) { grid.innerHTML = '<p class="text-muted">Failed to load calendar.</p>'; }
};

AO.Calendar._renderWeek = async function () {
  const grid = document.getElementById('calGrid'); if (!grid) return;
  grid.innerHTML = '<p class="text-muted">Loading…</p>';
  try {
    const mon = AO.Calendar._mondayOf(AO.Calendar._cursor);
    const res = await fetch('/aoos/api/calendar/week?start=' + mon.toISOString());
    const days = await res.json();
    grid.innerHTML = '<div class="time-grid">' +
      '<div class="time-top"><div class="time-corner"></div>' +
      '<div class="time-head">' + days.map(d => AO.Calendar._dayHead(d)).join('') + '</div></div>' +
      '<div class="time-body">' + AO.Calendar._timeGutter() +
      '<div class="time-days">' + days.map(d => AO.Calendar._dayLane(d)).join('') + '</div>' +
      '</div></div>';
    AO.Calendar._scrollToNow();
  } catch (e) { grid.innerHTML = '<p class="text-muted">Failed to load calendar.</p>'; }
};

AO.Calendar._timeGutter = function () {
  let h = '<div class="time-gutter">';
  for (let hr = AO.Calendar.START_HOUR; hr < AO.Calendar.END_HOUR; hr++) {
    const ampm = hr % 12 === 0 ? 12 : hr % 12;
    h += '<div class="time-hour"><span>' + ampm + (hr < 12 ? ' AM' : ' PM') + '</span></div>';
  }
  return h + '</div>';
};

AO.Calendar._dayHead = function (day) {
  const d = new Date(day.date + 'T00:00:00');
  const today = new Date();
  const isToday = AO.Calendar._sameDay(d, today);
  return '<div class="time-dayhead' + (isToday ? ' is-today' : '') + '" onclick="AO.Calendar._drillDay(\'' + day.date + '\')">' +
    '<span class="time-dayhead-dow">' + d.toLocaleDateString('en-US', { weekday: 'short' }) + '</span>' +
    '<span class="time-dayhead-num' + (isToday ? ' is-today' : '') + '">' + d.getDate() + '</span>' +
    '<span class="time-dayhead-hrs">' + AO.Calendar._fmtHours(day.scheduled_minutes) + '</span></div>';
};

AO.Calendar._dayLane = function (day) {
  const d = new Date(day.date + 'T00:00:00');
  const today = new Date();
  const isToday = AO.Calendar._sameDay(d, today);
  let h = '<div class="time-lane' + (isToday ? ' is-today' : '') + '">';
  for (let hr = AO.Calendar.START_HOUR; hr < AO.Calendar.END_HOUR; hr++) h += '<div class="time-rule"></div>';
  day.blocks.forEach(b => { h += AO.Calendar._timeBlock(b); });
  if (isToday) h += AO.Calendar._nowLine();
  return h + '</div>';
};

AO.Calendar._timeBlock = function (b) {
  const s = new Date(b.starts_at), e = new Date(b.ends_at);
  const startMin = Math.max(0, (s.getHours() * 60 + s.getMinutes()) - AO.Calendar.START_HOUR * 60);
  const endMin = Math.min((AO.Calendar.END_HOUR - AO.Calendar.START_HOUR) * 60,
    (e.getHours() * 60 + e.getMinutes()) - AO.Calendar.START_HOUR * 60);
  const spanMin = Math.max(15, endMin - startMin);
  const top = (startMin / 60) * AO.Calendar.PX_PER_HOUR;
  const height = (spanMin / 60) * AO.Calendar.PX_PER_HOUR - 3;
  const conflicts = (b.conflict_flags || []).length;
  const color = conflicts ? '#A33434' : '#3F6092';
  return '<div class="time-block" style="top:' + top + 'px;height:' + height + 'px;border-left:3px solid ' + color + '"' +
    ' onclick="AO.Calendar.showBlock(\'' + b.id + '\')">' +
    '<span class="time-block-time">' + AO.Calendar._fmtClock(s) + ' – ' + AO.Calendar._fmtClock(e) + '</span>' +
    '<span class="time-block-title">' + AO.esc(b.title || b.action_id || 'block') + '</span>' +
    (conflicts ? '<span class="time-block-conf">!' + conflicts + '</span>' : '') +
    '</div>';
};

AO.Calendar._nowLine = function () {
  const now = new Date();
  const min = (now.getHours() * 60 + now.getMinutes()) - AO.Calendar.START_HOUR * 60;
  if (min < 0 || min > (AO.Calendar.END_HOUR - AO.Calendar.START_HOUR) * 60) return '';
  const top = (min / 60) * AO.Calendar.PX_PER_HOUR;
  return '<div class="time-now" style="top:' + top + 'px"></div>';
};

/* Rolling viewport: on render, scroll the time-grid so the current time (or the
   start of the day) lands in the top third of the visible area. Shared by Day
   and Week so both behave identically. */
AO.Calendar._scrollToNow = function () {
  const scroller = document.querySelector('#calGrid .time-grid');
  if (!scroller) return;
  const now = new Date();
  const min = (now.getHours() * 60 + now.getMinutes()) - AO.Calendar.START_HOUR * 60;
  const span = (AO.Calendar.END_HOUR - AO.Calendar.START_HOUR) * 60;
  let targetTop;
  if (min < 0 || min > span) {
    targetTop = 0; // current time outside the window → start at the top
  } else {
    targetTop = (min / 60) * AO.Calendar.PX_PER_HOUR - scroller.clientHeight / 3;
  }
  scroller.scrollTop = Math.max(0, targetTop);
};

/* ═══ MONTH — 6×7 weekday-aligned grid ═══ */
AO.Calendar._renderMonth = async function () {
  const grid = document.getElementById('calGrid'); if (!grid) return;
  grid.innerHTML = '<p class="text-muted">Loading…</p>';
  try {
    const y = AO.Calendar._cursor.getFullYear(), m = AO.Calendar._cursor.getMonth() + 1;
    const res = await fetch('/aoos/api/calendar/month?year=' + y + '&month=' + m);
    const data = await res.json();
    let h = '<div class="month-grid">';
    h += '<div class="month-weekhead">' + AO.Calendar.WEEKDAYS.map(w => '<span>' + w + '</span>').join('') + '</div>';
    h += '<div class="month-cells">';
    data.days.forEach(cell => { h += AO.Calendar._monthCell(cell); });
    h += '</div></div>';
    grid.innerHTML = h;
  } catch (e) { grid.innerHTML = '<p class="text-muted">Failed to load calendar.</p>'; }
};

AO.Calendar._monthCell = function (cell) {
  const d = new Date(cell.date + 'T00:00:00');
  const today = new Date();
  const isToday = AO.Calendar._sameDay(d, today);
  const inMonth = cell.in_month;
  const visible = cell.blocks.slice(0, 3);
  const extra = cell.blocks.length - visible.length;
  let chips = visible.map(b => {
    const conflicts = (b.conflict_flags || []).length;
    const color = conflicts ? '#A33434' : '#3F6092';
    return '<div class="month-chip" style="border-left:2px solid ' + color + '" onclick="event.stopPropagation();AO.Calendar.showBlock(\'' + b.id + '\')">' +
      '<span class="month-chip-time">' + AO.Calendar._fmtClock(new Date(b.starts_at)) + '</span> ' +
      AO.esc(b.title || b.action_id || 'block') + '</div>';
  }).join('');
  if (extra > 0) chips += '<div class="month-more">+' + extra + ' more</div>';
  return '<div class="month-cell' + (inMonth ? '' : ' is-outside') + (isToday ? ' is-today' : '') +
    '" onclick="AO.Calendar._drillDay(\'' + cell.date + '\')">' +
    '<div class="month-cell-head"><span class="month-cell-num' + (isToday ? ' is-today' : '') + '">' + d.getDate() + '</span>' +
    (cell.scheduled_minutes ? '<span class="month-cell-hrs">' + AO.Calendar._fmtHours(cell.scheduled_minutes) + '</span>' : '') + '</div>' +
    '<div class="month-cell-blocks">' + chips + '</div></div>';
};

/* ═══ YEAR — 4×3 mini-months with workload ═══ */
AO.Calendar._renderYear = async function () {
  const grid = document.getElementById('calGrid'); if (!grid) return;
  grid.innerHTML = '<p class="text-muted">Loading…</p>';
  try {
    const y = AO.Calendar._cursor.getFullYear();
    const res = await fetch('/aoos/api/calendar/year?year=' + y);
    const data = await res.json();
    let h = '<div class="year-grid">';
    data.months.forEach(mo => { h += AO.Calendar._miniMonth(y, mo); });
    h += '</div>';
    grid.innerHTML = h;
  } catch (e) { grid.innerHTML = '<p class="text-muted">Failed to load calendar.</p>'; }
};

AO.Calendar._miniMonth = function (year, mo) {
  const active = mo.block_count > 0;
  let h = '<div class="mini-month' + (active ? ' is-active' : '') + '" onclick="AO.Calendar._drillMonth(' + year + ',' + mo.month + ')">';
  h += '<div class="mini-month-head"><span class="mini-month-name">' + mo.name + '</span>' +
    '<span class="mini-month-hrs">' + (active ? AO.Calendar._fmtHours(mo.scheduled_minutes) : '—') + '</span></div>';
  h += '<div class="mini-weekhead">' + AO.Calendar.WEEKDAYS.map(w => '<span>' + w[0] + '</span>').join('') + '</div>';
  const first = new Date(year, mo.month - 1, 1);
  const lead = (first.getDay() + 6) % 7;
  const dim = new Date(year, mo.month, 0).getDate();
  let dots = '';
  for (let i = 0; i < lead; i++) dots += '<span class="mini-dot is-empty"></span>';
  for (let day = 1; day <= dim; day++) dots += '<span class="mini-dot"></span>';
  h += '<div class="mini-dots">' + dots + '</div>';
  if (active) h += '<div class="mini-month-foot">' + mo.block_count + ' blocks</div>';
  h += '</div>';
  return h;
};

/* ── Drill-down navigation ──────────────────────────────────── */
AO.Calendar._drillDay = function (iso) {
  const d = new Date(iso + 'T00:00:00');
  AO.Calendar._cursor = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  AO.Calendar.setMode('day');
};
AO.Calendar._drillMonth = function (year, month) {
  AO.Calendar._cursor = new Date(year, month - 1, 1);
  AO.Calendar.setMode('month');
};

/* ── Formatters ─────────────────────────────────────────────── */
AO.Calendar._fmtClock = function (d) { return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); };
AO.Calendar._fmtHours = function (minutes) { return (Math.round(minutes / 60 * 10) / 10) + 'h'; };

/* ── Block detail / scheduling (unchanged behaviour) ────────── */
AO.Calendar.showBlock = function (id) {
  const blocks = AO.Store.getBlocks();
  const b = blocks.find(x => x.id === id); if (!b) return;
  const cf = (b.conflict_flags || []).map(f => '<div class="detail-row"><span class="badge badge-danger">' + AO.prettyEnum(f.kind) + '</span> ' + AO.esc(f.detail || f.with) + '</div>').join('');
  document.getElementById('detailTitle').textContent = b.title || 'Block';
  document.getElementById('detailBody').innerHTML =
    '<div class="detail-grid">' +
    '<div class="detail-field"><label>Block Id</label><span class="mono">' + AO.esc(b.id) + '</span></div>' +
    '<div class="detail-field"><label>Action</label><span class="mono">' + AO.esc(b.action_id || '—') + '</span></div>' +
    '<div class="detail-field"><label>Starts</label><span>' + AO.fmtDate(b.starts_at) + '</span></div>' +
    '<div class="detail-field"><label>Ends</label><span>' + AO.fmtDate(b.ends_at) + '</span></div>' +
    '<div class="detail-field"><label>Calendar</label><span>' + AO.esc(b.calendar_id) + '</span></div>' +
    '<div class="detail-field"><label>Status</label><span>' + AO.prettyEnum(b.status) + '</span></div>' +
    '</div>' +
    (cf ? '<div class="detail-section"><h3>Conflicts</h3>' + cf + '</div>' : '') +
    '<div class="detail-actions"><button class="btn btn-ghost btn-sm" onclick="AO.Calendar.deleteBlock(\'' + b.id + '\')"><ao-icon name="trash-2" size="14"></ao-icon> Delete</button></div>';
  document.getElementById('detailModal').classList.remove('hidden');
};

AO.Calendar.deleteBlock = async function (id) {
  await AO.Store.removeBlock(id); AO.Action.closeDetail(); AO.Calendar.render(); AO.toast('Block deleted');
};

AO.Calendar.openBlockEditor = function () {
  const actions = AO.Store.getActions().filter(a => a.kind === 'Task' || a.kind === 'Routine' || a.kind === 'Commitment');
  document.getElementById('actionModalTitle').textContent = 'Schedule Block';
  document.getElementById('actionModalBody').innerHTML =
    '<div class="form-grid">' +
    '<label class="form-field form-field-wide"><span>Action</span><select class="select" id="bf_action">' +
    actions.map(a => '<option value="' + a.id + '">' + a.id + ' (' + a.kind + ')</option>').join('') +
    '</select></label>' +
    '<label class="form-field"><span>Starts At</span><input class="input" id="bf_start" type="datetime-local"></label>' +
    '<label class="form-field"><span>Ends At</span><input class="input" id="bf_end" type="datetime-local"></label>' +
    '<label class="form-field"><span>Calendar</span><input class="input" id="bf_cal" value="work"></label>' +
    '<label class="form-field"><span>Title</span><input class="input" id="bf_title" placeholder="optional"></label>' +
    '<label class="form-field"><span>Status</span><select class="select" id="bf_status"><option value="confirmed">Confirmed</option><option value="tentative">Tentative</option></select></label>' +
    '</div>';
  AO._blockEditing = true;
  document.getElementById('actionModal').classList.remove('hidden');
  document.getElementById('btnSaveAction').onclick = AO.Calendar.saveBlock;
};

AO.Calendar.saveBlock = async function () {
  const val = id => document.getElementById(id).value;
  const data = {
    action_id: val('bf_action'),
    starts_at: new Date(val('bf_start')).toISOString(),
    ends_at: new Date(val('bf_end')).toISOString(),
    calendar_id: val('bf_cal') || 'work',
    title: val('bf_title') || null,
    status: val('bf_status'),
  };
  await AO.Store.addBlock(data);
  document.getElementById('actionModal').classList.remove('hidden');
  AO._blockEditing = false;
  document.getElementById('btnSaveAction').onclick = AO.Action.saveEditor;
  AO.Calendar.render();
  AO.toast('Block scheduled');
};
