importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/6.2.4/workbox-sw.js"
);
const { StaleWhileRevalidate, CacheFirst, NetworkFirst, NetworkOnly } =
  workbox.strategies;
const { registerRoute, setDefaultHandler } = workbox.routing;
const { cacheNames, setCacheNameDetails } = workbox.core;

setCacheNameDetails({ suffix: "v8" });
cacheNames.offline = cacheNames.prefix + "-offline-" + cacheNames.suffix;
cacheNames.network = cacheNames.prefix + "-network-" + cacheNames.suffix;
cacheNames.stale = cacheNames.prefix + "-stale-" + cacheNames.suffix;

async function cacheKeyWillBeUsed({ request }) {
  const url = new URL(request.url || request);
  return url.origin + url.pathname;
}

registerRoute(
  ({ url }) =>
    url.origin == "https://cdn.jsdelivr.net" ||
    url.href.startsWith("https://photon.komoot.io/reverse") ||
    (url.origin == location.origin &&
      new RegExp("\\.(json|svg|png)$").test(url.pathname)),
  new CacheFirst({
    cacheName: cacheNames.offline,
  })
);

registerRoute(
  ({ url }) => url.origin == location.origin,
  new StaleWhileRevalidate({
    cacheName: cacheNames.stale,
    plugins: [{ cacheKeyWillBeUsed }],
  })
);

registerRoute(
  ({ url }) =>
    ["https://cdn.knmi.nl", "https://api.sunrise-sunset.org"].includes(
      url.origin
    ) || url.href.startsWith("https://www.dwd.de/DWD/wetter"),
  new StaleWhileRevalidate({
    cacheName: cacheNames.stale,
  })
);

registerRoute(
  ({ url }) =>
    url.origin.endsWith("cartocdn.com") ||
    url.origin.endsWith("rainviewer.com") ||
    url.origin == "https://photon.komoot.io",
  new NetworkOnly()
);

setDefaultHandler(
  new NetworkFirst({
    cacheName: cacheNames.network,
  })
);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(cacheNames.stale)
      .then((cache) => cache.addAll(["/", "/show", "/404"]))
  );
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
