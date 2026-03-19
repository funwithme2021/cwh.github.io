self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification && event.notification.data && event.notification.data.url) || './home/index.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        for (const client of clients) {
          if ('focus' in client) {
            if ('navigate' in client && client.url && client.url !== url) {
              return client.navigate(url).then(nextClient => nextClient && 'focus' in nextClient ? nextClient.focus() : client.focus());
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});
