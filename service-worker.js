importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/6.1.5/workbox-sw.js"
);
const { registerRoute, setDefaultHandler } = workbox.routing;
const { StaleWhileRevalidate, CacheFirst } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;
const { cacheNames } = workbox.core;

/* workbox.setConfig({
  debug: false,
}); */

async function cacheKeyWillBeUsed({ request }) {
  const url = new URL(request.url || request);
  // Any search params or hash will be left out.
  return url.origin + url.pathname;
}

registerRoute(
  ({ url }) => url.origin == location.origin,
  new StaleWhileRevalidate({
    plugins: [{ cacheKeyWillBeUsed }],
  })
);

registerRoute(
  ({ url }) =>
    [
      "https://cdn.jsdelivr.net",
      "https://nominatim.openstreetmap.org",
    ].includes(url.origin),
  new CacheFirst()
);

registerRoute(
  ({ url }) =>
    ["https://cdn.knmi.nl", "https://api.sunrise-sunset.org"].includes(
      url.origin
    ),
  new CacheFirst({
    cacheName: "expiration-cache",
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 24 * 60 * 60,
        matchOptions: {
          ignoreVary: true,
        },
      }),
    ],
  })
);

setDefaultHandler(
  new StaleWhileRevalidate({
    cacheName: "expiration-cache",
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 1 * 60 * 60,
        matchOptions: {
          ignoreVary: true,
        },
      }),
    ],
  })
);

self.addEventListener("install", (event) => {
  const urls = ["/", "/show", "/404.html"];
  const cacheName = cacheNames.runtime;
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(urls)));
});
