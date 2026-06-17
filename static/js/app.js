/**
 * PRS Application Controller
 * Manages views, navigation, rendering, and data state.
 */
const app = {
  state: {
    records: [],
    view: "dashboard",
    filter: "all",
    search: "",
  },

  // -----------------------------------------------------------------------
  // Init
  // -----------------------------------------------------------------------
  async init() {
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);

    // search input
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      let debounce;
      searchInput.addEventListener("input", (e) => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          this.state.search = e.target.value.trim();
          this.loadRecords();
        }, 250);
      });
    }

    PRS_Graph.init();
    await this.refresh();
  },

  async refresh() {
    await this.loadRecords();
    this.renderAll();
  },

  async loadRecords() {
    try {
      this.state.records = await PRS_API.listRecords(
        this.state.filter,
        this.state.search
      );
      PRS_Forms.setRecords(this.state.records);
      document.getElementById("recordCount").textContent = this.state.records.length;
    } catch (e) {
      this.toast("Failed to load records: " + e.message, "error");
    }
  },

  renderAll() {
    this.renderDashboard();
    this.renderRecordsTable();
    this.renderTimeline();
    if (this.state.view === "graph") PRS_Graph.draw();
  },

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------
  navigate(view) {
    this.state.view = view;
    document.querySelectorAll(".view-container").forEach((el) =>
      el.classList.remove("active")
    );
    document.getElementById(`view-${view}`).classList.add("active");

    // highlight perspective nav items
    document.querySelectorAll(".nav-item[data-view]").forEach((el) =>
      el.classList.remove("active")
    );
    const navEl = document.querySelector(`.nav-item[data-view="${view}"]`);
    if (navEl) navEl.classList.add("active");

    if (view === "graph") PRS_Graph.draw();
    else PRS_Graph.stop();
  },

  filter(type) {
    this.state.filter = type;
    document.querySelectorAll(".nav-item[data-filter]").forEach((el) =>
      el.classList.remove("active")
    );
    const navEl = document.querySelector(`.nav-item[data-filter="${type}"]`);
    if (navEl) navEl.classList.add("active");
    this.loadRecords().then(() => this.renderAll());
  },

  updateTime() {
    const el = document.getElementById("currentTime");
    if (el) {
      const now = new Date();
      el.textContent = now.toISOString().replace("T", " ").slice(0, 19);
    }
  },

  // -----------------------------------------------------------------------
  // Dashboard
  // -----------------------------------------------------------------------
  async renderDashboard() {
    let stats;
    try {
      stats = await PRS_API.getStats();
    } catch {
      stats = { total: 0, active: 0, blocked: 0, critical: 0, speculative: 0 };
    }

    const metrics = [
      { title: "Total Records", value: stats.total, color: "var(--accent-blue)" },
      { title: "Active Tasks", value: stats.active, color: "var(--accent-green)" },
      { title: "Blocked Items", value: stats.blocked, color: "var(--accent-red)" },
      { title: "Critical Priority", value: stats.critical, color: "var(--accent-yellow)" },
      { title: "Speculative", value: stats.speculative, color: "var(--accent-purple)" },
    ];

    document.getElementById("dashboardCards").innerHTML = metrics
      .map(
        (m) => `
      <div class="card">
        <div class="card-title">${m.title}</div>
        <div class="card-value" style="color: ${m.color}">${m.value}</div>
        <div class="card-meta">System-wide</div>
      </div>`
      )
      .join("");

    // recent activity
    const recent = [...this.state.records]
      .sort(
        (a, b) =>
          new Date(b.temporalMetadata?.updatedAt || 0) -
          new Date(a.temporalMetadata?.updatedAt || 0)
      )
      .slice(0, 8);

    const tbody = document.getElementById("recentActivity");
    if (recent.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="empty-state">No records found</td></tr>';
      return;
    }

    tbody.innerHTML = recent
      .map(
        (r) => `
      <tr onclick="app.showDetail('${r.id}')">
        <td style="font-family: monospace; color: var(--accent-blue);">${r.id}</td>
        <td>${_trunc(r.content, 50)}</td>
        <td><span class="badge badge-${r.operationalMetadata?.executionState || "neutral"}">${r.operationalMetadata?.executionState || "—"}</span></td>
        <td><span class="badge badge-${r.operationalMetadata?.priority || "neutral"}">${r.operationalMetadata?.priority || "—"}</span></td>
        <td>${r.contextualMetadata?.projectContext || "—"}</td>
      </tr>`
      )
      .join("");
  },

  // -----------------------------------------------------------------------
  // Records table
  // -----------------------------------------------------------------------
  renderRecordsTable() {
    const tbody = document.getElementById("recordTable");
    if (this.state.records.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="empty-state">No records found. Click "New Record" to create one.</td></tr>';
      return;
    }

    tbody.innerHTML = this.state.records
      .map(
        (r) => `
      <tr onclick="app.showDetail('${r.id}')">
        <td style="font-family: monospace;">${r.id}</td>
        <td>${r.generalMetadata?.domain || "—"}</td>
        <td>${_trunc(r.content, 50)}</td>
        <td><span class="badge badge-${r.epistemicMetadata?.validationState || "neutral"}">${r.epistemicMetadata?.validationState || "—"}</span></td>
        <td>${r.lifecycleMetadata?.state || "—"}</td>
      </tr>`
      )
      .join("");
  },

  // -----------------------------------------------------------------------
  // Timeline
  // -----------------------------------------------------------------------
  async renderTimeline() {
    let records;
    try {
      records = await PRS_API.getTimeline();
    } catch {
      records = [];
    }

    const container = document.getElementById("timelineList");
    if (records.length === 0) {
      container.innerHTML =
        '<div class="empty-state">No upcoming deadlines</div>';
      return;
    }

    container.innerHTML = records
      .map(
        (r) => `
      <div class="timeline-item" onclick="app.showDetail('${r.id}')">
        <div>
          <span class="timeline-date">${(r.temporalMetadata.deadline || "").split(" ")[0]}</span>
          <span style="margin-left: 12px;">${_trunc(r.content, 40)}</span>
        </div>
        <span class="badge badge-${r.operationalMetadata?.priority || "neutral"}">${r.operationalMetadata?.priority || "—"}</span>
      </div>`
      )
      .join("");
  },

  // -----------------------------------------------------------------------
  // Detail Modal
  // -----------------------------------------------------------------------
  async showDetail(id) {
    let r;
    try {
      r = await PRS_API.getRecord(id);
    } catch (e) {
      this.toast("Failed to load record: " + e.message, "error");
      return;
    }

    document.getElementById("modal-title").textContent = `Record: ${r.id}`;

    let prslText = "";
    try {
      const prsl = await PRS_API.exportPRSL(id);
      prslText = prsl.prsl;
    } catch {
      /* optional */
    }

    const rels = r.relationalMetadata || [];

    document.getElementById("modal-content").innerHTML = `
      <div class="detail-section">
        <h4>Core Content</h4>
        <div class="detail-row"><span class="detail-key">Content:</span><span class="detail-val">${_esc(r.content)}</span></div>
        <div class="detail-row"><span class="detail-key">Detail:</span><span class="detail-val">${_esc(r.detail) || "—"}</span></div>
        <div class="detail-row"><span class="detail-key">Retention:</span><span class="detail-val">${r.retentionPolicy || "—"}</span></div>
      </div>

      <div class="detail-section">
        <h4>Operational State</h4>
        <div class="detail-row"><span class="detail-key">State:</span><span class="detail-val">${r.operationalMetadata?.executionState || "—"}</span></div>
        <div class="detail-row"><span class="detail-key">Priority:</span><span class="detail-val">${r.operationalMetadata?.priority || "—"}</span></div>
        <div class="detail-row"><span class="detail-key">Delegation:</span><span class="detail-val">${r.operationalMetadata?.delegation || "—"}</span></div>
        <div class="detail-row"><span class="detail-key">Actionable:</span><span class="detail-val">${r.operationalMetadata?.actionability ?? "—"}</span></div>
      </div>

      <div class="detail-section">
        <h4>Epistemic Status</h4>
        <div class="detail-row"><span class="detail-key">Validation:</span><span class="detail-val">${r.epistemicMetadata?.validationState || "—"}</span></div>
        <div class="detail-row"><span class="detail-key">Confidence:</span><span class="detail-val">${r.epistemicMetadata?.confidence || "—"}</span></div>
        <div class="detail-row"><span class="detail-key">Evidence:</span><span class="detail-val">${(r.epistemicMetadata?.evidenceSource || []).join(", ") || "—"}</span></div>
      </div>

      <div class="detail-section">
        <h4>Context</h4>
        <div class="detail-row"><span class="detail-key">Project:</span><span class="detail-val">${r.contextualMetadata?.projectContext || "—"}</span></div>
        <div class="detail-row"><span class="detail-key">Domain:</span><span class="detail-val">${r.generalMetadata?.domain || "—"}</span></div>
        <div class="detail-row"><span class="detail-key">Classification:</span><span class="detail-val">${r.generalMetadata?.classification || "—"}</span></div>
        <div class="detail-row"><span class="detail-key">Category:</span><span class="detail-val">${r.generalMetadata?.cognitiveCategory || "—"}</span></div>
      </div>

      <div class="detail-section">
        <h4>Temporal</h4>
        <div class="detail-row"><span class="detail-key">Created:</span><span class="detail-val">${r.temporalMetadata?.createdAt || "—"}</span></div>
        <div class="detail-row"><span class="detail-key">Updated:</span><span class="detail-val">${r.temporalMetadata?.updatedAt || "—"}</span></div>
        <div class="detail-row"><span class="detail-key">Deadline:</span><span class="detail-val">${r.temporalMetadata?.deadline || "—"}</span></div>
        <div class="detail-row"><span class="detail-key">Orientation:</span><span class="detail-val">${r.temporalMetadata?.orientation || "—"}</span></div>
      </div>

      <div class="detail-section">
        <h4>Lifecycle</h4>
        <div class="detail-row"><span class="detail-key">State:</span><span class="detail-val">${r.lifecycleMetadata?.state || "—"}</span></div>
        <div class="detail-row"><span class="detail-key">Revision:</span><span class="detail-val">${r.lifecycleMetadata?.revision ?? "—"}</span></div>
      </div>

      <div class="detail-section" style="grid-column: 1 / -1;">
        <h4>Tags</h4>
        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          ${(r.generalMetadata?.tags || [])
            .map((t) => `<span class="badge badge-active">${_esc(t)}</span>`)
            .join("") || '<span class="detail-key">No tags</span>'}
        </div>
      </div>

      <div class="detail-section" style="grid-column: 1 / -1;">
        <h4>Relational Links (${rels.length})</h4>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${
            rels.length > 0
              ? rels
                  .map(
                    (rel) =>
                      `<span class="badge badge-active" style="cursor:pointer;" onclick="app.closeModal(); app.showDetail('${rel.target}')">${rel.type} → ${rel.target}</span>`
                  )
                  .join("")
              : '<span class="detail-key">No relations defined</span>'
          }
        </div>
      </div>

      ${prslText ? `<div class="raw-grammar">${_esc(prslText)}</div>` : ""}
    `;

    document.getElementById("modal-footer").style.display = "flex";
    document.getElementById("modal-footer").innerHTML = `
      <button class="btn" onclick="app.closeModal()">Close</button>
      <button class="btn" onclick="PRS_Forms.openEdit('${r.id}')">Edit</button>
    `;

    document.getElementById("modal-overlay").classList.add("active");
  },

  closeModal() {
    document.getElementById("modal-overlay").classList.remove("active");
  },

  // -----------------------------------------------------------------------
  // Toast
  // -----------------------------------------------------------------------
  toast(message, type = "success") {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();

    const el = document.createElement("div");
    el.className = "toast" + (type === "error" ? " error" : "");
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  },
};

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------
function _esc(s) {
  if (s == null) return "";
  const d = document.createElement("div");
  d.textContent = String(s);
  return d.innerHTML;
}

function _trunc(s, n) {
  if (!s) return "";
  return s.length > n ? _esc(s.substring(0, n)) + "…" : _esc(s);
}

// Boot
window.addEventListener("DOMContentLoaded", () => app.init());