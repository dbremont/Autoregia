/**
 * PRS Forms Module
 * Handles create/edit record modals and form interactions.
 */
const PRS_Forms = (function () {
  let META = null;
  let allRecords = [];

  async function ensureMeta() {
    if (!META) {
      META = await PRS_API.getMeta();
    }
    return META;
  }

  function setRecords(records) {
    allRecords = records;
  }

  // -----------------------------------------------------------------------
  // Tag picker
  // -----------------------------------------------------------------------
  function renderTagPicker(containerId, selected) {
    const el = document.getElementById(containerId);
    if (!el || !META) return;
    el.innerHTML = "";
    META.tags.forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      if (selected && selected.includes(tag)) chip.classList.add("selected");
      chip.textContent = tag;
      chip.onclick = () => chip.classList.toggle("selected");
      el.appendChild(chip);
    });
  }

  function getSelectedTags(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return [];
    return Array.from(el.querySelectorAll(".tag-chip.selected")).map(
      (c) => c.textContent
    );
  }

  // -----------------------------------------------------------------------
  // Relations editor
  // -----------------------------------------------------------------------
  function renderRelationsEditor(containerId, relations) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = "";

    function addRow(target = "", type = "related-to") {
      const row = document.createElement("div");
      row.className = "relation-row";

      const sel = document.createElement("select");
      sel.className = "rel-target";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "-- target --";
      sel.appendChild(placeholder);
      allRecords.forEach((r) => {
        const opt = document.createElement("option");
        opt.value = r.id;
        opt.textContent = `${r.id} — ${r.content.substring(0, 30)}`;
        if (r.id === target) opt.selected = true;
        sel.appendChild(opt);
      });
      row.appendChild(sel);

      const typeSel = document.createElement("select");
      typeSel.className = "rel-type";
      META.relationTypes.forEach((rt) => {
        const opt = document.createElement("option");
        opt.value = rt;
        opt.textContent = rt;
        if (rt === type) opt.selected = true;
        typeSel.appendChild(opt);
      });
      row.appendChild(typeSel);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn btn-sm btn-danger";
      removeBtn.textContent = "✕";
      removeBtn.onclick = () => row.remove();
      row.appendChild(removeBtn);

      el.appendChild(row);
    }

    if (relations && relations.length > 0) {
      relations.forEach((rel) =>
        addRow(
          typeof rel === "object" ? rel.target : rel,
          typeof rel === "object" ? rel.type : "related-to"
        )
      );
    }

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn btn-sm";
    addBtn.textContent = "+ Add Relation";
    addBtn.onclick = () => addRow();
    el.appendChild(addBtn);
  }

  function collectRelations(containerId, selfId) {
    const el = document.getElementById(containerId);
    if (!el) return [];
    const rows = el.querySelectorAll(".relation-row");
    const result = [];
    rows.forEach((row) => {
      const target = row.querySelector(".rel-target").value;
      const type = row.querySelector(".rel-type").value;
      if (target && type && target !== selfId) {
        result.push({ target, type });
      }
    });
    return result;
  }

  // -----------------------------------------------------------------------
  // Open create form
  // -----------------------------------------------------------------------
  async function openCreate() {
    await ensureMeta();
    const body = document.getElementById("modal-content");

    body.innerHTML = `
      <div class="form-body" style="grid-column: 1 / -1;">
        <div class="form-group">
          <label>Content *</label>
          <input type="text" id="f-content" placeholder="Brief record description" />
        </div>
        <div class="form-group">
          <label>Detail</label>
          <textarea id="f-detail" placeholder="Extended explanation, notes, context..."></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Domain</label>
            <select id="f-domain"></select>
          </div>
          <div class="form-group">
            <label>Classification</label>
            <select id="f-classification"></select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Execution State</label>
            <select id="f-execution"></select>
          </div>
          <div class="form-group">
            <label>Priority</label>
            <select id="f-priority"></select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Validation State</label>
            <select id="f-validation"></select>
          </div>
          <div class="form-group">
            <label>Orientation</label>
            <select id="f-orientation"></select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Deadline (optional)</label>
            <input type="datetime-local" id="f-deadline" />
          </div>
          <div class="form-group">
            <label>Retention Policy</label>
            <select id="f-retention"></select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Project Context</label>
            <input type="text" id="f-project" placeholder="e.g., Project-Alpha" />
          </div>
          <div class="form-group">
            <label>Delegation</label>
            <input type="text" id="f-delegation" placeholder="e.g., team-backend" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Cognitive Category</label>
            <select id="f-cognitive"></select>
          </div>
          <div class="form-group">
            <label>Operational Category</label>
            <select id="f-operational"></select>
          </div>
        </div>
        <div class="form-group">
          <label>Confidence</label>
          <input type="range" id="f-confidence" min="0" max="100" value="50" oninput="document.getElementById('f-confidence-val').textContent = this.value + '%';" />
          <span class="hint"><span id="f-confidence-val">50%</span></span>
        </div>
        <div class="form-group">
          <label>Tags</label>
          <div class="tag-picker" id="f-tags"></div>
        </div>
        <div class="form-group">
          <label>Relations</label>
          <div id="f-relations"></div>
        </div>
      </div>
    `;

    _populateSelects();
    renderTagPicker("f-tags", []);
    renderRelationsEditor("f-relations", []);

    document.getElementById("modal-title").textContent = "New Record";
    document.getElementById("modal-footer").style.display = "flex";
    document.getElementById("modal-footer").innerHTML = `
      <button class="btn" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="PRS_Forms.submitCreate()">Create Record</button>
    `;
    document.getElementById("modal-overlay").classList.add("active");
  }

  // -----------------------------------------------------------------------
  // Open edit form
  // -----------------------------------------------------------------------
  async function openEdit(id) {
    await ensureMeta();
    const r = await PRS_API.getRecord(id);
    const body = document.getElementById("modal-content");

    const deadline = r.temporalMetadata?.deadline
      ? r.temporalMetadata.deadline.replace(" ", "T").slice(0, 16)
      : "";

    body.innerHTML = `
      <div class="form-body" style="grid-column: 1 / -1;">
        <div class="form-group">
          <label>ID</label>
          <input type="text" value="${r.id}" disabled style="opacity:0.5;" />
        </div>
        <div class="form-group">
          <label>Content *</label>
          <input type="text" id="f-content" value="${_esc(r.content)}" />
        </div>
        <div class="form-group">
          <label>Detail</label>
          <textarea id="f-detail">${_esc(r.detail || "")}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Domain</label>
            <select id="f-domain"></select>
          </div>
          <div class="form-group">
            <label>Classification</label>
            <select id="f-classification"></select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Execution State</label>
            <select id="f-execution"></select>
          </div>
          <div class="form-group">
            <label>Priority</label>
            <select id="f-priority"></select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Validation State</label>
            <select id="f-validation"></select>
          </div>
          <div class="form-group">
            <label>Orientation</label>
            <select id="f-orientation"></select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Deadline</label>
            <input type="datetime-local" id="f-deadline" value="${deadline}" />
          </div>
          <div class="form-group">
            <label>Retention Policy</label>
            <select id="f-retention"></select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Project Context</label>
            <input type="text" id="f-project" value="${_esc(r.contextualMetadata?.projectContext || "")}" />
          </div>
          <div class="form-group">
            <label>Delegation</label>
            <input type="text" id="f-delegation" value="${_esc(r.operationalMetadata?.delegation || "")}" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Cognitive Category</label>
            <select id="f-cognitive"></select>
          </div>
          <div class="form-group">
            <label>Operational Category</label>
            <select id="f-operational"></select>
          </div>
        </div>
        <div class="form-group">
          <label>Confidence</label>
          <input type="range" id="f-confidence" min="0" max="100" value="${parseInt(r.epistemicMetadata?.confidence) || 50}" oninput="document.getElementById('f-confidence-val').textContent = this.value + '%';" />
          <span class="hint"><span id="f-confidence-val">${parseInt(r.epistemicMetadata?.confidence) || 50}%</span></span>
        </div>
        <div class="form-group">
          <label>Tags</label>
          <div class="tag-picker" id="f-tags"></div>
        </div>
        <div class="form-group">
          <label>Relations</label>
          <div id="f-relations"></div>
        </div>
      </div>
    `;

    _populateSelects(r);
    renderTagPicker("f-tags", r.generalMetadata?.tags || []);
    renderRelationsEditor("f-relations", r.relationalMetadata || []);

    document.getElementById("modal-title").textContent = `Edit: ${r.id}`;
    document.getElementById("modal-footer").style.display = "flex";
    document.getElementById("modal-footer").innerHTML = `
      <button class="btn btn-danger" onclick="PRS_Forms.confirmDelete('${r.id}')">Delete</button>
      <button class="btn" onclick="app.closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="PRS_Forms.submitEdit('${r.id}')">Save Changes</button>
    `;
    document.getElementById("modal-overlay").classList.add("active");
  }

  // -----------------------------------------------------------------------
  // Submit handlers
  // -----------------------------------------------------------------------
  function _collectFormData(id) {
    const confidence = document.getElementById("f-confidence").value;
    const deadline = document.getElementById("f-deadline").value;
    return {
      content: document.getElementById("f-content").value.trim(),
      detail: document.getElementById("f-detail").value.trim(),
      retentionPolicy: document.getElementById("f-retention").value,
      temporalMetadata: {
        deadline: deadline ? deadline.replace("T", " ") + ":00" : null,
        orientation: document.getElementById("f-orientation").value,
      },
      contextualMetadata: {
        projectContext: document.getElementById("f-project").value.trim() || null,
      },
      epistemicMetadata: {
        confidence: confidence + "%",
        validationState: document.getElementById("f-validation").value,
      },
      operationalMetadata: {
        executionState: document.getElementById("f-execution").value,
        priority: document.getElementById("f-priority").value,
        delegation: document.getElementById("f-delegation").value.trim() || null,
      },
      generalMetadata: {
        classification: document.getElementById("f-classification").value,
        domain: document.getElementById("f-domain").value,
        tags: getSelectedTags("f-tags"),
        cognitiveCategory: document.getElementById("f-cognitive").value,
        operationalCategory: document.getElementById("f-operational").value,
      },
      relationalMetadata: collectRelations("f-relations", id),
    };
  }

  async function submitCreate() {
    const data = _collectFormData(null);
    if (!data.content) {
      app.toast("Content is required", "error");
      return;
    }
    try {
      await PRS_API.createRecord(data);
      app.closeModal();
      app.toast("Record created");
      await app.refresh();
    } catch (e) {
      app.toast(e.message, "error");
    }
  }

  async function submitEdit(id) {
    const data = _collectFormData(id);
    if (!data.content) {
      app.toast("Content is required", "error");
      return;
    }
    try {
      await PRS_API.updateRecord(id, data);
      app.closeModal();
      app.toast("Record updated");
      await app.refresh();
    } catch (e) {
      app.toast(e.message, "error");
    }
  }

  async function confirmDelete(id) {
    if (!confirm(`Delete record ${id}? This cannot be undone.`)) return;
    try {
      await PRS_API.deleteRecord(id);
      app.closeModal();
      app.toast("Record deleted");
      await app.refresh();
    } catch (e) {
      app.toast(e.message, "error");
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  function _populateSelects(r = {}) {
    const set = (id, options, current) => {
      const el = document.getElementById(id);
      el.innerHTML = options
        .map((o) => `<option value="${o}" ${o === current ? "selected" : ""}>${o}</option>`)
        .join("");
    };

    set("f-domain", META.domains, r.generalMetadata?.domain || "technical-work");
    set("f-classification", META.classifications, r.generalMetadata?.classification || "Internal");
    set("f-execution", META.executionStates, r.operationalMetadata?.executionState || "pending");
    set("f-priority", META.priorities, r.operationalMetadata?.priority || "medium");
    set("f-validation", META.validationStates, r.epistemicMetadata?.validationState || "speculative");
    set("f-orientation", META.orientations, r.temporalMetadata?.orientation || "present");
    set("f-retention", META.retentionPolicies, r.retentionPolicy || "permanent");
    set("f-cognitive", META.cognitiveCategories, r.generalMetadata?.cognitiveCategory || "Operational State");
    set("f-operational", META.operationalCategories, r.generalMetadata?.operationalCategory || "task");
  }

  function _esc(s) {
    const d = document.createElement("div");
    d.textContent = s || "";
    return d.innerHTML;
  }

  return {
    openCreate,
    openEdit,
    submitCreate,
    submitEdit,
    confirmDelete,
    setRecords,
    ensureMeta,
  };
})();