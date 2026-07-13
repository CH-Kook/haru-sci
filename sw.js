/* 하루사이 서비스워커 — 앱 셸 프리캐시 + 데이터 stale-while-revalidate.
   버전을 바꾸면(v1 -> v2) 이전 캐시가 자동 정리된다. */
const CACHE_VERSION = 'v1';
const SHELL_CACHE = `haru-sci-shell-${CACHE_VERSION}`;
const DATA_CACHE = `haru-sci-data-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/guide.html',
  '/favicon-32.png',
  '/favicon-16.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/fonts/LaundryGothic-Regular.woff',
  '/fonts/LaundryGothic-Bold.woff',
  '/fonts/NotoSerifKR-700.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // 데이터(JSON): stale-while-revalidate — 캐시 즉시 응답, 백그라운드로 최신화
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(
      caches.open(DATA_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const network = fetch(request)
            .then((res) => { if (res.ok) cache.put(request, res.clone()); return res; })
            .catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  // 앱 셸: 네트워크 우선, 실패 시 캐시. 내비게이션 요청은 실패 시 index.html로 폴백.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) caches.open(SHELL_CACHE).then((cache) => cache.put(request, res.clone()));
        return res;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || (request.mode === 'navigate' ? caches.match('/index.html') : undefined))
      )
  );
});
