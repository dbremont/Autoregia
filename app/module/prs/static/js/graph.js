/* ════════════════════════════════════════════════════════════
   PRS Graph — Record Relationship Graph (SVG)
   ════════════════════════════════════════════════════════════ */
PRS.Graph = {
  render() {
    const records = PRS.Store.getAll();
    const links = records.filter(r=>r.links&&r.links.length);
    return `
    <div class="content-header"><div><span class="eyebrow">Topology</span><h1>Relationship Graph</h1></div>
      <div class="actions"><span class="text-sm text-muted">${links.length} records with relationships</span></div>
    </div>
    <div class="graph-container" id="graphEl"></div>`;
  }
};

PRS.Graph.renderSVG = function() {
  const el = document.getElementById('graphEl');
  if (!el) return;
  const records = PRS.Store.getAll();
  // Build nodes and edges from links
  const nodeIds = new Set();
  const edges = [];
  records.forEach(r => {
    nodeIds.add(r.id);
    (r.links||[]).forEach(l => {
      if (l.target) { edges.push({source:r.id, target:l.target, type:l.type}); nodeIds.add(l.target); }
    });
  });
  const nodes = [...nodeIds].map(id => ({id, rec:PRS.Store.getById(id)})).filter(n=>n.rec);
  
  // Simple force-directed layout
  const W=el.clientWidth||700, H=400;
  const cx=W/2, cy=H/2;
  const positions = {};
  nodes.forEach((n,i) => {
    const angle=(i/nodes.length)*2*Math.PI;
    const r=120+Math.random()*80;
    positions[n.id]={x:cx+r*Math.cos(angle), y:cy+r*Math.sin(angle)};
  });

  let svg = `<svg class="graph-svg" viewBox="0 0 ${W} ${H}">
    <defs><marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#ccc"/>
    </marker></defs>`;

  // Edges
  edges.forEach(e => {
    const s=positions[e.source], t=positions[e.target];
    if (!s || !t) return;
    svg += `<line class="graph-edge" x1="${s.x}" y1="${s.y}" x2="${t.x}" y2="${t.y}"
      marker-end="url(#arrowhead)" stroke="#ccc" stroke-width="1.5">
      <title>${e.type}</title></line>`;
  });

  // Nodes
  nodes.forEach(n => {
    const p=positions[n.id];
    if(!p)return;
    const tc=TYPE_COLORS[n.rec.record_type]||'#888';
    svg += `<g class="graph-node" onclick="PRS.record.showDetail('${n.id}')">
      <circle cx="${p.x}" cy="${p.y}" r="22" fill="${tc}22" stroke="${tc}" stroke-width="2"/>
      <text x="${p.x}" y="${p.y+4}" text-anchor="middle" font-size="9" fill="#333"
        style="pointer-events:none;font-weight:600;">${n.rec.record_type.substring(0,3)}</text>
      <text x="${p.x}" y="${p.y+36}" text-anchor="middle" class="graph-label" fill="#666">
        ${n.rec.content.substring(0,18)}</text>
    </g>`;
  });
  svg += `</svg>`;
  el.innerHTML = svg;
};
setTimeout(PRS.Graph.renderSVG, 100);