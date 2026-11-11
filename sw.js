/* Service Worker: macht die App offline nutzbar. Speichert nur App-Dateien und den öffentlichen Katalog –
   persönliche Daten liegen im localStorage und werden hier nie zwischengespeichert.
   Update-Verfahren:
   - Die App startet immer aus dem Offline-Speicher dieser Version (schnell, offline, alle Dateien passen zusammen).
   - Eine neue Version wird im Hintergrund vollständig geladen und wartet dann. Aktiv wird sie erst,
     wenn die Seite „aktivieren“ schickt (Knopf „Jetzt aktualisieren“) oder wenn die App ganz geschlossen war. */
const VERSION = '202611111832';
const CACHE = 'kochschule-' + VERSION;
const DATEIEN = ['./', 'index.html', 'app.css', 'ernaehrung.js', 'rezepte.js', 'tracking.js', 'training.js', 'app.js', 'data/katalog.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
// Rezeptfotos (vom Build eingetragen, nur mit Lizenznachweis) – werden mit der Version offline gespeichert
const BILDER = ['bilder/rez-bibimbap-rinderhack.jpg', 'bilder/rez-chili-con-carne.jpg', 'bilder/rez-dal-rote-linsen.jpg', 'bilder/rez-honig-knoblauch-haehnchen.jpg', 'bilder/rez-miso-suppe.jpg', 'bilder/rez-overnight-oats.jpg', 'bilder/rez-oyakodon.jpg', 'bilder/rez-panna-cotta-agar.jpg', 'bilder/rez-rosmarinkartoffeln.jpg', 'bilder/rez-rotes-thai-curry.jpg', 'bilder/rez-seehecht-grenobloise.jpg', 'bilder/rez-shakshuka.jpg', 'bilder/rez-sommerrollen-garnelen.jpg', 'bilder/rez-tomaten-bruschetta.jpg', 'bilder/rez-tomaten-ruehrei.jpg', 'bilder/rez-tomatensauce-hazan.jpg', 'bilder/rez-tzatziki.jpg'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    for (const d of [...DATEIEN, ...BILDER]) {
      // ?v= umgeht Zwischenspeicher von Browser und CDN, damit wirklich diese Version geladen wird
      const r = await fetch(new Request(d + (d.includes('?') ? '&' : '?') + 'v=' + VERSION, { cache: 'reload' }));
      if (!r.ok) throw new Error(d + ': HTTP ' + r.status);
      await c.put(d, r);
    }
    // Nur übernehmen, wenn app.js wirklich zu dieser Version gehört (sonst beim nächsten Mal erneut versuchen)
    const app = await (await c.match('app.js')).text();
    if (!app.includes("APP_BUILD = '" + VERSION + "'")) { await caches.delete(CACHE); throw new Error('app.js gehört nicht zu Version ' + VERSION); }
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('kochschule-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('message', e => {
  const m = e.data || {};
  if (m.typ === 'aktivieren') self.skipWaiting();
  if (m.typ === 'version' && e.ports && e.ports[0]) {
    const port = e.ports[0];
    caches.open(CACHE).then(c => c.match('app.js')).then(r => r ? r.text() : '').then(t => {
      const v = t.match(/APP_VERSION = '([^']+)'/);
      port.postMessage({ build: VERSION, version: v ? v[1] : '' });
    }).catch(() => port.postMessage({ build: VERSION, version: '' }));
  }
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    // ignoreSearch: ?profil=test und ?v= zeigen auf dieselben Dateien
    const treffer = (await c.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? await c.match('./') : undefined);
    if (treffer) return treffer;
    try { return await fetch(req); } catch (err) { return (await c.match('index.html')) || Response.error(); }
  })());
});
