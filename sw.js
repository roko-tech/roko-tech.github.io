---
---
// Service worker — shell precache + smart runtime cache
var VERSION = 'v2-{{ site.time | date: "%s" }}';
var SHELL_CACHE = 'shell-' + VERSION;
var RUNTIME_CACHE = 'runtime-' + VERSION;

var SHELL = [
  '{{ "/" | relative_url }}',
  '{{ "/assets/icon-192.png" | relative_url }}',
  '{{ "/manifest.webmanifest" | relative_url }}'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SHELL_CACHE).then(function (c) { return c.addAll(SHELL); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL_CACHE && k !== RUNTIME_CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

var RUNTIME_MAX = 60; // cap runtime cache entries to avoid unbounded growth

function cachePut(req, res) {
  caches.open(RUNTIME_CACHE).then(function (c) {
    c.put(req, res).then(function () { trimCache(c, RUNTIME_MAX); });
  });
}
function trimCache(cache, max) {
  cache.keys().then(function (keys) {
    var overflow = keys.length - max;
    if (overflow <= 0) return;
    // keys() yields oldest-first; evict from the front
    keys.slice(0, overflow).forEach(function (k) { cache.delete(k); });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // Never intercept cross-origin (GitHub API, Giscus, Google Fonts, CDN, etc.)
  if (url.origin !== location.origin) return;
  if (url.pathname === '/sw.js') return;
  // Editor needs fresh state each visit
  if (url.pathname === '/editor.html') return;

  var accept = req.headers.get('accept') || '';
  var isHtml = accept.indexOf('text/html') !== -1;
  // CSS/JS should also be network-first so new deploys take effect immediately
  var isCode = /\.(css|js)(\?|$)/.test(url.pathname + url.search);

  if (isHtml || isCode) {
    e.respondWith(
      fetch(req).then(function (res) {
        // Only cache successful responses — never persist a 404/5xx error body
        if (res.ok) cachePut(req, res.clone());
        return res;
      }).catch(function () {
        return caches.match(req).then(function (r) {
          // Offline + never-cached: fall back to the precached shell for
          // navigations; for CSS/JS let it fail rather than serve HTML.
          if (r) return r;
          return isHtml ? caches.match(SHELL[0]) : undefined;
        });
      })
    );
    return;
  }

  // Cache-first for images, fonts, other immutable assets
  e.respondWith(
    caches.match(req).then(function (cached) {
      return cached || fetch(req).then(function (res) {
        if (res.ok) cachePut(req, res.clone());
        return res;
      });
    })
  );
});
