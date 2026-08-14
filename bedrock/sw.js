// Bump this on every deploy. The worker is cache-first, so a stale name means
// returning visitors keep the old files forever — which is exactly what
// happened between v1 and v8 when this was being patched after copying
// instead of at the source.
const CACHE = 'bedrock-v11';
const ASSETS = ['./', './index.html', './lessons.json', './starter.json', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', e => {
  // deliberately NOT skipWaiting here — the page shows an update banner and
  // the user decides when to swap, so a reload never lands mid-lesson
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

// the banner's Reload button sends this
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// cache-first: the whole app works offline once loaded
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
