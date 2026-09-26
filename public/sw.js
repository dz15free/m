/* عامل الخدمة لمساعد الأستاذ (يدوي، بلا أدوات بناء):
   - أصول Next الثابتة والخطوط والأيقونات ومحرّكات OCR: من الكاش أولًا (لا تتغيّر أبدًا).
   - الصفحات وبيانات التنقّل (RSC): من الشبكة أولًا، ومن الكاش عند انقطاعها.
   - /api وطلبات Firebase: لا تُلمس (البيانات لها كاش Firestore الدائم).
   - إشعارات الهاتف (FCM Web Push): عرضها وفتح الرابط عند الضغط. */
const VERSION = "v4";
const STATIC = `static-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const SHELL = ["/app", "/offline.html", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC, PAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isStatic = (p) => /^\/(_next\/static|vendor|brand|icons|fonts)\//.test(p) || p === "/manifest.webmanifest";

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (isStatic(url.pathname)) {
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

  // صفحة كاملة أو بيانات تنقّل داخلي (RSC) لصفحات التطبيق
  const rsc = req.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
  if (req.mode === "navigate" || rsc) {
    // مفتاح كاش ثابت لبيانات RSC (بلا معامل _rsc المتغيّر)
    const key = rsc ? new Request(`${url.origin}${url.pathname}${url.search.replace(/[?&]_rsc=[^&]*/, "")}#rsc`) : req;
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && (url.pathname.startsWith("/app") || url.pathname === "/")) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(key, copy));
          }
          return res;
        })
        .catch(async () => {
          const hit = await caches.match(key);
          if (hit) return hit;
          if (rsc) return Response.error();
          return (await caches.match("/app")) || (await caches.match("/offline.html")) || Response.error();
        }),
    );
  }
});

// ── إشعارات الهاتف ──

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { notification: { title: "مساعد الأستاذ", body: event.data?.text() ?? "" } };
  }
  const n = data.notification ?? {};
  const extra = data.data ?? {};
  const title = n.title || extra.title || "مساعد الأستاذ";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: n.body || extra.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      dir: "auto",
      tag: extra.tag || undefined,
      data: { link: extra.link || n.click_action || "/app" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = new URL(event.notification.data?.link || "/app", self.location.origin);
  if (link.origin !== self.location.origin) return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => new URL(w.url).origin === link.origin);
      if (open) return open.navigate(link.href).then((w) => (w || open).focus());
      return self.clients.openWindow(link.href);
    }),
  );
});
