// Minimal service worker whose only job is Web Push — no offline caching,
// so it can never serve a stale build. If it ever needs to handle install-
// time asset caching, add that separately rather than overloading this file.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Atlas Capital', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Atlas Capital', {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      // Explicit even though these match the spec defaults: some iOS/Safari
      // builds have been reported to treat a notification with unset sound/
      // vibrate fields as silent rather than falling back to the default.
      // Costs nothing to be explicit.
      silent: false,
      vibrate: [200, 100, 200],
      data: { url: payload.url || '/cockpit' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/cockpit';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
