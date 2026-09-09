/* ════════════════════════════════════════════════════════════
   PEOS Store — data layer over /api/*.
   Loads analytics + observations + lexicon + topics, owns the
   click→filter state bus, read/unread (localStorage), client-side
   term-frequency, and per-item tone scoring (delegates to PEOS.Vader).
   ════════════════════════════════════════════════════════════ */
window.PEOS = window.PEOS || {};
PEOS.Store = (() => {
  const API = '.'; // mounted under /peos/, so relative "." resolves to /peos/

  let _analytics = null, _obs = [], _topics = [], _clustersMeta = {};
  let _stopwords = new Set();
  // filter state — the click→filter bus reads and writes this
  const state = { source:null, topic:null, cluster:null, term:null, sinceMs:null, q:'', hideRead:false };
  // window presets (hours); 0 = All
  const WINDOWS = [ {h:24,label:'24h'}, {h:168,label:'7d'}, {h:720,label:'30d'}, {h:0,label:'All'} ];
  let _windowH = 168;

  // read/unread keyed by stable OBS- id (sha1 of source:native_id)
  const READ_KEY = 'peos.read';
  let _read = new Set((JSON.parse(localStorage.getItem(READ_KEY) || '[]')));
  function _persistRead(){ localStorage.setItem(READ_KEY, JSON.stringify([..._read])); }

  async function _j(url, params){
    const r = await fetch(url + (params?('?'+new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([_,v])=>v!=null&&v!=='')))):''));
    if(!r.ok) throw new Error(r.status+' '+url);
    return r.json();
  }

  async function load(){
    await loadLexicon();
    await Promise.all([loadAnalytics(), loadObservations(), loadTopics()]);
  }
  async function loadLexicon(){
    const L = await _j(`${API}/api/lexicon`);
    _stopwords = new Set(L.stopwords || []);
    if (window.PEOS && PEOS.Vader) PEOS.Vader.setLexicon(L.vader || {});
  }
  async function loadAnalytics(){
    const params = {};
    if (state.topic) params.topic = state.topic;
    if (_windowH) params.hours = _windowH;
    _analytics = await _j(`${API}/api/analytics`, params);
    return _analytics;
  }
  async function loadObservations(){
    const params = { limit: 500 };
    if (state.source) params.source = state.source;
    if (state.topic) params.topic = state.topic;
    if (state.cluster) params.cluster = state.cluster;
    const since = state.sinceMs != null ? state.sinceMs : (_windowH ? (Date.now()-_windowH*3600000) : null);
    if (since) params.since_ms = since;
    if (state.q) params.q = state.q;
    _obs = await _j(`${API}/api/observations`, params);
    return _obs;
  }
  async function loadTopics(){ _topics = await _j(`${API}/api/topics`); return _topics; }

  // ── filter bus ──
  function applyFilter(patch){
    Object.assign(state, patch);
    return loadObservations();
  }
  function resetFilter(){ Object.assign(state, {source:null,topic:null,cluster:null,term:null,sinceMs:null,q:''}); }
  function getState(){ return state; }
  function filterSummary(){
    const parts = [];
    if (state.source) parts.push(state.source);
    if (state.topic) parts.push('#'+state.topic);
    if (state.cluster) parts.push('cluster '+state.cluster);
    if (state.term) parts.push('“'+state.term+'”');
    if (state.q) parts.push('“'+state.q+'”');
    if (state.sinceMs) parts.push('since '+new Date(state.sinceMs).toISOString().slice(0,10));
    return parts.join(' · ');
  }

  // ── window presets ──
  function getWindow(){ return _windowH; }
  function setWindow(h){ _windowH = h; state.sinceMs = h ? (Date.now()-h*3600000) : null; }
  const WINDOWS_ = () => WINDOWS;

  // ── read/unread ──
  const isRead = (id) => _read.has(id);
  function markRead(id){ _read.add(id); _persistRead(); }
  function markAllRead(ids){ ids.forEach(id=>_read.add(id)); _persistRead(); }

  // ── client-side term frequency over a set of items (live with filters) ──
  function termFreq(items, n=80){
    const c = {};
    (items||[]).forEach(o=>{
      const txt = ((o.title||'')+' '+(o.body||'')).toLowerCase().replace(/https?:\/\/\S+/g,' ');
      const toks = txt.match(/[^\W_]+/g) || [];
      const seen = new Set();
      toks.forEach(t=>{ if(t.length>=3 && !_stopwords.has(t) && !seen.has(t)){ c[t]=(c[t]||0)+1; seen.add(t);} });
    });
    return Object.entries(c).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,n);
  }

  // ── tone tint per item (coarse VADER) ──
  function toneOf(o){
    if (!window.PEOS || !PEOS.Vader) return 0;
    return PEOS.Vader.score((o.title||'')+' '+(o.body||''));
  }
  function toneClass(v){ return v>0.15?'tone-pos':(v<-0.15?'tone-neg':'tone-neu'); }

  // ── escape + highlight matched terms ──
  function esc(s){ if(s==null) return ''; const d=document.createElement('div'); d.textContent=String(s); return d.innerHTML; }
  function highlight(text){
    let h = esc(text);
    const terms = [state.term, state.q].filter(Boolean);
    terms.forEach(t=>{
      try { const re = new RegExp('('+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'); h = h.replace(re,'<mark>$1</mark>'); } catch{}
    });
    return h;
  }

  // ── thread dedup: group HN comments by story, others by title-prefix ──
  function dedupThreads(items){
    const groups = new Map();
    items.forEach(o=>{
      let key;
      if (o.source==='hackernews' && o.raw && (o.raw.story_id||o.raw.parent_id)) key = 'hn:'+(o.raw.story_id||o.raw.parent_id);
      else key = (o.source||'')+':'+(o.title||'').toLowerCase().slice(0,40);
      if(!groups.has(key)) groups.set(key, []);
      groups.get(key).push(o);
    });
    const out = [];
    for(const arr of groups.values()){
      arr.sort((a,b)=>(b.score||0)-(a.score||0));
      out.push(arr[0]);
      if(arr.length>1) out[out.length-1]._more = arr.length-1;
    }
    return out;
  }

  // ── accessors ──
  const analytics_ = () => _analytics;
  const observations = () => _obs;
  const topics = () => _topics;
  const clustersMeta = () => _clustersMeta;
  async function loadClustersMeta(){ _clustersMeta = (await _j(`${API}/api/clusters`)).meta||{}; return _clustersMeta; }
  async function recomputeClusters(k){ return _j(`${API}/api/cluster`, {method:'POST'}); }

  return {
    load, loadLexicon, loadAnalytics, loadObservations, loadTopics,
    applyFilter, resetFilter, getState, filterSummary,
    getWindow, setWindow, WINDOWS: WINDOWS_,
    isRead, markRead, markAllRead,
    termFreq, toneOf, toneClass, esc, highlight, dedupThreads,
    analytics: analytics_, observations, topics, clustersMeta,
    loadClustersMeta, recomputeClusters,
    _setObs(o){ _obs=o; } // for tests
  };
})();
