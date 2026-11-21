// InsuTap offline cache.
const CACHE = 'insutap-offline-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key =>
        key.startsWith('insutap-offline-') &&
        key !== CACHE
      ).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' ||
      url.origin !== self.location.origin ||
      !url.href.startsWith(self.registration.scope)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);

    try {
      const response = await fetch(request, {
        cache: 'no-cache'
      });

      if (response.ok) {
        await cache.put(request, response.clone())
          .catch(() => {});
      }

      return response;
    } catch {
      const cached = await cache.match(request);
      if (cached) return cached;

      if (request.mode === 'navigate') {
        const page = await cache.match('./index.html');
        if (page) return page;
      }

      return new Response('Offline', { status: 503 });
    }
  })());
});
