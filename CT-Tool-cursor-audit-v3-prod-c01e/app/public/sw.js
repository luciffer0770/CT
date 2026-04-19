/* Offline shell for GitHub Pages — must NOT intercept hashed JS/CSS or a failed chunk
 * load gets replaced with index.html (HTML executed as JS → blank app + infinite spinner). */
const CACHE = "cta-v2";

function scopeBase() {
  return self.registration?.scope || self.location.origin + "/";
}

function shellUrls() {
  const u = (p) => new URL(p, scopeBase()).href;
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
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Only handle full document navigations. Let JS/CSS/fonts/assets use the network
  // so deploys with new hashes always fetch real files (never HTML fallback).
  if (req.mode !== "navigate") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(new URL("index.html", scopeBase()).href)),
  );
});
