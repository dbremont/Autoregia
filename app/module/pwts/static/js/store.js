/* PWTS data layer — fetch analytics + events, expose formatting helpers. */
window.PWTS = window.PWTS || {};

PWTS.api = "/pwts/api";

PWTS.fetchAnalytics = async function () {
  const r = await fetch(PWTS.api + "/analytics");
  if (!r.ok) throw new Error("analytics HTTP " + r.status);
  return r.json();
};

PWTS.fetchEvents = async function (kind) {
  const r = await fetch(PWTS.api + "/events" + (kind ? "?kind=" + kind : ""));
  if (!r.ok) throw new Error("events HTTP " + r.status);
  return r.json();
};

PWTS.fetchJobs = async function () {
  try {
    const r = await fetch(PWTS.api + "/jobs/status");
    return r.ok ? r.json() : null;
  } catch { return null; }
};

PWTS.fmtDuration = function (ms) {
  if (ms == null || isNaN(ms)) return "—";
  const s = ms / 1000;
  if (s < 60) return s.toFixed(0) + "s";
  const m = s / 60;
  if (m < 60) return m.toFixed(m < 10 ? 1 : 0) + "m";
  const h = m / 60;
  return h.toFixed(h < 10 ? 1 : 0) + "h";
};

PWTS.fmtInt = function (n) { return (n == null) ? "—" : Number(n).toLocaleString(); };

PWTS.fmtTime = function (ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleString();
};

PWTS.fmtClock = function (ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleTimeString();
};
