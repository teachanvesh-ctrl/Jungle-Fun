/* Jungle Fun offline worker: keeps the game on the phone so it opens without internet.
   Change the version below whenever index.html is updated, so phones pick up the new copy. */
const C = 'jungle-fun-v5';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* the page: try the internet for 3 s (to get updates), otherwise use the saved copy */
function page(req) {
  const net = fetch(req).then(res => {
    if (res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put('./index.html', cp)); }
    return res;
  });
  const slow = new Promise(r => setTimeout(r, 3000)).then(() => caches.match('./index.html'));
  return Promise.race([net, slow]).then(r => r || net).catch(() => caches.match('./index.html'));
}
/* everything else: saved copy first, internet only if missing (fonts get saved on first use) */
function asset(req) {
  return caches.match(req, {ignoreSearch: true}).then(m => m || fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(C).then(c => c.put(req, cp)); }
    return res;
  }));
}
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) e.respondWith(r.mode === 'navigate' ? page(r) : asset(r));
  else if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) e.respondWith(asset(r));
});
