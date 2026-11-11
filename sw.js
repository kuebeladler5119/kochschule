/* Service Worker: macht die App offline nutzbar. Speichert nur App-Dateien und den öffentlichen Katalog –
   persönliche Daten liegen im localStorage und werden hier nie zwischengespeichert.
   Update-Verfahren:
   - Die App startet immer aus dem Offline-Speicher dieser Version (schnell, offline, alle Dateien passen zusammen).
   - Eine neue Version wird im Hintergrund vollständig geladen und wartet dann. Aktiv wird sie erst,
     wenn die Seite „aktivieren“ schickt (Knopf „Jetzt aktualisieren“) oder wenn die App ganz geschlossen war. */
const VERSION = '202611112041';
const CACHE = 'kochschule-' + VERSION;
const DATEIEN = ['./', 'index.html', 'app.css', 'ernaehrung.js', 'rezepte.js', 'tracking.js', 'training.js', 'app.js', 'data/katalog.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
// Rezeptfotos (vom Build eingetragen, nur mit Lizenznachweis). Sie werden NICHT alle vorab gespeichert, sondern beim Ansehen
// bzw. für ausgewählte Rezepte in einem eigenen Bild-Speicher, der Updates überdauert.
const BILD_CACHE = 'fitomat-bilder'; const BILD_MAX = 120;
const BILDER = ['bilder/rez-apfelkuchen-versunken.jpg', 'bilder/rez-bananenbrot.jpg', 'bilder/rez-bibimbap-rinderhack.jpg', 'bilder/rez-brathaehnchen.jpg', 'bilder/rez-caesar-salad.jpg', 'bilder/rez-chana-masala.jpg', 'bilder/rez-chili-con-carne.jpg', 'bilder/rez-choriatiki.jpg', 'bilder/rez-cilbir.jpg', 'bilder/rez-creme-brulee.jpg', 'bilder/rez-dakgalbi.jpg', 'bilder/rez-dal-rote-linsen.jpg', 'bilder/rez-ezme.jpg', 'bilder/rez-falafel-tahin.jpg', 'bilder/rez-focaccia.jpg', 'bilder/rez-gebratener-reis-ei.jpg', 'bilder/rez-gruenes-curry-tofu.jpg', 'bilder/rez-guacamole.jpg', 'bilder/rez-gyeran-jjim.jpg', 'bilder/rez-gyoza-haehnchen.jpg', 'bilder/rez-honig-knoblauch-haehnchen.jpg', 'bilder/rez-hummus.jpg', 'bilder/rez-imam-bayildi.jpg', 'bilder/rez-japchae-rind.jpg', 'bilder/rez-kaiserschmarren.jpg', 'bilder/rez-katsu-curry-haehnchen.jpg', 'bilder/rez-kimchi-bokkeumbap.jpg', 'bilder/rez-kuerbissuppe.jpg', 'bilder/rez-kung-pao-haehnchen.jpg', 'bilder/rez-larb-gai.jpg', 'bilder/rez-linsensalat-feta.jpg', 'bilder/rez-mango-sticky-rice.jpg', 'bilder/rez-mapo-tofu-rind.jpg', 'bilder/rez-menemen.jpg', 'bilder/rez-mercimek-corbasi.jpg', 'bilder/rez-mercimek-koeftesi.jpg', 'bilder/rez-minestrone.jpg', 'bilder/rez-miso-suppe.jpg', 'bilder/rez-naan-pfanne.jpg', 'bilder/rez-nasi-goreng-haehnchen.jpg', 'bilder/rez-oi-muchim.jpg', 'bilder/rez-onigiri-lachs.jpg', 'bilder/rez-overnight-oats.jpg', 'bilder/rez-oyakodon.jpg', 'bilder/rez-pai-huang-gua.jpg', 'bilder/rez-palak-paneer.jpg', 'bilder/rez-panna-cotta-agar.jpg', 'bilder/rez-pasta-al-tonno.jpg', 'bilder/rez-pasta-e-ceci.jpg', 'bilder/rez-pho-ga.jpg', 'bilder/rez-pizza-margherita.jpg', 'bilder/rez-pollo-cacciatora.jpg', 'bilder/rez-pommes-puree.jpg', 'bilder/rez-quark-pfannkuchen.jpg', 'bilder/rez-ratatouille.jpg', 'bilder/rez-ribeye.jpg', 'bilder/rez-risotto-funghi.jpg', 'bilder/rez-rosmarinkartoffeln.jpg', 'bilder/rez-rotes-thai-curry.jpg', 'bilder/rez-schwaebischer-kartoffelsalat.jpg', 'bilder/rez-seehecht-grenobloise.jpg', 'bilder/rez-shakshuka.jpg', 'bilder/rez-soba-salat.jpg', 'bilder/rez-sommerrollen-garnelen.jpg', 'bilder/rez-suetlac.jpg', 'bilder/rez-tabouleh.jpg', 'bilder/rez-tamagoyaki.jpg', 'bilder/rez-teriyaki-lachs.jpg', 'bilder/rez-tomaten-bruschetta.jpg', 'bilder/rez-tomaten-ruehrei.jpg', 'bilder/rez-tomatensauce-hazan.jpg', 'bilder/rez-tom-kha-gai.jpg', 'bilder/rez-tortilla-de-patatas.jpg', 'bilder/rez-tzatziki.jpg'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    for (const d of DATEIEN) {
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
    if (url.pathname.includes('/bilder/')) {   // Fotos: aus dem Bild-Speicher, sonst laden und ablegen
      const bc = await caches.open(BILD_CACHE); const t = await bc.match(req, { ignoreSearch: true }); if (t) return t;
      try { const r = await fetch(req); if (r.ok) { await bc.put(url.pathname, r.clone()); const ks = await bc.keys(); for (const k of ks.slice(0, Math.max(0, ks.length - BILD_MAX))) await bc.delete(k); } return r; } catch (err) { return Response.error(); }
    }
    const c = await caches.open(CACHE);
    // ignoreSearch: ?profil=test und ?v= zeigen auf dieselben Dateien
    const treffer = (await c.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? await c.match('./') : undefined);
    if (treffer) return treffer;
    try { return await fetch(req); } catch (err) { return (await c.match('index.html')) || Response.error(); }
  })());
});
