/**
 * Followup Notification Service Worker
 * Handles:
 *  1. Web Push from backend  → native Android notification bar (works even when Chrome is minimized)
 *  2. postMessage scheduling → foreground/tab-visible fallback
 */

const timers = new Map(); // followupId -> timeoutId

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// ── 1. Real Web Push (backend fires this server-side at due time) ────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try { payload = event.data.json(); }
  catch (_) { payload = { title: '⏰ Followup Reminder', body: event.data.text() }; }

  const title = payload.title || '⏰ Followup Reminder';
  const body  = payload.body  || 'A followup is due now.';

  // Tell open tabs to play the audio beep
  self.clients.matchAll({ includeUncontrolled: true }).then((clients) =>
    clients.forEach((c) => c.postMessage({ type: 'PLAY_SOUND' }))
  );

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.ico',
      tag: `followup-${payload.followup_id || Date.now()}`,
      requireInteraction: true,
      silent: true,
      data: payload,
    })
  );
});

// ── 2. postMessage scheduling (page-driven, tab-reachable fallback) ──────────
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || !data.type) return;

  if (data.type === 'SCHEDULE_FOLLOWUP') {
    const { id, title, body, scheduledFor } = data;
    if (!id || !scheduledFor) return;

    const delay = new Date(scheduledFor).getTime() - Date.now();
    if (delay <= 0) return;

    if (timers.has(id)) clearTimeout(timers.get(id));

    const timerId = setTimeout(() => {
      self.clients.matchAll({ includeUncontrolled: true }).then((clients) =>
        clients.forEach((c) => c.postMessage({ type: 'PLAY_SOUND', id }))
      );
      self.registration.showNotification(title || '⏰ Followup Reminder', {
        body: body || 'A followup is due now.',
        icon: '/favicon.ico',
        tag: `followup-${id}`,
        requireInteraction: true,
        silent: true,
        data: { id },
      });
      timers.delete(id);
    }, delay);

    timers.set(id, timerId);
  }

  if (data.type === 'CANCEL_FOLLOWUP') {
    if (timers.has(data.id)) { clearTimeout(timers.get(data.id)); timers.delete(data.id); }
  }
});

// ── Notification click → focus / open app ────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
