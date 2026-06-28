/* PWOS Hierarchy - Objective > Initiative > Project > Task tree */
window.PW = window.PW || {};

PW.HierarchyView = function () {
  return '<div class="content-header"><div><span class="eyebrow">Component A · Action Hierarchy</span><h1>Objective Tree</h1></div>' +
    '<button class="btn btn-ghost btn-sm" onclick="PW.renderHierarchy()"><pw-icon name="refresh-cw" size="15"></pw-icon> Refresh</button></div>' +
    '<div id="hierTree" class="tree-container"></div>';
};

PW.renderHierarchy = async function () {
  const el = document.getElementById('hierTree'); if (!el) return;
  el.innerHTML = '<p class="text-muted">Loading…</p>';
  try {
    const res = await fetch('/api/hierarchy');
    const data = await res.json();
    let html = '';
    data.objectives.forEach(o => {
      html += PW._hierNode(o.action, 0);
      o.initiatives.forEach(ini => {
        html += PW._hierNode(ini.action, 1);
        ini.projects.forEach(p => {
          html += PW._hierNode(p.action, 2);
          p.tasks.forEach(t => { html += PW._hierNode(t.action, 3); });
        });
      });
    });
    if (data.orphan_projects && data.orphan_projects.length) {
      html += '<div class="tree-orphan-label">Orphan projects</div>';
      data.orphan_projects.forEach(p => { html += PW._hierNode(p, 2); });
    }
    if (data.orphan_tasks && data.orphan_tasks.length) {
      html += '<div class="tree-orphan-label">Orphan tasks</div>';
      data.orphan_tasks.forEach(t => { html += PW._hierNode(t, 3); });
    }
    el.innerHTML = html || '<p class="text-muted">No hierarchy.</p>';
  } catch (e) { el.innerHTML = '<p class="text-muted">Failed to load.</p>'; }
};

PW._hierNode = function (a, depth) {
  const color = PW.kindColor(a.kind);
  const indent = depth * 24;
  return '<div class="tree-node" style="margin-left:' + indent + 'px" onclick="PW.Action.showDetail(\'' + a.id + '\')">' +
    '<span class="tree-dot" style="background:' + color + '"></span>' +
    '<span class="tree-kind" style="color:' + color + '">' + a.kind + '</span>' +
    '<span class="tree-id mono">' + PW.esc(a.record_id) + '</span>' +
    '<span class="badge badge-neutral">' + PW.prettyEnum(a.scheduling_state) + '</span></div>';
};
