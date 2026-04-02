/**
 * Service Worker — Kodi Plex Web UI
 * Caches the app shell for offline/instant loading.
 */
const CACHE_NAME = "kodi-plex-v1.14.1";
const APP_SHELL = [
  "./",
  "index.html",
  "css/style.css",
  "js/app.js",
  "js/state.js",
  "js/helpers.js",
  "js/ui.js",
  "js/data.js",
  "js/collections.js",
  "js/preferences.js",
  "js/tv-navigation.js",
  "js/player.js",
  "js/router.js",
  "js/actions.js",
  "js/views/home.js",
  "js/views/watchlist.js",
  "js/views/movies.js",
  "js/views/tvshows.js",
  "js/views/music.js",
  "js/views/livetv.js",
  "js/views/search.js",
  "js/views/settings.js",
  "js/kodi.js",
  "js/omdb.js",
  "manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only cache same-origin app shell assets; let API calls pass through
  if (
    url.pathname.startsWith("/jsonrpc") ||
    url.pathname.startsWith("/image/")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Network-first for HTML, cache-first for assets
      if (event.request.mode === "navigate") {
        return fetch(event.request)
          .then((resp) => {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
            return resp;
          })
          .catch(() => cached);
      }
      return cached || fetch(event.request);
    }),
  );
});
