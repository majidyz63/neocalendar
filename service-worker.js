const CACHE_NAME = "neocal-v22";
const FILES_TO_CACHE = [
    "/",
    "/index.html",
    "/manifest.json",
    "/css/style.css",
    "/js/script.js",
    "/icons/icon-192.png",
    "/icons/icon-512.png"
];

// نصب Service Worker و کش فایل‌ها
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
    );
});

// فعال‌سازی و پاک کردن کش‌های قدیمی
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keyList) =>
            Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            )
        )
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
