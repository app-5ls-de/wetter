importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/6.2.4/workbox-sw.js"
);
const { registerRoute, setDefaultHandler } = workbox.routing;
const { StaleWhileRevalidate, CacheFirst, NetworkFirst } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;
const { cacheNames, setCacheNameDetails } = workbox.core;

setCacheNameDetails({ suffix: "v3" });
cacheNames.expiration = cacheNames.prefix + "-expiration-" + cacheNames.suffix;

async function cacheKeyWillBeUsed({ request }) {
  const url = new URL(request.url || request);
  return url.origin + url.pathname;
}

registerRoute(
  ({ url }) => url.origin == location.origin,
  new StaleWhileRevalidate({ plugins: [{ cacheKeyWillBeUsed }] })
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
    ) || url.href.startsWith("https://www.dwd.de/DWD/wetter"),
  new CacheFirst({
    cacheName: cacheNames.expiration,
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 24 * 60 * 60,
        matchOptions: { ignoreVary: true },
      }),
    ],
  })
);

registerRoute(
  ({ url }) =>
    [
      "https://www.meteoblue.com",
      "https://api.met.no",
      "https://api.brightsky.dev",
    ].includes(url.origin),
  new NetworkFirst({
    cacheName: cacheNames.expiration,
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 6 * 60 * 60,
        matchOptions: { ignoreVary: true },
      }),
    ],
  })
);

setDefaultHandler(
  new StaleWhileRevalidate({
    cacheName: cacheNames.expiration,
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 1 * 60 * 60,
        matchOptions: { ignoreVary: true },
      }),
    ],
  })
);

self.addEventListener("install", (event) => {
  const urls = [
    "/",
    "/show",
    "/404.html",
    "/style.css",
    "/script.js",
    "/locations.json",
    "https://cdn.jsdelivr.net/npm/fuzzysort@1.1.4/fuzzysort.min.js",
    "https://cdn.jsdelivr.net/npm/crel@4.2.1/crel.min.js",
  ];
  const cacheName = cacheNames.runtime;
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(urls)));
});

self.addEventListener("activate", (event) => {
  const cacheNamesArray = Object.values(cacheNames);
  event.waitUntil(
    caches.keys().then((userCacheNames) =>
      Promise.all(
        userCacheNames.map((cacheName) => {
          if (!cacheNamesArray.includes(cacheName))
            return caches.delete(cacheName);
        })
      )
    )
  );
});
