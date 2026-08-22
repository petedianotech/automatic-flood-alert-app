/**
 * Automatic Flood Alert - Service Worker
 * Full Offline PWA Support & Background Notification Engine
 */

const CACHE_NAME = 'flood-alert-cache-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/maskable-icon-512.png',
  '/icon.svg',
];

// 1. Install & Pre-cache Static Shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-caching partial failure (safe to continue):', err);
      });
    })
  );
});

// 2. Activate & Clean Old Caches
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

// 3. Network-First / Cache-Fallback Fetch Handler
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and non-firebase API requests
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('identitytoolkit.googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful responses for offline support
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});

// 4. Background Push Event (Remote Web Push Notification)
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
    body: data.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'critical_flood_alarm',
    renotify: true,
    requireInteraction: true,
    vibrate: [600, 200, 600, 200, 1000, 200, 1000],
    data: {
      url: '/',
      timestamp: data.timestamp || Date.now(),
      village: data.village,
    },
    actions: [
      { action: 'open_alarm', title: '🚨 Open Radar' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '🚨 FLOOD ALERT', notificationOptions)
  );
});

// 5. Message Event (Triggered from Foreground / Background JS / Offline Sensor Node)
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
      vibrate: [600, 200, 600, 200, 1000, 200, 1000],
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

// 6. Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Focus existing open window or open new window
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
