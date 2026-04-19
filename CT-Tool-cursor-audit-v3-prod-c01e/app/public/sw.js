/* Offline shell cache for Cycle Time Analyzer (GitHub Pages + root). */
const CACHE = "cta-v1";

function shellUrls() {
  const scope = self.registration?.scope || self.location.origin + "/";
  const u = (p) => new URL(p, scope).href;
  return [u(""), u("index.html"), u("404.html"), u("manifest.webmanifest"), u("favicon.svg")];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(shellUrls()))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.status === 200 && res.type === "basic") {
            caches.open(CACHE).then((cache) => {
              cache.put(req, copy);
            });
          }
          return res;
        })
        .catch(() => {
          const scope = self.registration?.scope || self.location.origin + "/";
          return caches.match(new URL("index.html", scope).href);
        });
    }),
  );
});
