// Jest Fest service worker.
//
// IMPORTANT, and different from the other Arrosho apps: mahjong and the
// stopwatch are fully offline apps, so they cache-first everything. Jest Fest
// CANNOT be played offline -- gameplay needs the relay (spec Sec 1). So this
// worker exists for two narrower reasons:
//   1. installability (a real manifest + a fetch handler = an installable PWA)
//   2. the landing page still opens with no connection, and can honestly say
//      "you're offline" and still link out to the apps that DO work offline.
//
// Strategy is NETWORK-FIRST for everything, cache as fallback. Cache-first
// would be actively harmful here: js/config.js holds RELAY_URL, and a stale
// copy of it would point phones at a relay that no longer exists.
const VERSION = 'arrosho-jestfest-v1';
const SHELL = VERSION + '-shell';

// Must land or the app can't open at all.
const PRECACHE = [
  './',
  'index.html',
  'display.html',
  'controller.html',
  'manifest.webmanifest'
];

// Nice to have. addAll() rejects the whole install if any single entry 404s,
// so these are fetched individually and allowed to fail.
const PRECACHE_OPTIONAL = [
  'css/tokens.css', 'css/base.css', 'css/landing.css',
  'css/display.css', 'css/controller.css',
  'js/config.js', 'js/el.js', 'js/net.js', 'js/shell.js',
  'js/display.js', 'js/controller.js', 'js/qr.js',
  'games/kwiplash.js', 'games/fish-and-slips.js',
  'icons/icon-192.png', 'icons/icon-512.png',
  'icons/maskable-192.png', 'icons/maskable-512.png',
  'icons/apple-touch-icon.png', 'icons/favicon-32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await cache.addAll(PRECACHE);
    await Promise.all(PRECACHE_OPTIONAL.map((url) =>
      cache.add(url).catch(() => { /* optional: a 404 here must not fail install */ })
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only ever handle our own origin and our own folder. Never touch the relay.
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(new URL('./', self.location).pathname)) return;

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok) {
        const cache = await caches.open(SHELL);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      // Navigations fall back to the landing page so the app opens offline.
      if (req.mode === 'navigate') {
        const home = await caches.match('index.html');
        if (home) return home;
      }
      throw err;
    }
  })());
});
