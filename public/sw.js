const C = "pawping-owner-experience-v9";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(["/", "/owner", "/manifest.json", "/icon.svg"])));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== C).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  if (e.request.method === "GET") {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
  }
});

// A finder's sighting arrives here as a push message from /api/notify.
self.addEventListener("push", e => {
  let data = {title: "PawPing", body: "You have a new update.", url: "/owner"};
  try { data = {...data, ...e.data.json()}; } catch (err) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: {url: data.url || "/owner"},
    })
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = e.notification.data?.url || "/owner";
  e.waitUntil(
    self.clients.matchAll({type: "window", includeUncontrolled: true}).then(list => {
      const existing = list.find(c => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
