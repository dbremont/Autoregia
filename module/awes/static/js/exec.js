const API = "";

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  return res.json();
}

async function loadEnvironments() {
  const envs = await api("/api/environments");
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
  const sessions = await api("/api/sessions");
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
    const result = await api("/api/execute", {
      method: "POST",
      body: JSON.stringify({
        env_id: document.getElementById("env-select").value,
        work_type: document.getElementById("work-type").value,
        payload: document.getElementById("payload").value,
      }),
    });
    status.textContent = result.status === "completed" ? "✓ Done" : `✗ ${result.status}`;
    await loadEnvironments();
    await loadSessions();
  } catch (e) {
    status.textContent = `Error: ${e.message}`;
  } finally {
    btn.disabled = false;
  }
}

async function clearSessions() {
  await api("/api/sessions", { method: "DELETE" });
  await loadSessions();
}

document.addEventListener("DOMContentLoaded", () => {
  loadEnvironments();
  loadSessions();
});
