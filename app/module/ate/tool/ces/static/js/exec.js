const API = "/ate/tool/ces";

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    let msg = "HTTP " + res.status;
    try {
      const j = await res.json();
      if (j && (j.error || j.message)) msg = j.error || j.message;
    } catch (e) { /* non-json error body */ }
    throw new Error(msg);
  }
  return res.json();
}

function toast(msg, isError) {
  const el = document.getElementById("run-status");
  if (!el) return;
  const prev = el.dataset.info;
  el.textContent = msg;
  el.style.color = isError ? "var(--red)" : "";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.textContent = prev || "";
    el.style.color = "";
  }, 2600);
}

function renderEmpty(grid, list) {
  grid.innerHTML = '<p class="empty-note" style="grid-column:1/-1">No environments available.</p>';
  list.innerHTML = '<p class="empty-note">No sessions yet — run a workload to see results.</p>';
}

async function loadEnvironments() {
  const grid = document.getElementById("env-grid");
  const select = document.getElementById("env-select");
  let envs;
  try {
    envs = await api("/ate/tool/ces/api/environments");
  } catch (e) {
    grid.innerHTML = '<p class="empty-note" role="alert" style="grid-column:1/-1">Failed to load environments: ' +
      escapeHtml(e.message) + "</p>";
    select.innerHTML = "";
    return;
  }
  grid.innerHTML = "";
  select.innerHTML = "";
  if (!envs.length) {
    renderEmpty(grid, document.getElementById("session-list"));
    return;
  }
  for (const env of envs) {
    const card = document.createElement("div");
    card.className = "env-card";
    card.innerHTML = `
      <div class="name"><span class="status-dot status-${env.status}"></span>${env.name}</div>
      <div class="meta">${env.env_id} · ${env.env_type} · ${env.runtime}</div>
      <div class="meta">Capabilities: ${(env.capabilities || []).join(", ")}</div>
    `;
    grid.appendChild(card);
    const opt = document.createElement("option");
    opt.value = env.env_id;
    opt.textContent = `${env.name} (${env.env_id})`;
    select.appendChild(opt);
  }
}

