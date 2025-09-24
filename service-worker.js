const CACHE_NAME = "neocal-v6"; // هر بار آپدیت کن
const FILES_TO_CACHE = [
    "/",
    "/index.html",
    "/manifest.json",
    "/css/style.css",
    "/js/script.js",
    "/icons/icon-192.png",
    "/icons/icon-512.png"
];

// 📌 نصب
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
    );
    self.skipWaiting();
});

// 📌 فعال‌سازی
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
    self.clients.claim();
});

// 📌 واکشی → فقط response کامل را کش کن
self.addEventListener("fetch", (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
