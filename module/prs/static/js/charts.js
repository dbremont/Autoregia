/* ════════════════════════════════════════════════════════════
   PRS Charts — Simple SVG Bar & Donut Charts
   ════════════════════════════════════════════════════════════ */
PRS.Charts = {
  bar(containerId, data) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const entries = Object.entries(data).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const max = Math.max(...entries.map(e=>e[1]),1);
    const w = el.clientWidth || 280;
    const barH = 22; const gap = 6;
    const h = entries.length * (barH + gap) + 10;
    const colors = ['#8B1A1A','#4A7C59','#C17930','#4A6FA5','#B08D57','#6B5B95','#2D6A4F','#9A9589'];
    let svg = `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}">`;
    entries.forEach((e,i) => {
      const bw = (e[1]/max)*(w-80);
      svg += `<text x="0" y="${i*(barH+gap)+barH-3}" font-size="11" fill="#666" text-anchor="start">${e[0]}</text>`;
      svg += `<rect x="${w-75-bw}" y="${i*(barH+gap)}" width="${bw}" height="${barH}" rx="3" fill="${colors[i%colors.length]}" opacity="0.85"/>`;
      svg += `<text x="${w-5}" y="${i*(barH+gap)+barH-3}" font-size="11" fill="#666" text-anchor="end">${e[1]}</text>`;
    });
    svg += `</svg>`;
    el.innerHTML = svg;
  },
  donut(containerId, data) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const entries = Object.entries(data).filter(e=>e[1]>0);
    const total = entries.reduce((s,e)=>s+e[1],0)||1;
    const size = 140; const cx=size/2, cy=size/2, r=50, ir=30;
    const colors = {'Active':'#2D6A4F','Draft':'#999','Pending':'#C17930','Blocked':'#B33A3A',
      'Completed':'#4A6FA5','Archived':'#888','Scheduled':'#4A6FA5','Cancelled':'#B33A3A'};
    let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
    let startAngle = -Math.PI/2;
    entries.forEach(e => {
      const slice = (e[1]/total)*2*Math.PI;
      const x1 = cx + r*Math.cos(startAngle), y1 = cy + r*Math.sin(startAngle);
      const x2 = cx + r*Math.cos(startAngle+slice), y2 = cy + r*Math.sin(startAngle+slice);
      const ix1 = cx + ir*Math.cos(startAngle), iy1 = cy + ir*Math.sin(startAngle);
      const ix2 = cx + ir*Math.cos(startAngle+slice), iy2 = cy + ir*Math.sin(startAngle+slice);
      const large = slice > Math.PI ? 1 : 0;
      const color = colors[e[0]]||'#888';
      svg += `<path d="M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${ix2},${iy2} A${ir},${ir} 0 ${large},0 ${ix1},${iy1} Z" fill="${color}" opacity="0.85"/>`;
      // Label at midpoint
      const mid = startAngle+slice/2;
      const lx = cx+(r+12)*Math.cos(mid), ly = cy+(r+12)*Math.sin(mid);
      if (e[1]/total>0.06) {
        svg += `<text x="${lx}" y="${ly}" font-size="9" fill="#666" text-anchor="middle">${e[0]} (${e[1]})</text>`;
      }
      startAngle += slice;
    });
    svg += `<text x="${cx}" y="${cy}" font-size="14" fill="#333" text-anchor="middle" dominant-baseline="middle">${total}</text>`;
    svg += `</svg>`;
    el.innerHTML = svg;
  }
};