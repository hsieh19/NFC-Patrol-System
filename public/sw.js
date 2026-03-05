const CACHE_NAME = 'nfc-patrol-v6';
const STATIC_ASSETS = [
    '/mobile',
    '/mobile/history',
    '/mobile/repair',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// 安装时：立即下载所有静态壳
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
        })
    );
    self.clients.claim();
});

// 核心：处理加载请求
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    // 针对页面跳转和静态资源，使用 Stale-While-Revalidate 策略
    // 逻辑：本地有的立刻给，同时去后台找最新的存起来
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // 如果完全断网且缓存也没有，尝试返回 /mobile 首页
                if (event.request.mode === 'navigate') {
                    return caches.match('/mobile');
                }
                return null;
            });

            return cachedResponse || fetchPromise;
        })
    );
});
