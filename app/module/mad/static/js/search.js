/* ════════════════════════════════════════════════════════════
   MAD Search — Filter & Search
   ════════════════════════════════════════════════════════════ */
MAD.Search = {
  applyFilter(query) {
    MAD.record.currentFilter = query || null;
    const container = document.getElementById('appContent');
    if (!container) return;
    const results = query ? MAD.Store.search(query) : MAD.Store.getAll();
    const listEl = container.querySelector('.record-list');
    if (!listEl) return;
    container.querySelector('.list-count').textContent = `${results.length} records${query ? ' matching "'+query+'"' : ''}`;
    listEl.innerHTML = results.length ? results.map((r,i)=>MAD.record.cardHTML(r,i)).join('')
      : '<div class="empty-state"><h3>No matching records</h3><p>Try different keywords or create a new record.</p></div>';
  }
};