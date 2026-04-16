// SalesLog Service Worker v20260413o
var CACHE = 'nobushop-20260413o';

var PRECACHE = [
  '/manifest.json',
  '/js/app.js?v=20260413o',
  '/js/google-config.js?v=20260413d',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return Promise.allSettled(
        PRECACHE.map(function(url) {
          return c.add(new Request(url, { mode: 'cors', credentials: 'omit' }))
            .catch(function(err) { console.warn('[SW] skip:', url, err.message); });
        })
      );
    }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var url = e.request.url;
  if (url.includes('accounts.google.com')) return;
  if (url.includes('googleapis.com')) return;
  if (url.includes('anthropic.com')) return;
  if (url.includes('api.remove.bg')) return;
  if (url.includes('cdn.tailwindcss.com')) return;
  if (url.includes('@babel/standalone')) return;

  // ★ index.html（ドキュメント）はネットワーク優先 → 常に最新バージョンを取得
  // オフライン時のみキャッシュにフォールバック
  if (e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).then(function(resp) {
        if (resp && resp.ok) {
          var clone = resp.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return resp;
      }).catch(function() {
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('/');
        });
      })
    );
    return;
  }

  // ★ JS/画像等はキャッシュ優先（高速表示）
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(resp) {
        if (resp && resp.ok && resp.type !== 'opaque') {
          var clone = resp.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return resp;
      }).catch(function() {
        return new Response('', { status: 503 });
      });
    })
  );
});
