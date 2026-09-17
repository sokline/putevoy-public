var CACHE = "putevoy-v2";
var FILES = [
  "./driver.html",
  "./dispatcher.html",
  "./admin.html",
  "./github-api.js",
  "./manifest-driver.json",
  "./manifest-dispatcher.json",
  "./manifest-admin.json"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(
        FILES.map(function (url) {
          return c.add(url).catch(function () { /* пропускаем, если файла нет */ });
        })
      );
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

self.addEventListener("fetch", function (e) {
  var url;
  try { url = new URL(e.request.url); } catch (err) { return; }

  // Не кэшируем запросы к API (Yandex Cloud)
  if (url.hostname.indexOf("yandexcloud.net") !== -1) return;
  if (url.hostname.indexOf("github.io") === -1) return;

  // Сначала сеть, при отсутствии — кэш
  e.respondWith(
    fetch(e.request).then(function (r) {
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
