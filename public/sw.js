// SalesLog Service Worker v20261117  ── オフライン完全対応版（/api/ は素通し）
var CACHE = 'nobushop-20260703';

// アプリの動作に必須なリソース（インストール時に必ずキャッシュ）
// ★ ライブラリはCDNではなく /vendor/ にローカル同梱（CDN廃止・障害対策）
var PRECACHE_CORE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/js/app.js',
  '/js/google-config.js',
  '/vendor/react.production.min.js',
  '/vendor/react-dom.production.min.js',
  '/vendor/qrcode.min.js',
  '/vendor/tailwind.js',
  '/vendor/babel.min.js',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
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
      return Promise.all(corePromises);
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
    }).then(function() {
      // ★ 以前のSWが溜め込んだ /api/… の古い応答を消す（数MBの空きも戻る）
      return caches.open(CACHE).then(function(c) {
        return c.keys().then(function(reqs) {
          return Promise.all(reqs.filter(function(r) {
            try { return new URL(r.url).pathname.indexOf('/api/') === 0; } catch (_e) { return false; }
          }).map(function(r) { return c.delete(r); }));
        });
      }).catch(function() {});
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var url = e.request.url;

  // ★ クラウドとの通信（/api/…）はSWを通さない。必ず毎回サーバーから取る。
  //   以前は下の「その他：キャッシュ優先」に入ってしまい、一度受け取った在庫・売上・確認待ちの一覧を
  //   使い回していた（2026-11-17：登録済みの候補が「更新」後に戻って見えた／iPhoneに新しい登録が届かない原因）
  try { if (new URL(url).pathname.indexOf('/api/') === 0) return; } catch (_e) {}

  // Google OAuth / Anthropic / remove.bg API はSW通さない
  if (url.includes('accounts.google.com')) return;
  if (url.includes('googleapis.com')) return;
  if (url.includes('anthropic.com')) return;
  if (url.includes('api.remove.bg')) return;
  // Supabase はSW通さない（リアルタイム同期のため）
  if (url.includes('supabase.co')) return;
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
  // 事前コンパイル版はページ側が版ごとに取得・照合・Cache APIに保存するので、SWでは保持しない（容量が増えるため）
  if (path.startsWith('/js/app.compiled.js')) return;
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
