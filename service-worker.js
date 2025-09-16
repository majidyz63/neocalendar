const CACHE_NAME = "neocal-v1";
const URLS_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json"
];

// نصب Service Worker و کش فایل‌ها
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
    );
});

// واکشی از کش یا شبکه
self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((resp) => {
            return resp || fetch(event.request);
        })
    );
});
