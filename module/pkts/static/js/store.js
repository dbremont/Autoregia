/* ════════════════════════════════════════════════════════════
   PKTS Store — Data Layer + Analytical computations
   Loads KeystrokeEvent[] (conforming to schema.json) from the API
   and derives every epistemic artifact from the raw telemetry.
   ════════════════════════════════════════════════════════════ */
window.PKTS = window.PKTS || {};
PKTS.Store = (() => {
  const KEY = 'pkts_keystrokes';
  let events = [];
  let sessions = [];

  async function load() {
    const stored = localStorage.getItem(KEY);
    if (stored) { try { const d = JSON.parse(stored); events = d.events||[]; sessions = d.sessions||[]; } catch {} }
    if (!events.length) await fetchFromAPI();
    return events;
  }
  async function fetchFromAPI() {
    try {
      const res = await fetch('/pkts/api/keystrokes');
      if (res.ok) { const d = await res.json(); events = d.events||d; sessions = d.sessions||[]; saveLocal(); }
    } catch(e) { console.warn('API unavailable, using local/embedded data'); }
  }
  function saveLocal() { localStorage.setItem(KEY, JSON.stringify({sessions, events})); }

  const getEvents = () => [...events];
  const getSessions = () => [...sessions];
  const S = {
    mean: a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0,
    stddev: a=>{ if(a.length<2)return 0; const m=S.mean(a); return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/a.length); },
    cv: a=>{ const m=S.mean(a); return m? S.stddev(a)/m : 0; },
  };
  function norm(k){ if(!k||k.length!==1) return null; return k.toLowerCase(); }
  function bySession() {
    const map = {};
    events.forEach(e => { (map[e.session_id] = map[e.session_id]||[]).push(e); });
    return map;
  }

  // ── Overview metric bundle ──
  function overview() {
    const dwells = events.map(e=>e.timing.hold_time_ms).filter(v=>v!=null);
    const flights = events.map(e=>e.timing.flight_time_ms).filter(v=>v!=null);
    const cv = S.cv(dwells);
    const consistencyPct = Math.max(0, Math.min(100, (1 - cv) * 100));
    const consistencyIndex = consistencyPct/100;
    const fatigueThreshold = S.mean(dwells) + 1.5*S.stddev(dwells);
    const fatigueEvents = events.filter(e=>e.timing.hold_time_ms>fatigueThreshold).length;
    const sm = bySession();
    const sessionCount = Object.keys(sm).length;
    const totalMs = Object.values(sm).reduce((acc,arr)=>{
      const mx = Math.max(...arr.map(e=>e.timing.session_elapsed_ms||0));
      const mn = Math.min(...arr.map(e=>e.timing.session_elapsed_ms||0));
      return acc + (mx-mn);
    },0);
    const wpmEvents = events.map(e=>e.timing.typing_speed_wpm).filter(v=>v!=null);
    const avgWpm = S.mean(wpmEvents);
    const throughput = totalMs>0 ? (events.length / (totalMs/60000)) : 0;
    return {
      totalKeystrokes: events.length, sessionCount,
      avgWpm: +avgWpm.toFixed(1), consistencyPct: +consistencyPct.toFixed(1),
      consistencyIndex: +consistencyIndex.toFixed(2),
      fatigueEventCount: fatigueEvents, fatigueThreshold: +fatigueThreshold.toFixed(1),
      throughputKeysPerMin: +throughput.toFixed(1), totalActiveMs: totalMs,
      dwell: { mean: +S.mean(dwells).toFixed(1), stddev: +S.stddev(dwells).toFixed(1) },
      flight: { mean: +S.mean(flights).toFixed(1), stddev: +S.stddev(flights).toFixed(1) },
    };
  }

  function behavioralStates() {
    let focus=0,casual=0,tired=0;
    const meanDwell = S.mean(events.map(e=>e.timing.hold_time_ms));
    const sd = S.stddev(events.map(e=>e.timing.hold_time_ms));
    events.forEach(e=>{
      const d = e.timing.hold_time_ms; const w = e.timing.typing_speed_wpm||60;
      if (d > meanDwell + sd || w < 35) tired++;
      else if (d < meanDwell - sd*0.5 && w > 70) focus++;
      else casual++;
    });
    return [{name:'Focus',value:focus},{name:'Casual',value:casual},{name:'Tired',value:tired}];
  }

  function crossSessionTrend() {
    const sm = bySession();
    const rows = Object.keys(sm).sort().map(sid=>{
      const arr = sm[sid];
      return { sid, wpm:+S.mean(arr.map(e=>e.timing.typing_speed_wpm)).toFixed(1),
                     dwell:+S.mean(arr.map(e=>e.timing.hold_time_ms)).toFixed(1) };
    });
    return rows.map((r,i)=>({...r, dWpm: i? +(r.wpm - rows[i-1].wpm).toFixed(1):0,
                                   dDwell: i? +(r.dwell - rows[i-1].dwell).toFixed(1):0 }));
  }

  function timeSeries() {
    const sm = bySession();
    return Object.keys(sm).sort().slice(0,6).map(sid=>{
      const arr = sm[sid].slice().sort((a,b)=>(a.timing.session_elapsed_ms||0)-(b.timing.session_elapsed_ms||0));
      const n = Math.min(40, arr.length);
      const maxEl = Math.max(...arr.map(e=>e.timing.session_elapsed_ms||1));
      const buckets = Array.from({length:n},()=>({count:0,wpm:0}));
      arr.forEach(e=>{ const idx=Math.min(n-1, Math.floor((e.timing.session_elapsed_ms||0)/maxEl*n)); buckets[idx].count++; buckets[idx].wpm += (e.timing.typing_speed_wpm||0); });
      const series = buckets.map((b,i)=>({ x:+(i*maxEl/n/1000).toFixed(1), y:b.count, wpm:b.count? +(b.wpm/b.count).toFixed(1):0 }));
      const deriv = series.map((p,i)=> i? ({x:p.x, y:+(p.y - series[i-1].y).toFixed(1)}) : ({x:p.x,y:0}));
      return { sid, series, deriv };
    });
  }

  // ── Behavioral Signature ──
  function distribution(values, bins=24) {
    const vals = values.filter(v=>v!=null);
    if(!vals.length) return [];
    const min=Math.min(...vals), max=Math.max(...vals);
    const step=(max-min)/bins||1;
    const counts=Array(bins).fill(0);
    vals.forEach(v=>{ counts[Math.min(bins-1, Math.floor((v-min)/step))]++; });
    return counts.map((c,i)=>({ bin: +(min+i*step).toFixed(0), count:c }));
  }
  const dwellDist = () => distribution(events.map(e=>e.timing.hold_time_ms), 22);
  const flightDist = () => distribution(events.map(e=>e.timing.flight_time_ms), 22);

  function handRatio() {
    let alt=0, same=0; let prevHand=null;
    events.forEach(e=>{
      const hand = e.metadata?.hand || (e.event.key && /[qwertasdfgzxcvb12345]/.test(e.event.key.toLowerCase())?'L':'R');
      if (prevHand){ if(hand===prevHand) same++; else alt++; }
      prevHand=hand;
    });
    return { alt, same, ratio: (alt+same)? +(alt/(alt+same)).toFixed(2):0 };
  }

  function fingerUtilization() {
    const counts = {};
    events.forEach(e=>{ const f=e.metadata?.finger||'R-index'; counts[f]=(counts[f]||0)+1; });
    const total = Object.values(counts).reduce((s,x)=>s+x,0)||1;
    return Object.entries(counts).map(([k,v])=>({finger:k, count:v, pct:+(v/total*100).toFixed(1)}))
      .sort((a,b)=>b.count-a.count);
  }

  function keyboardHeatmap() {
    const counts = {};
    events.forEach(e=>{ const k=e.event.key; if(k && k.length===1) counts[k]=(counts[k]||0)+1; });
    return counts;
  }

  function correctionTopology() {
    let backspaces=0, runs=[], runLen=0;
    events.forEach(e=>{ if(e.event.key_code==='Backspace'){ backspaces++; runLen++; } else { if(runLen) runs.push(runLen); runLen=0; } });
    if(runLen) runs.push(runLen);
    const depthDist = {}; runs.forEach(r=>{ depthDist[r]=(depthDist[r]||0)+1; });
    const produced = events.filter(e=>e.event.key && e.event.key.length===1 && e.event.key!==' ').length;
    return { backspaces, correctionRuns: runs.length, ratio: produced? +(backspaces/produced).toFixed(2):0,
      depthDist: Object.entries(depthDist).map(([d,c])=>({depth:+d,count:c})).sort((a,b)=>a.depth-b.depth) };
  }

  function modifierStrain() {
    const mods={}; events.forEach(e=>{ (e.event.modifiers||[]).forEach(m=>mods[m]=(mods[m]||0)+1); });
    return Object.entries(mods).map(([k,v])=>({mod:k,count:v})).sort((a,b)=>b.count-a.count);
  }

  // ── Temporal Dynamics ──
  function transitionMatrix(topN=12) {
    const keyCount={};
    for(let i=0;i<events.length-1;i++){ const a=norm(events[i].event.key), b=norm(events[i+1].event.key);
      if(!a||!b) continue; keyCount[a]=(keyCount[a]||0)+1; keyCount[b]=(keyCount[b]||0)+1; }
    const keys=Object.entries(keyCount).sort((x,y)=>y[1]-x[1]).slice(0,topN).map(e=>e[0]);
    const trans={}; keys.forEach(a=>{ trans[a]={}; keys.forEach(b=>trans[a][b]=0); });
    for(let i=0;i<events.length-1;i++){ const a=norm(events[i].event.key), b=norm(events[i+1].event.key);
      if(trans[a]&&a in trans&&b in trans[a]) trans[a][b]++; }
    keys.forEach(a=>{ const s=keys.reduce((acc,b)=>acc+trans[a][b],0)||1; keys.forEach(b=>trans[a][b]=+(trans[a][b]/s).toFixed(3)); });
    return { keys, matrix:trans };
  }

  function digraphMatrix(topN=10) {
    const pairs={};
    for(let i=0;i<events.length-1;i++){ const a=norm(events[i].event.key), b=norm(events[i+1].event.key);
      const f=events[i+1].timing.digraph_latency_ms;
      if(a&&b&&f!=null){ const key=a+b; (pairs[key]=pairs[key]||[]).push(f); } }
    const top=Object.entries(pairs).sort((x,y)=>y[1].length-x[1].length).slice(0,topN).map(e=>e[0]);
    const rows=top, cols=[...new Set(top.map(p=>p[1]))];
    const cell={}; let all=[];
    top.forEach(p=>{ const arr=pairs[p]; cell[p]={mean:+S.mean(arr).toFixed(1), sd:+S.stddev(arr).toFixed(1), n:arr.length}; all.push(S.mean(arr)); });
    return { rows, cols, cell, max: Math.max(...all,1), min: Math.min(...all,0) };
  }

  function pauses(threshold=350) {
    const out=[]; for(let i=1;i<events.length;i++){ const f=events[i].timing.flight_time_ms;
      if(f!=null&&f>threshold) out.push({idx:i, ms:+f.toFixed(0), sid:events[i].session_id}); }
    return out.sort((a,b)=>b.ms-a.ms);
  }

  function entropy() {
    const dist=dwellDist(); const total=dist.reduce((s,d)=>s+d.count,0)||1;
    let h=0; dist.forEach(d=>{ if(d.count){ const p=d.count/total; h-=p*Math.log2(p);} });
    return +h.toFixed(2);
  }

  function spectrum() {
    const series = events.slice(0,256).map(e=>e.timing.hold_time_ms||0);
    const N=series.length; if(N<8) return [];
    const out=[]; const half=Math.min(N/2, 48);
    for(let k=0;k<half;k++){ let re=0,im=0;
      for(let t=0;t<N;t++){ const ang=-2*Math.PI*k*t/N; re+=series[t]*Math.cos(ang); im+=series[t]*Math.sin(ang); }
      out.push(+Math.sqrt(re*re+im*im).toFixed(1)); }
    return out;
  }

  // ── Composition Process ──
  function bursts() {
    const out=[]; let cur=[]; let prev=null;
    events.forEach(e=>{ const f=e.timing.flight_time_ms||0;
      if(prev!==null && f>350 && cur.length){ out.push(cur); cur=[]; }
      cur.push(e); prev=e; });
    if(cur.length) out.push(cur);
    const durations=out.map(b=>{ const mx=Math.max(...b.map(e=>e.timing.session_elapsed_ms||0));
      const mn=Math.min(...b.map(e=>e.timing.session_elapsed_ms||0)); return mx-mn; });
    const inter=[]; for(let i=1;i<out.length;i++){ inter.push((out[i][0]?.timing.flight_time_ms)||0); }
    return { count:out.length, lengths:out.map(b=>b.length), durations,
      avgLen:+S.mean(out.map(b=>b.length)).toFixed(1), avgDur:+S.mean(durations).toFixed(0),
      interBurst:inter.filter(v=>v>0) };
  }

  function wordTiming() {
    const words=[]; let cur=[];
    events.forEach(e=>{ const k=e.event.key;
      if(k==='space'||k==='enter'){ if(cur.length){ const arr=cur;
        const tot=arr.reduce((s,x)=>s+(x.timing.hold_time_ms||0)+(x.timing.flight_time_ms||0),0);
        const post=cur[cur.length-1].timing.flight_time_ms||0;
        words.push({chars:arr.length, time:+tot.toFixed(0), post:+post.toFixed(0)}); cur=[]; } }
      else cur.push(e); });
    return words.slice(0,40);
  }

  // ── Cognitive State ──
  function cognitiveLoad() {
    const dwellCv=S.cv(events.map(e=>e.timing.hold_time_ms));
    const corr=correctionTopology();
    const pauseRatio = pauses().length / Math.max(1,events.length);
    const load = Math.min(100, (dwellCv*40 + Math.min(corr.ratio,1)*35 + pauseRatio*250));
    return +load.toFixed(0);
  }
  function pauseToKeystrokeRatio() {
    const p=pauses().reduce((s,x)=>s+x.ms,0);
    const k=events.reduce((s,e)=>s+(e.timing.hold_time_ms||0),0);
    return k? +(p/k).toFixed(2):0;
  }
  function fatigueDynamics() {
    const sm=bySession();
    return Object.keys(sm).sort().map(sid=>{ const arr=sm[sid];
      return { sid, dwell:+S.mean(arr.map(e=>e.timing.hold_time_ms)).toFixed(1),
               corr:arr.filter(e=>e.event.key_code==='Backspace').length }; });
  }
  function circadian() {
    const hours=Array(24).fill(0);
    const meanDwell=S.mean(events.map(e=>e.timing.hold_time_ms));
    events.forEach(e=>{ if(e.timing.hold_time_ms>meanDwell*1.3){
      const h=new Date(e.timestamp_utc).getUTCHours(); hours[h]++; } });
    return hours.map((c,h)=>({hour:h,count:c}));
  }
  function flowTrace() {
    const arr=events.slice().sort((a,b)=>(a.timing.session_elapsed_ms||0)-(b.timing.session_elapsed_ms||0));
    const win=25; const out=[];
    for(let i=win;i<arr.length;i+=win){
      const w=arr.slice(i-win,i); const dw=w.map(e=>e.timing.hold_time_ms); const cv=S.cv(dw);
      const wpm=S.mean(w.map(e=>e.timing.typing_speed_wpm));
      const p=Math.max(0,Math.min(1, (wpm/100)*(1-Math.min(cv,1))));
      out.push({x:i, p:+p.toFixed(2)});
    }
    return out;
  }

  // ── Workflow & Expertise ──
  function taskArchetypes() {
    const c={}; events.forEach(e=>{ const t=e.context?.task_type||'other'; c[t]=(c[t]||0)+1; });
    return Object.entries(c).map(([k,v])=>({name:k,value:v}));
  }
  function workflowStates() {
    let composing=0,planning=0,revising=0,searching=0,idle=0;
    events.forEach(e=>{ const k=e.event.key; const f=e.timing.flight_time_ms||0;
      if(k==='Backspace'||k==='Delete') revising++;
      else if(f>600) planning++;
      else if(e.context?.application_name==='Firefox') searching++;
      else if(k==='space') composing++;
      else idle++;
    });
    return [{name:'Composing',value:composing},{name:'Planning',value:planning},
            {name:'Revising',value:revising},{name:'Searching',value:searching},{name:'Idle',value:idle}];
  }
  function workflowMatrix() {
    const states=['Composing','Planning','Revising','Searching','Idle'];
    const m={}; states.forEach(a=>{m[a]={};states.forEach(b=>m[a][b]=0);});
    const classify=(e)=>{ const k=e.event.key; const f=e.timing.flight_time_ms||0;
      if(k==='Backspace')return 'Revising'; if(f>600)return 'Planning';
      if(e.context?.application_name==='Firefox')return 'Searching'; if(k==='space')return 'Composing'; return 'Idle'; };
    for(let i=1;i<events.length;i++){ const a=classify(events[i-1]),b=classify(events[i]); m[a][b]++; }
    states.forEach(a=>{const s=states.reduce((acc,b)=>acc+m[a][b],0)||1;states.forEach(b=>m[a][b]=+(m[a][b]/s).toFixed(2));});
    return {states,m};
  }

  return { load, getEvents, getSessions, overview, behavioralStates, crossSessionTrend,
    timeSeries, dwellDist, flightDist, handRatio, fingerUtilization, keyboardHeatmap,
    correctionTopology, modifierStrain, transitionMatrix, digraphMatrix, pauses, entropy,
    spectrum, bursts, wordTiming, cognitiveLoad, pauseToKeystrokeRatio, fatigueDynamics,
    circadian, flowTrace, taskArchetypes, workflowStates, workflowMatrix };
})();
