---
---
const PRECACHE = 'precache-v{{ "now" | date: "%s"}}';
const RUNTIME = "runtime";

const PRECACHE_URLS = [
    "/",
    "/index.html",
    "/404.html",
    "/script.js",
    "/style.css",
    "/manifest.json",
    "/favicon.ico",
    "/icons/android-chrome-192x192.png",
    "/icons/android-chrome-512x512.png",
    "/icons/maskable_icon.png",
    "/icons/apple-touch-icon.png",
    "/icons/favicon-32x32.png",
    "/icons/favicon-16x16.png",
    "/icons/safari-pinned-tab.svg",
    "/icons/browserconfig.xml",
    "/icons/mstile-70x70.png",
    "/icons/mstile-150x150.png",
    "/icons/mstile-310x310.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(PRECACHE)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    const currentCaches = [PRECACHE];
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) => {
                return cacheNames.filter(
                    (cacheName) => !currentCaches.includes(cacheName)
                );
            })
            .then((cachesToDelete) => {
                return Promise.all(
                    cachesToDelete.map((cacheToDelete) => {
                        return caches.delete(cacheToDelete);
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    if (
        event.request.url.startsWith(self.location.origin) ||
        event.request.url.startsWith("https://cdn.jsdelivr.net/")
    ) {
        event.respondWith(
            caches
                .match(event.request, { ignoreSearch: true })
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return caches.open(RUNTIME).then((cache) => {
                        return fetch(event.request).then((response) => {
                            return cache
                                .put(event.request, response.clone())
                                .then(() => {
                                    return response;
                                });
                        });
                    });
                })
        );
    }
});
