/* GIS Search — header search application (delegates to the Index home view) */
PT.Search = {
  apply(q) {
    if (PT.currentView !== 'index') PT.navigate('index');
    setTimeout(function () { PT.HomeIndex.setQuery(q); }, 50);
  },
  clear() {
    if (PT.currentView === 'index') PT.HomeIndex.setQuery('');
  },
};
