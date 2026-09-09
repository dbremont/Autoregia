/* PAIS app — fetch analytics, render dashboard, wire controls. */
(function () {
  const hasData = (payload) => payload && payload.totals &&
    (payload.totals.active_time_ms > 0 || payload.totals.clicks > 0 || payload.totals.keystrokes > 0);

  async function render() {
    try {
      const data = await PAIS.fetchAnalytics();
      const empty = document.getElementById("emptyState");
      const cards = ["timeCard", "appsCard"];
      if (!hasData(data)) {
        empty.classList.remove("hidden");
        cards.forEach(id => document.getElementById(id).classList.add("hidden"));
        return;
      }
      empty.classList.add("hidden");
      cards.forEach(id => document.getElementById(id).classList.remove("hidden"));
      PAIS.views.renderWindow(data.window);
      PAIS.views.renderTotals(data.totals);
      PAIS.views.renderTimeChart(data.apps);
      PAIS.views.renderAppsTable(data.apps);
      PAIS.views.renderTimeline(data.timeline);
      PAIS.views.renderIdle(data.idle_gaps);
    } catch (err) {
      console.error("[pais]", err);
    }
  }

  async function pollJobs() {
    const j = await PAIS.fetchJobs();
    const el = document.getElementById("jobsStatus");
    if (el && j) {
      el.textContent = `raw batches: ${j.raw_batches} · pending: ${j.pending_batches} · events: ${j.processed_events}`;
    }
  }

  document.getElementById("btnRefresh").addEventListener("click", render);
  document.getElementById("btnExport").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = PAIS.api + "/export";
    a.download = "pais_export.json";
    a.click();
  });

  const filter = document.getElementById("appFilter");
  let filterTimer = null;
  filter.addEventListener("input", () => {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(async () => {
      const r = await fetch(PAIS.api + "/analytics" +
        (filter.value.trim() ? "?app=" + encodeURIComponent(filter.value.trim()) : ""));
      if (!r.ok) return;
      const data = await r.json();
      PAIS.views.renderTotals(data.totals);
      PAIS.views.renderAppsTable(data.apps);
    }, 250);
  });

  render();
  pollJobs();
  setInterval(render, 15000);   // refresh dashboard every 15 s
  setInterval(pollJobs, 10000);
})();
