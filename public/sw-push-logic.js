// public/sw-push-logic.js

// This file contains ONLY the event listeners for push notifications.

self.addEventListener('push', (event) => {
  if (!event.data) {
    console.error('Push event but no data');
    return;
  }
  const data = event.data.json();

  const title = data.title || 'New Notification';
  const options = {
    body: data.body,
    icon: '/logo.png',
    badge: '/logo.png',
    data: {
      url: data.url || '/',
      reminderId: data.reminderId || null,
    },
    // Action buttons (supported on Chrome/Edge/Android; ignored elsewhere).
    actions: data.reminderId
      ? [
          { action: 'done', title: '✓ Done' },
          { action: 'snooze', title: 'Snooze 1h' },
        ]
      : [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { url, reminderId } = event.notification.data || {};

  // "Done" / "Snooze 1h" buttons hit the API directly; falls back to opening
  // the app if the request fails (e.g. signed-out session).
  if ((event.action === 'done' || event.action === 'snooze') && reminderId) {
    event.waitUntil(
      fetch('/api/reminders/action', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminderId,
          action: event.action,
          snoozeMinutes: 60,
        }),
      }).then((res) => {
        if (!res.ok) return clients.openWindow(url || '/reminders');
      }).catch(() => clients.openWindow(url || '/reminders'))
    );
    return;
  }

  event.waitUntil(clients.openWindow(url || '/'));
});
