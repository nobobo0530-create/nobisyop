// SalesLog Service Worker v20260417a  ── オフライン完全対応版
var CACHE = 'nobushop-20260417a';

// アプリの動作に必須なリソース（インストール時に必ずキャッシュ）
var PRECACHE_CORE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/js/app.js',
  '/js/google-config.js',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
];

// CDN リソース（取得失敗してもインストールは継続）
var PRECACHE_CDN = [
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdn.tailwindcss.com',
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      // コアファイルは必ずキャッシュ（失敗したら個別スキップ）
      var corePromises = PRECACHE_CORE.map(function(url) {
        return c.add(url).catch(function(err) {
          console.warn('[SW] core cache skip:', url, err.message);
        });
      });
      // CDNは取得試みるが失敗してもインストール継続
      var cdnPromises = PRECACHE_CDN.map(function(url) {
        return c.add(new Request(url, { mode: 'cors', credentials: 'omit' }))
          .catch(function(err) { console.warn('[SW] cdn cache skip:', url, err.message); });
      });
      return Promise.all([...corePromises, ...cdnPromises]);
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

  // Google OAuth / Anthropic / remove.bg API はSW通さない
  if (url.includes('accounts.google.com')) return;
  if (url.includes('googleapis.com')) return;
  if (url.includes('anthropic.com')) return;
  if (url.includes('api.remove.bg')) return;
  // Supabase はSW通さない（リアルタイム同期のため）
  if (url.includes('supabase.co')) return;
  // Babel は通さない（LocalStorageキャッシュで管理）
  if (url.includes('@babel/standalone')) return;
  // Google Sign-In
  if (url.includes('gsi/client')) return;

  // ── ドキュメント（ページ本体）: ネットワーク優先 → オフライン時はキャッシュ ──
  if (e.request.destination === 'document' || e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function(resp) {
        if (resp && resp.ok) {
          var clone = resp.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return resp;
      }).catch(function() {
        // オフライン時: キャッシュから返す（必ず / を返す）
        return caches.match(e.request)
          .then(function(cached) { return cached; })
          .then(function(r) { return r || caches.match('/'); })
          .then(function(r) { return r || caches.match('/index.html'); });
      })
    );
    return;
  }

  // ── index.html / app.js: ネットワーク優先（常に最新を取得） ──
  var path = new URL(url).pathname;
  if (path === '/' || path === '/index.html' || path.startsWith('/js/app.js') || path === '/sw.js') {
    e.respondWith(
      fetch(e.request).then(function(resp) {
        if (resp && resp.ok) {
          var clone = resp.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return resp;
      }).catch(function() {
        return caches.match(e.request).then(function(cached) {
          return cached || new Response('', { status: 503 });
        });
      })
    );
    return;
  }

  // ── その他（CDN・画像等）: キャッシュ優先（高速・オフライン対応） ──
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(resp) {
        if (resp && resp.ok) {
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
