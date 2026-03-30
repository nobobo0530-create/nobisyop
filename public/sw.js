// v3: /api/ ルートをキャッシュ対象から除外・キャッシュ名更新
const CACHE_NAME = 'nobushop-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // app.js はバージョンクエリ付きで個別キャッシュされるためここには含めない
];

// キャッシュしないURLのパターン
const NO_CACHE_PATTERNS = [
  '/api/',           // Vercel Serverless Functions（config など）
  'supabase.co',     // Supabase API
  'anthropic.com',   // Claude API
  'unpkg.com',       // React CDN
  'jsdelivr.net',    // Supabase JS CDN
  'cdn.tailwindcss', // Tailwind CDN
  'cdnjs.cloudflare',// QRCode CDN
];

const shouldSkipCache = (url) =>
  NO_CACHE_PATTERNS.some(pattern => url.includes(pattern));

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

  // キャッシュしないリクエストはそのままネットワークへ
  if (shouldSkipCache(url)) return;

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
