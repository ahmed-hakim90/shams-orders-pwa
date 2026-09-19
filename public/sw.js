const CACHE = "shams-orders-v5";
const SHELL = ["/", "/manifest.webmanifest", "/shams-icon-192.png", "/shams-icon-512.png", "/shams-stores-logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || event.request.mode !== "navigate" || url.pathname.startsWith("/api/") || url.pathname.startsWith("/wp-json/")) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then((response) => response || caches.match("/"))));
});

self.addEventListener("push", (event) => {
  const payload = event.data?.json() || {};
  event.waitUntil(self.registration.showNotification(payload.title || "أوردر جديد", {
    body: payload.body || "وصلك أوردر جديد ويحتاج متابعة.",
    icon: "/shams-icon-192.png",
    badge: "/shams-icon-192.png",
    tag: payload.tag || "shams-order",
    data: { url: payload.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || "/"));
});
