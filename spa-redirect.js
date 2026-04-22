(function () {
  var redirect = sessionStorage.getItem('__spa_redirect');
  if (!redirect) return;
  sessionStorage.removeItem('__spa_redirect');
  try {
    var url = new URL(redirect);
    if (url.pathname !== '/') {
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  } catch (_) {}
})();
