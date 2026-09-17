const API = "/ate/tool/awes";

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  return res.json();
}

async function loadEnvironments() {
  const envs = await api("/ate/tool/awes/api/environments");
  const grid = document.getElementById("env-grid");
  const select = document.getElementById("env-select");
  grid.innerHTML = "";
  select.innerHTML = "";
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
  const sessions = await api("/ate/tool/awes/api/sessions");
  const list = document.getElementById("session-list");
  list.innerHTML = sessions.map(s => {
    const statusClass = `badge-${s.status}`;
    const statusLabel = s.status.charAt(0).toUpperCase() + s.status.slice(1);
    return `<div class="session">
      <div class="head">
        <span class="exe-id">${s.session_id} · <span class="badge ${statusClass}">${statusLabel}</span> · exit ${s.exit_code ?? "—"}</span>
        <span style="font-size:0.8rem;color:var(--text-dim)">${s.duration_ms}ms</span>
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
    const result = await api("/ate/tool/awes/api/execute", {
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
    await loadEnvironments();
    await loadSessions();
  } catch (e) {
    status.textContent = `Error: ${e.message}`;
  } finally {
    btn.disabled = false;
  }
}

async function clearSessions() {
  await api("/ate/tool/awes/api/sessions", { method: "DELETE" });
  await loadSessions();
}

document.addEventListener("DOMContentLoaded", () => {
  loadEnvironments();
  loadSessions();
});
