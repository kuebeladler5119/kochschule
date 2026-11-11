/* Service Worker: macht die App offline nutzbar. Speichert nur App-Dateien und den öffentlichen Katalog –
   persönliche Daten liegen im localStorage und werden hier nie zwischengespeichert. */
const VERSION = '202611111412';
const CACHE = 'kochschule-' + VERSION;
const DATEIEN = ['./', 'index.html', 'app.css', 'app.js', 'data/katalog.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('kochschule-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Netzwerk zuerst (aktuelle Version), bei fehlender Verbindung aus dem Cache
  e.respondWith(fetch(e.request).then(r => { const kopie = r.clone(); caches.open(CACHE).then(c => c.put(e.request, kopie)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
