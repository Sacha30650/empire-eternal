const CACHE = 'empire-eternal-v6.0.0';
const APP_SHELL = [
  './', './index.html', './styles.css', './game.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png',
  './assets/units/allies/maeve.png', './assets/units/allies/lyra.png',
  './assets/units/allies/orion.png', './assets/units/enemies/brute.png',
  './assets/units/enemies/raider.png', './assets/units/enemies/caster.png',
  './assets/environments/forest.webp', './assets/environments/citadel.webp', './assets/environments/ruins.webp', './assets/ui/skills/bulwark.png',
  './assets/ui/skills/volley.png', './assets/ui/skills/nova.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response && response.status === 200) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match('./index.html')))
  );
});
