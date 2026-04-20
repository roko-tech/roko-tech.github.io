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
        var clone = res.clone();
        caches.open(RUNTIME_CACHE).then(function (c) { c.put(req, clone); });
        return res;
      }).catch(function () { return caches.match(req); })
    );
    return;
  }

  // Cache-first for images, fonts, other immutable assets
  e.respondWith(
    caches.match(req).then(function (cached) {
      return cached || fetch(req).then(function (res) {
        if (res.ok) {
          var clone = res.clone();
          caches.open(RUNTIME_CACHE).then(function (c) { c.put(req, clone); });
        }
        return res;
      });
    })
  );
});
