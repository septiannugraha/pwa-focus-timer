// Service Worker for PWA Focus Timer
// Handles background timer persistence and offline functionality

const CACHE_NAME = 'focus-timer-v1';
const TIMER_DB = 'TimerDatabase';
const TIMER_STORE = 'activeTimers';

// Cache assets for offline use
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/offline.html',
        '/manifest.json',
        '/icon-192.png',
        '/icon-512.png'
      ]);
    })
  );
  self.skipWaiting();
});

// Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Handle fetch events with network-first strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response for cache
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });
      })
  );
});

// Timer persistence in IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(TIMER_DB, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(TIMER_STORE)) {
        db.createObjectStore(TIMER_STORE, { keyPath: 'id' });
      }
    };
  });
}

// Save timer state
async function saveTimerState(timerData) {
  const db = await openDB();
  const transaction = db.transaction([TIMER_STORE], 'readwrite');
  const store = transaction.objectStore(TIMER_STORE);

  const timerRecord = {
    id: 'current',
    startTime: timerData.startTime,
    duration: timerData.duration,
    serverTime: timerData.serverTime,
    userId: timerData.userId,
    lastHeartbeat: Date.now()
  };

  store.put(timerRecord);
  return transaction.complete;
}

// Get timer state
async function getTimerState() {
  const db = await openDB();
  const transaction = db.transaction([TIMER_STORE], 'readonly');
  const store = transaction.objectStore(TIMER_STORE);
  return store.get('current');
}

// Handle messages from main thread
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'START_TIMER':
      await saveTimerState(data);
      startHeartbeat(data.userId);
      break;

    case 'STOP_TIMER':
      await clearTimerState();
      stopHeartbeat();
      break;

    case 'CHECK_TIMER':
      const state = await getTimerState();
      event.ports[0].postMessage({ state });
      break;

    case 'HEARTBEAT':
      await sendHeartbeat(data.userId);
      break;
  }
});

// Clear timer state
async function clearTimerState() {
  const db = await openDB();
  const transaction = db.transaction([TIMER_STORE], 'readwrite');
  const store = transaction.objectStore(TIMER_STORE);
  store.delete('current');
  return transaction.complete;
}

// Heartbeat to validate timer with server
let heartbeatInterval;

function startHeartbeat(userId) {
  // Send heartbeat every 30 seconds
  heartbeatInterval = setInterval(() => {
    sendHeartbeat(userId);
  }, 30000);

  // Send initial heartbeat
  sendHeartbeat(userId);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

async function sendHeartbeat(userId) {
  const state = await getTimerState();
  if (!state) return;

  // Calculate elapsed time
  const elapsed = Date.now() - state.startTime;

  // Send to server for validation
  fetch('/api/timer/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      sessionId: state.id,
      elapsed,
      clientTime: Date.now()
    })
  }).catch(error => {
    console.error('Heartbeat failed:', error);
  });
}

// Background sync for offline timer completion
self.addEventListener('sync', async (event) => {
  if (event.tag === 'timer-complete') {
    event.waitUntil(syncTimerCompletion());
  }
});

async function syncTimerCompletion() {
  const state = await getTimerState();
  if (!state) return;

  // Check if timer is complete
  const elapsed = Date.now() - state.startTime;
  if (elapsed >= state.duration) {
    // Send completion to server
    try {
      await fetch('/api/timer/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: state.userId,
          duration: state.duration,
          startTime: state.startTime,
          endTime: Date.now()
        })
      });

      // Clear timer after successful sync
      await clearTimerState();
    } catch (error) {
      // Will retry on next sync
      console.error('Sync failed, will retry:', error);
    }
  }
}

// Push notification support (for streak reminders)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Your streak is about to break! Start a focus session now.',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [200, 100, 200],
    actions: [
      { action: 'start', title: 'Start Focus' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Focus Timer Reminder', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'start') {
    event.waitUntil(
      clients.openWindow('/timer?duration=25')
    );
  }
});

console.log('Service Worker initialized for Focus Timer PWA');