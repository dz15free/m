/* عامل الخدمة: يجعل التطبيق قابلًا للتثبيت، ويفتح الصفحات التي زرتها دون إنترنت.
   - أصول Next الثابتة (/_next/static) لا تتغيّر أبدًا: من الكاش أولًا.
   - الصفحات: من الشبكة أولًا، ومن الكاش عند انقطاعها.
   - واجهات /api وطلبات Firebase لا تُلمس (البيانات لها كاش Firestore الخاص). */
const STATIC = "static-v1";
const PAGES = "pages-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => ![STATIC, PAGES].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/vendor/") || url.pathname.startsWith("/brand/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(PAGES).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match("/app")) || Response.error()),
    );
  }
});
