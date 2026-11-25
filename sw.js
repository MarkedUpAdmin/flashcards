// Keeps the flashcards working offline after the first visit.
const CACHE = "flashcards-v6";
const FILES = ["./", "index.html", "manifest.webmanifest", "apple-touch-icon.png", "icon-192.png", "icon-512.png"];

function fresh(path) {
  return fetch(new Request(path, { cache: "reload" }));
}

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.all(FILES.map(path =>
        fresh(path).then(res => {
          // A redirected response cannot be stored; skip it and let the fetch handler fill the cache.
          if (!res || !res.ok || res.redirected) return;
          return cache.put(path, res);
        }).catch(() => {})
      ))
    ).then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  var same = false;
  try { same = new URL(e.request.url).origin === self.location.origin; } catch (err) {}
  // Reload same-origin files so a home-screen install doesn't keep a stale index.html.
  var loader = same
    ? fetch(e.request.url, { cache: "reload", credentials: "same-origin" })
    : fetch(e.request);
  e.respondWith(
    loader.then(res => {
      if (same && res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html")))
  );
});
