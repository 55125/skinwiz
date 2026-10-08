// Service worker: lets the site install to the home screen and shows
// /offline instead of the browser's error page when there's no connection.
//
// Pages are never cached. Shelf, regimen and account pages are personal and
// change often, so every navigation goes to the network; only the offline
// page and Next's content-hashed /_next/static files are kept. Bump VERSION
// when this file's caching changes.
const VERSION = "v1";
const OFFLINE_CACHE = `offline-${VERSION}`;
const STATIC_CACHE = "static-v1";
const OFFLINE_URL = "/offline";
const STATIC_LIMIT = 200;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const res = await fetch(new Request(OFFLINE_URL, { cache: "reload" }));
      if (!res.ok) throw new Error(`offline page: ${res.status}`);
      const offline = await caches.open(OFFLINE_CACHE);
      await offline.put(OFFLINE_URL, res.clone());
      // The offline page's own CSS and JS, so it renders styled with no network.
      const html = await res.text();
      const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? [])];
      const statics = await caches.open(STATIC_CACHE);
      await Promise.all(assets.map((url) => statics.add(url).catch(() => {})));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([OFFLINE_CACHE, STATIC_CACHE]);
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return (await event.preloadResponse) ?? (await fetch(request));
        } catch {
          return (await caches.match(OFFLINE_URL)) ?? Response.error();
        }
      })(),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const res = await fetch(request);
        if (res.ok) event.waitUntil(putStatic(request, res.clone()));
        return res;
      })(),
    );
  }
});

// Old deploys' hashed files pile up otherwise; drop the oldest past the cap.
async function putStatic(request, res) {
  const cache = await caches.open(STATIC_CACHE);
  await cache.put(request, res);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - STATIC_LIMIT)).map((k) => cache.delete(k)));
}
