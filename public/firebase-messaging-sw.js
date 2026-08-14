// Scripts for firebase messaging
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase inside the service worker
firebase.initializeApp({
  projectId: "automatic-flood-alert",
  appId: "1:158763014091:web:5c5f57835516089c37084e",
  apiKey: "AIzaSyDsh5VHm1rk4tiacIYVkkxZF3LK5lPmH0w",
  authDomain: "automatic-flood-alert.firebaseapp.com",
  messagingSenderId: "158763014091"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload);

  const title = payload.notification?.title || payload.data?.title || '🚨 CRITICAL FLOOD ALARM';
  const body = payload.notification?.body || payload.data?.body || 'Continuous water vibration detected! Check sensor immediately.';

  const notificationOptions = {
    body: body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'critical_flood_alarm',
    renotify: true,
    requireInteraction: true,
    vibrate: [600, 200, 600, 200, 1000, 200, 1000],
    data: {
      url: '/',
      timestamp: Date.now(),
      ...payload.data
    },
    actions: [
      { action: 'open_alarm', title: '🚨 Open Radar' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  self.registration.showNotification(title, notificationOptions);
});