async function loadSessions() {
  const list = document.getElementById("session-list");
  let sessions;
  try {
    sessions = await api("/ate/tool/ces/api/sessions");
  } catch (e) {
    list.innerHTML = '<p class="empty-note" role="alert">Failed to load sessions: ' +
      escapeHtml(e.message) + "</p>";
    return;
  }
  if (!sessions.length) {
    list.innerHTML = '<p class="empty-note">No sessions yet — run a workload to see results.</p>';
    return;
  }
  list.innerHTML = sessions.map(s => {
    const statusClass = `badge-${s.status}`;
    const statusLabel = s.status.charAt(0).toUpperCase() + s.status.slice(1);
    return `<div class="session">
      <div class="head">
        <span class="exe-id">${s.session_id} · <span class="badge ${statusClass}">${statusLabel}</span> · exit ${s.exit_code ?? "—"}</span>
        <span style="font-size:var(--text-2sm);color:var(--text-dim);font-variant-numeric:tabular-nums">${s.duration_ms}ms</span>
      </div>
      <div class="payload">$ ${s.payload}</div>
      ${s.stdout ? `<div class="output">${escapeHtml(s.stdout)}</div>` : ""}
      ${s.stderr ? `<div class="output" style="color:var(--red)">${escapeHtml(s.stderr)}</div>` : ""}
    </div>`;
  }).join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function run() {
  const btn = document.getElementById("run-btn");
  const status = document.getElementById("run-status");
  btn.disabled = true;
  status.textContent = "Running...";
  try {
    const result = await api("/ate/tool/ces/api/execute", {
      method: "POST",
      body: JSON.stringify({
        env_id: document.getElementById("env-select").value,
        work_type: document.getElementById("work-type").value,
        payload: document.getElementById("payload").value,
      }),
    });
    const okSvg = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><path d="M20 6 9 17l-5-5"/></svg>';
    const koSvg = '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    status.innerHTML = result.status === "completed" ? okSvg + "Done" : koSvg + result.status;
    status.dataset.info = result.status === "completed" ? "Done" : result.status;
    await loadEnvironments();
    await loadSessions();
  } catch (e) {
    status.textContent = `Error: ${e.message}`;
    status.dataset.info = "";
  } finally {
    btn.disabled = false;
  }
}

async function clearSessions() {
  const ok = await AUTOREGIA.confirmDialog({
    title: "Clear session history",
    message: "Delete all recorded sessions? This cannot be undone.",
    confirmText: "Delete all",
  });
  if (!ok) return;
  try {
    await api("/ate/tool/ces/api/sessions", { method: "DELETE" });
    toast("Session history cleared");
  } catch (e) {
    toast("Failed to clear sessions: " + e.message, true);
  }
  await loadSessions();
}

/* ── Command palette (Ctrl/Cmd+K, ui.spec §7.6) ────────── */
const CES_CMD = { sel: 0, items: [], input: null, results: null, overlay: null };

function cesCommands() {
  return [
    { title: "Run workload", hint: "execute in selected environment", run: () => run() },
    { title: "Clear session history", hint: "delete all recorded sessions", run: () => clearSessions() },
    { title: "Focus payload", hint: "edit the workload payload", run: () => document.getElementById("payload").focus() },
    { title: "Focus environment select", hint: "choose the target environment", run: () => document.getElementById("env-select").focus() },
    { title: "Refresh sessions", hint: "reload the session list", run: () => loadSessions() }
  ];
}

function cesPaletteOpen() {
  const ov = CES_CMD.overlay;
  ov.classList.remove("hidden");
  CES_CMD.input.setAttribute("aria-expanded", "true");
  CES_CMD.input.value = "";
  cesPaletteRender("");
  CES_CMD.input.focus();
}
function cesPaletteClose() {
  CES_CMD.overlay.classList.add("hidden");
  CES_CMD.input.setAttribute("aria-expanded", "false");
}
function cesPaletteRender(qRaw) {
  const q = qRaw.toLowerCase().trim();
  CES_CMD.items = cesCommands().filter(c => !q || c.title.toLowerCase().includes(q));
  CES_CMD.sel = 0;
  CES_CMD.results.innerHTML = CES_CMD.items.map((c, i) => `
    <div class="cmd-result-item ${i === 0 ? "active" : ""}" id="cmd-opt-${i}" role="option" aria-selected="${i === 0}" data-i="${i}">
      <div class="t">${c.title}</div><span style="margin-left:auto;font-size:var(--text-2xs);color:var(--text-dim)">${c.hint}</span>
    </div>`).join("");
  CES_CMD.results.querySelectorAll(".cmd-result-item").forEach(el => {
    const i = +el.getAttribute("data-i");
    el.addEventListener("mouseenter", () => { CES_CMD.sel = i; cesPaintActive(); });
    el.addEventListener("click", () => cesActivate(i));
  });
}
function cesPaintActive() {
  CES_CMD.results.querySelectorAll(".cmd-result-item").forEach((el, i) => {
    el.classList.toggle("active", i === CES_CMD.sel);
    el.setAttribute("aria-selected", i === CES_CMD.sel ? "true" : "false");
  });
  const a = CES_CMD.results.querySelector(".cmd-result-item.active");
  if (a) { a.scrollIntoView({ block: "nearest" }); CES_CMD.input.setAttribute("aria-activedescendant", a.id); }
}
function cesActivate(i) {
  const it = CES_CMD.items[i];
  cesPaletteClose();
  if (it) it.run();
}

document.addEventListener("DOMContentLoaded", () => {
  loadEnvironments();
  loadSessions();
  CES_CMD.overlay = document.getElementById("cmdPalette");
  CES_CMD.input = document.getElementById("cmdInput");
  CES_CMD.results = document.getElementById("cmdResults");
  CES_CMD.input.addEventListener("input", e => cesPaletteRender(e.target.value));
  CES_CMD.input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); CES_CMD.sel = Math.min(CES_CMD.sel + 1, CES_CMD.items.length - 1); cesPaintActive(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); CES_CMD.sel = Math.max(CES_CMD.sel - 1, 0); cesPaintActive(); }
    else if (e.key === "Enter") { e.preventDefault(); cesActivate(CES_CMD.sel); }
    else if (e.key === "Escape") cesPaletteClose();
  });
  CES_CMD.overlay.addEventListener("click", e => { if (e.target === CES_CMD.overlay) cesPaletteClose(); });
  document.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); cesPaletteOpen(); }
  });
});
