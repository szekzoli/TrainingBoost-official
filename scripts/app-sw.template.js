/* TrainingBoost ügyfél-app – service worker (csak a /app oldalakra).
 * A build a fájl elejére írja a verziót és az aktuális fájllistát, kézzel nem kell frissíteni.
 * - Az app oldalai: először a hálózatról, net nélkül a tárolt index.html-ből.
 * - A JS/CSS/betűk (hash-elt nevűek): a tárolóból, így net nélkül is megnyílik minden képernyő.
 * - A Supabase-hívásokat NEM tárolja (azokat az app maga kezeli a helyi másolattal).
 */
const VERSION = self.__TB_VERSION__;
const CACHE = 'tb-app-' + VERSION;
const ASSETS = self.__TB_ASSETS__;
const SHELL = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll([SHELL, ...ASSETS]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('tb-app-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/.netlify/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(SHELL, copy));
          }
          return res;
        })
        .catch(() => caches.match(SHELL, { ignoreVary: true }).then((r) => r || Response.error())),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') || /\.(png|svg|ico|webmanifest)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req, { ignoreVary: true, ignoreSearch: true }).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok && url.pathname.startsWith('/assets/')) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
