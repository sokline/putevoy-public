// Простой service worker — кэширует оболочку для работы офлайн
var CACHE = "pl-v1";
var FILES = [
  "./",
  "./driver.html",
  "./github-api.js",
  "./manifest.json"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(FILES).catch(function () {});
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Сначала сеть, при отсутствии — кэш (лучше для API)
self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  // Не кэшируем запросы к API
  if (url.hostname.indexOf("yandexcloud.net") !== -1) return;

  e.respondWith(
    fetch(e.request).then(function (r) {
      // Обновляем кэш
      if (r && r.status === 200 && e.request.method === "GET") {
        var clone = r.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, clone); });
      }
      return r;
    }).catch(function () {
      return caches.match(e.request);
    })
  );
});
