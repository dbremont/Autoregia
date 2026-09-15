/* PWTS app — fetch analytics, render dashboard, wire controls. */
(function () {
  const hasData = (payload) => payload && payload.totals &&
    (payload.totals.active_time_ms > 0 || payload.totals.clicks > 0 || payload.totals.keystrokes > 0);

  async function render() {
    try {
      const data = await PWTS.fetchAnalytics();
      const empty = document.getElementById("emptyState");
      const cards = ["timeCard", "appsCard"];
      if (!hasData(data)) {
        empty.classList.remove("hidden");
        cards.forEach(id => document.getElementById(id).classList.add("hidden"));
        return;
      }
      empty.classList.add("hidden");
      cards.forEach(id => document.getElementById(id).classList.remove("hidden"));
      PWTS.views.renderWindow(data.window);
      PWTS.views.renderTotals(data.totals);
      PWTS.views.renderTimeChart(data.apps);
      PWTS.views.renderAppsTable(data.apps);
      PWTS.views.renderTimeline(data.timeline);
      PWTS.views.renderIdle(data.idle_gaps);
    } catch (err) {
      console.error("[pwts]", err);
    }
  }

  async function pollJobs() {
    const j = await PWTS.fetchJobs();
    const el = document.getElementById("jobsStatus");
    if (el && j) {
      el.textContent = `raw batches: ${j.raw_batches} · pending: ${j.pending_batches} · events: ${j.processed_events}`;
    }
  }

  document.getElementById("btnRefresh").addEventListener("click", render);
  document.getElementById("btnExport").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = PWTS.api + "/export";
    a.download = "pwts_export.json";
    a.click();
  });

  const filter = document.getElementById("appFilter");
  let filterTimer = null;
  filter.addEventListener("input", () => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(async () => {
      const r = await fetch(PWTS.api + "/analytics" +
        (filter.value.trim() ? "?app=" + encodeURIComponent(filter.value.trim()) : ""));
      if (!r.ok) return;
      const data = await r.json();
      PWTS.views.renderTotals(data.totals);
      PWTS.views.renderAppsTable(data.apps);
    }, 250);
  });

  render();
  pollJobs();
  setInterval(render, 15000);   // refresh dashboard every 15 s
  setInterval(pollJobs, 10000);
})();
