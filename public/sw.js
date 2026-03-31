// v9: hooks violation fix（useRef/useEffect を IIFE外へ移動）
const CACHE_NAME = 'nobushop-v9';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// キャッシュしないURLのパターン（外部API等）
const NO_CACHE_PATTERNS = [
  '/api/',           // Vercel Serverless Functions
  'supabase.co',     // Supabase API
  'anthropic.com',   // Claude API
  'unpkg.com',       // React CDN
  'jsdelivr.net',    // Supabase JS CDN
  'cdn.tailwindcss', // Tailwind CDN
  'cdnjs.cloudflare',// QRCode CDN
];

// ネットワークファーストにするURLパターン（常に最新版を優先）
const NETWORK_FIRST_PATTERNS = [
  '/index.html',
  '/js/app.js',
  '/?',  // クエリ付きindex.html
];

const shouldSkipCache = (url) =>
  NO_CACHE_PATTERNS.some(pattern => url.includes(pattern));

const shouldNetworkFirst = (url) =>
  NETWORK_FIRST_PATTERNS.some(pattern => url.includes(pattern));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(STATIC_ASSETS).catch(err => console.warn('Cache failed:', err))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[SW] 古いキャッシュを削除:', k);
        return caches.delete(k);
      }))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 外部API等はキャッシュせずそのままネットワークへ
  if (shouldSkipCache(url)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // index.html / app.js はネットワークファースト（常に最新版を取得）
  if (shouldNetworkFirst(url)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok && event.request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // ネットワーク失敗時はキャッシュにフォールバック
          return caches.match(event.request).then(cached => {
            if (cached) return cached;
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // その他（アイコン等）はキャッシュファースト
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      if (event.request.destination === 'document') {
        return caches.match('/index.html');
      }
    })
  );
});
