/* ════════════════════════════════════════════════════════════
   PRS Heatmap — GitHub-style Activity Heatmap (SVG)
   ════════════════════════════════════════════════════════════ */
PRS.Heatmap = {
  render() {
    const records = PRS.Store.getAll();
    const stats = PRS.Store.getStats();
    return `
    <div class="content-header">
      <div><span class="eyebrow">Rhythm</span><h1>Activity Heatmap</h1></div>
      <div class="actions"><span class="text-sm text-muted">${stats.total} records over time</span></div>
    </div>
    <div class="card animate-in"><div class="card-body"><div class="heatmap-container" id="heatmapEl"></div></div></div>`;
  }
};

// Render after DOM insertion
PRS.Heatmap.renderSVG = function() {
  const el = document.getElementById('heatmapEl');
  if (!el) return;
  const records = PRS.Store.getAll();
  // Build day counts for last ~6 months
  const now = new Date();
  const daysAgo = 180;
  const dayCounts = {};
  for (let i = daysAgo; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate()-i);
    dayCounts[d.toISOString().split('T')[0]] = 0;
  }
  records.forEach(r => {
    if (r.created_at) { const d = r.created_at.split('T')[0]; if (dayCounts[d]!==undefined) dayCounts[d]++; }
  });
  const entries = Object.entries(dayCounts);
  const maxCount = Math.max(...entries.map(e=>e[1]),1);
  const weeks = Math.ceil(entries.length / 7);
  const cellSize = 12; const cellGap = 3;
  const w = weeks * (cellSize+cellGap) + 30;
  const h = 7 * (cellSize+cellGap) + 20;
  
  let svg = `<svg class="heatmap-svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
  // Month labels
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // Day labels
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach((day,i) => {
    svg += `<text x="0" y="${i*(cellSize+cellGap)+cellSize+2}" class="heatmap-label">${day}</text>`;
  });
  entries.forEach(([date,count],i) => {
    const week = Math.floor(i/7);
    const dow = i%7;
    const x = 28 + week*(cellSize+cellGap);
    const y = dow*(cellSize+cellGap);
    const intensity = count===0?0:Math.ceil((count/maxCount)*4);
    const colors = ['#EDE9E1','#C9D8C4','#A5CC9E','#7BBF78','#5AAF56'];
    const title = `${date}: ${count} record${count!==1?'s':''}`;
    svg += `<rect class="heatmap-cell" x="${x}" y="${y}" width="${cellSize}" height="${cellSize}"
      fill="${colors[intensity]}" rx="2" data-count="${count}"><title>${title}</title></rect>`;
  });
  // Legend
  const lx = 28; const ly = h-5;
  svg += `<text x="${lx}" y="${ly}" font-size="10" fill="#999">Less</text>`;
  [0,1,2,3,4].forEach(i=>{
    svg += `<rect x="${lx+25+i*16}" y="${ly-10}" width="12" height="12" rx="2"
      fill="${['#EDE9E1','#C9D8C4','#A5CC9E','#7BBF78','#5AAF56'][i]}"/>`;
  });
  svg += `<text x="${lx+105}" y="${ly}" font-size="10" fill="#999">More</text>`;
  svg += `</svg>`;
  el.innerHTML = svg;
};
setTimeout(PRS.Heatmap.renderSVG, 50);