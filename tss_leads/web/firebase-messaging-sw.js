// Import Firebase scripts for web
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize Firebase in Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyB_8JvhRPvVUvV4XqOJu3Z_Fq_1-5-_X8",
  authDomain: "tss-leads.firebaseapp.com",
  projectId: "tss-leads",
  storageBucket: "tss-leads.appspot.com",
  messagingSenderId: "742627133321",
  appId: "1:742627133321:web:f8e5c4f3a9c5d2e1b7f9a8"
});

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: 'fcm-message',
    requireInteraction: false,
  };
  
  // Check if notification data contains lead_id
  if (payload.data?.lead_id) {
    notificationOptions.data = {
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
      lead_id: payload.data.lead_id,
    };
  }
  
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification);
  event.notification.close();
  
  // Get leadId from notification data
  const leadId = event.notification.data?.lead_id;
  
  // Focus or open the window
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if there's already a window/tab open
      for (let client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          client.focus();
          // Send message to client about the lead_id
          if (leadId) {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              leadId: leadId,
            });
          }
          return client;
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
