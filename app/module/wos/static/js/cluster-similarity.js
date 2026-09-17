/* ════════════════════════════════════════════════════════════
   WOS Topic Similarity Between Clusters — "Which topics are
   near-duplicates?" Cosine similarity of the per-cluster
   centroids stored at Recompute time, as a heatmap plus the
   closest pairs ranked.
   ════════════════════════════════════════════════════════════ */
window.WOS = window.WOS || {};
WOS.ClusterSimilarity = (() => {
  const v = WOS.view;

  function render(){
    return `
      ${v.header('Topic Similarity Between Clusters')}
      <p class="text-sm text-muted animate-in" style="max-width:var(--measure)"><strong>Which topics are near-duplicates?</strong> Cosine similarity of cluster centroids — 1.0 means two topics share direction and may deserve merging; near 0 means unrelated.</p>
      <div class="duo-grid animate-in">
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">centroid cosine</span><h3>Similarity matrix</h3></div></div>
          <div class="chart-box" id="chartSimilarity" style="height:400px"></div>
        </div>
        <div class="chart-card">
          <div class="chart-head"><div><span class="eyebrow">closest pairs</span><h3>Merge candidates</h3></div></div>
          <div id="simPairs" style="min-height:120px"></div>
        </div>
      </div>`;
  }

  function afterRender(){
    const host = document.getElementById('chartSimilarity');
    fetch('./api/clusters').then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); }).then(cd=>{
      const cents = cd.centroids||{};
      const assigns = cd.assignments||{};
      const cids = Object.keys(cents).sort((x,y)=>parseInt(x.slice(1))-parseInt(y.slice(1)));
      if(cids.length < 2){
        host.innerHTML = `<div class="empty-state"><h3>Not enough clusters yet</h3><p>Similarity needs at least two clusters — run Recompute on Profiles.</p></div>`;
        document.getElementById('simPairs').innerHTML = '';
        return;
      }
      const labelFor = {};
      Object.values(assigns).forEach(a=>{ labelFor[a.cluster_id] = a.label || a.cluster_id; });
      const cosine = (a,b)=>{
        let dot=0, na=0, nb=0;
        for(let i=0;i<a.length;i++){ dot+=a[i]*b[i]; na+=a[i]*a[i]; nb+=b[i]*b[i]; }
        return dot/(Math.sqrt(na)*Math.sqrt(nb)||1);
      };
      const M = cids.map(x=>cids.map(y=>+cosine(cents[x], cents[y]).toFixed(3)));
      const labels = cids.map(c=>labelFor[c]||c);
      const pairs = [];
      for(let i=0;i<cids.length;i++) for(let j=i+1;j<cids.length;j++)
        pairs.push({ a:labels[i], b:labels[j], s:M[i][j] });
      pairs.sort((x,y)=>y.s-x.s);
      document.getElementById('simPairs').innerHTML = pairs.slice(0,6).map(p=>
        `<div class="ov-link-row"><span class="ov-link-name">${WOS.esc(p.a)} ↔ ${WOS.esc(p.b)}</span><b>${p.s.toFixed(2)}</b></div>`).join('')
        || '<div class="empty-state">only one pair to compare</div>';
      if(!window.echarts) return;
      host.innerHTML = '';
      const ch = echarts.init(host, null, { renderer:'canvas' });
      ch.setOption({
        textStyle: { fontFamily:'Inter, sans-serif' },
        tooltip: { position:'top', formatter:(p)=>`${labels[p.data[0]]} ↔ ${labels[p.data[1]]}: ${p.data[2]}` },
        grid: { left: 150, right: 40, top: 16, bottom: 90 },
        xAxis: { type:'category', data: labels, axisLabel:{ rotate:35, fontFamily:'IBM Plex Mono', fontSize:9, color:'#8C877B' }, axisTick:{show:false} },
        yAxis: { type:'category', data: labels, axisLabel:{ fontFamily:'IBM Plex Mono', fontSize:9, color:'#8C877B' } },
        visualMap: { min:0, max:1, calculable:true, orient:'horizontal', left:'center', bottom:0,
          inRange:{ color:['#F6EFE1', '#7A1A2A'] }, textStyle:{ color:'#8C877B', fontSize:9 } },
        series: [{ type:'heatmap',
          data: M.flatMap((row,i)=>row.map((val,j)=>[j,i,val])),
          label:{ show:true, formatter:(p)=>p.data[2].toFixed(2), fontSize:9, color:'#44413B' },
          itemStyle:{ borderColor:'#FFFFFF', borderWidth:2, borderRadius:2 } }],
      });
    }).catch(()=>{
      host.innerHTML = '<div class="empty-state">could not reach the store</div>';
    });
  }
  return { render, afterRender };
})();
