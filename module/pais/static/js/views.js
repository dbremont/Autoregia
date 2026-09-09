/* PAIS views — render analytics payload into the dashboard cards. */
window.PAIS = window.PAIS || {};

PAIS.views = {};

PAIS.views.renderTotals = function (totals) {
  const items = [
    { label: "Active time", value: PAIS.fmtDuration(totals.active_time_ms) },
    { label: "Keystrokes", value: PAIS.fmtInt(totals.keystrokes), sub: "from PKTS" },
    { label: "Clicks", value: PAIS.fmtInt(totals.clicks) },
    { label: "Scrolls", value: PAIS.fmtInt(totals.scrolls) },
    { label: "App switches", value: PAIS.fmtInt(totals.app_switches) },
    { label: "Keys / click", value: totals.keys_per_click.toFixed(2) },
    { label: "Apps seen", value: PAIS.fmtInt(totals.app_count) },
    { label: "Movement", value: PAIS.fmtInt(totals.movement_distance) + "px", sub: "Σ|Δ|" },
  ];
  document.getElementById("totalsRow").innerHTML = items.map(it =>
    `<div class="pais-total"><span class="pais-total-value">${it.value}</span>` +
    `<span class="pais-total-label">${it.label}</span>` +
    (it.sub ? `<span class="pais-total-sub">${it.sub}</span>` : "") + `</div>`
  ).join("");
};

PAIS.views.renderWindow = function (win) {
  const el = document.getElementById("windowLabel");
  if (!el) return;
  if (!win || !win.from_ms) { el.textContent = ""; return; }
  el.textContent = PAIS.fmtTime(win.from_ms) + " → " + PAIS.fmtTime(win.to_ms);
};

PAIS.views.renderTimeChart = function (apps) {
  const el = document.getElementById("timeChart");
  if (!el || !window.echarts) return;
  const chart = echarts.init(el);
  const data = apps.slice().sort((a, b) => b.time_ms - a.time_ms).slice(0, 15);
  chart.setOption({
    grid: { left: 120, right: 60, top: 10, bottom: 24 },
    tooltip: {
      trigger: "axis", axisPointer: { type: "shadow" },
      formatter: p => {
        const ms = p[0].value;
        const pct = (ms / (apps.reduce((s, a) => s + a.time_ms, 0) || 1) * 100).toFixed(1);
        return `<b>${p[0].name}</b><br/>${PAIS.fmtDuration(ms)} (${pct}%)`;
      }
    },
    xAxis: { type: "value", axisLabel: { formatter: v => PAIS.fmtDuration(v) },
             splitLine: { lineStyle: { color: "#E2DED4" } } },
    yAxis: { type: "category", data: data.map(a => a.app).reverse(),
             axisLine: { lineStyle: { color: "#C9C4B8" } },
             axisLabel: { color: "#5B574E", fontFamily: "IBM Plex Mono", fontSize: 11 } },
    series: [{
      type: "bar", data: data.map(a => a.time_ms).reverse(),
      itemStyle: { color: "#7A1A2A", borderRadius: [0, 3, 3, 0] },
      barWidth: "60%"
    }]
  });
  window.addEventListener("resize", () => chart.resize());
};

PAIS.views.renderAppsTable = function (apps) {
  const el = document.getElementById("appsTable");
  if (!apps.length) { el.innerHTML = '<p class="text-muted text-xs">No application data.</p>'; return; }
  const rows = apps.map(a => `
    <tr>
      <td><span class="pais-app-name">${a.app}</span></td>
      <td class="num">${PAIS.fmtDuration(a.time_ms)}</td>
      <td class="num">${PAIS.fmtInt(a.keystrokes)}</td>
      <td class="num">${PAIS.fmtInt(a.clicks)}</td>
      <td class="num">${a.keys_per_click.toFixed(2)}</td>
      <td class="num">${PAIS.fmtInt(a.scrolls)}</td>
      <td class="num">${PAIS.fmtInt(a.movement_distance)}</td>
      <td class="num">${PAIS.fmtInt(a.focus_segments)}</td>
      <td class="num">${PAIS.fmtDuration(a.mean_segment_ms)}</td>
      <td class="num">${(a.fragmentation * 100).toFixed(0)}%</td>
      <td class="num">${PAIS.fmtInt(a.switches)}</td>
    </tr>`).join("");
  el.innerHTML = `<table class="pais-table">
    <thead><tr>
      <th>Application</th><th>Time</th><th>Keys</th><th>Clicks</th><th>Keys/click</th>
      <th>Scrolls</th><th>Movement</th><th>Segments</th><th>Mean seg.</th><th>Fragment.</th><th>Switches</th>
    </tr></thead><tbody>${rows}</tbody></table>`;
};

PAIS.views.renderTimeline = function (timeline) {
  const el = document.getElementById("timelineChart");
  if (!el || !window.echarts) return;
  const chart = echarts.init(el);
  const buckets = timeline.map(b => ({
    name: new Date(b.bucket_ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    keys: b.keystrokes, clicks: b.clicks, scrolls: b.scrolls
  }));
  chart.setOption({
    grid: { left: 50, right: 20, top: 36, bottom: 40 },
    legend: { data: ["Keystrokes", "Clicks", "Scrolls"], top: 0, textStyle: { color: "#5B574E", fontSize: 11 } },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: buckets.map(b => b.name),
             axisLabel: { color: "#5B574E", fontSize: 10 }, axisLine: { lineStyle: { color: "#C9C4B8" } } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "#E2DED4" } },
             axisLabel: { color: "#5B574E", fontSize: 10 } },
    series: [
      { name: "Keystrokes", type: "line", smooth: true, symbol: "none",
        data: buckets.map(b => b.keys), itemStyle: { color: "#7A1A2A" },
        areaStyle: { color: "rgba(122,26,42,0.10)" } },
      { name: "Clicks", type: "line", smooth: true, symbol: "none",
        data: buckets.map(b => b.clicks), itemStyle: { color: "#A8854A" } },
      { name: "Scrolls", type: "line", smooth: true, symbol: "none",
        data: buckets.map(b => b.scrolls), itemStyle: { color: "#3F6092" } },
    ]
  });
  window.addEventListener("resize", () => chart.resize());
};

PAIS.views.renderIdle = function (gaps) {
  const el = document.getElementById("idleTable");
  if (!gaps.length) { el.innerHTML = '<p class="text-muted text-xs">No idle gaps detected.</p>'; return; }
  const rows = gaps.slice(-50).map(g => `
    <tr><td>${PAIS.fmtClock(g.from_ms)}</td><td>${PAIS.fmtClock(g.to_ms)}</td>
    <td class="num">${PAIS.fmtDuration(g.duration_ms)}</td></tr>`).join("");
  el.innerHTML = `<table class="pais-table"><thead><tr>
    <th>From</th><th>To</th><th>Duration</th></tr></thead><tbody>${rows}</tbody></table>`;
};
