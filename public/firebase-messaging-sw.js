// Firebase Cloud Messaging & Offline PWA Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const CACHE_NAME = 'flood-alert-fcm-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/maskable-icon-512.png',
  '/icon.svg',
];

// Initialize Firebase inside the service worker
firebase.initializeApp({
  projectId: "automatic-flood-alert",
  appId: "1:158763014091:web:5c5f57835516089c37084e",
  apiKey: "AIzaSyDsh5VHm1rk4tiacIYVkkxZF3LK5lPmH0w",
  authDomain: "automatic-flood-alert.firebaseapp.com",
  messagingSenderId: "158763014091"
});

const messaging = firebase.messaging();

// 1. Install & Cache Shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[FCM-SW] Pre-caching asset:', err);
      });
    })
  );
});

// 2. Activate & Clean Outdated Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Network-First / Cache Fallback for PWA offline reliability
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('identitytoolkit.googleapis.com') ||
    event.request.url.includes('fcm.googleapis.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline - Flood Radar Ready', { status: 503, statusText: 'Offline' });
        });
      })
  );
});

// 4. Handle FCM Background Messages (when tabs are closed or device locked)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received FCM background message:', payload);

  const title = payload.notification?.title || payload.data?.title || '🚨 CRITICAL FLOOD ALARM';
  const body = payload.notification?.body || payload.data?.body || 'Continuous water vibration detected! Check sensor immediately.';
  const severity = payload.data?.severity || 'red';

  const notificationOptions = {
    body: body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: severity === 'yellow' ? 'flood_warning_yellow' : 'critical_flood_alarm',
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: [800, 200, 800, 200, 1000, 200, 1000],
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

// 5. Fallback Standard Push Event
self.addEventListener('push', (event) => {
  let data = {
    title: '🚨 CRITICAL FLOOD WARNING',
    body: 'Continuous water vibration detected! Check sensor node immediately.',
    village: 'Your Village',
    timestamp: Date.now(),
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: data.body || 'High water sensor vibration alert',
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'critical_flood_alarm',
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: [800, 200, 800, 200, 1000, 200, 1000],
    data: {
      url: '/',
      timestamp: data.timestamp || Date.now(),
      ...data,
    },
    actions: [
      { action: 'open_alarm', title: '🚨 Open Radar' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '🚨 CRITICAL FLOOD WARNING', notificationOptions)
  );
});

// 6. Direct Client Message (from foreground/background threads)
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, village, peakDelta, isTest } = event.data;
    const notificationOptions = {
      body: body || 'High continuous vibration detected at water sensor!',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: isTest ? 'flood_test_alert' : 'critical_flood_alarm',
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: [800, 200, 800, 200, 1000, 200, 1000],
      data: {
        url: '/',
        village: village || 'Local Node',
        peakDelta: peakDelta || 0,
        timestamp: Date.now(),
      },
      actions: [
        { action: 'open_alarm', title: '🚨 Open Radar' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(title || '🚨 FLOOD ALERT DETECTED', notificationOptions)
    );
  }
});

// 7. Notification Click Handler: Brings app to focus even when tab was closed
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Focus existing open tab or open a new window
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

