// Service Worker for Offline Mode Support
const CACHE_NAME = 'kambi-academy-v5';
const STATIC_CACHE = 'kambi-static-v5';
const DYNAMIC_CACHE = 'kambi-dynamic-v5';

// Resources to cache immediately (Vite builds hashed assets – only cache shell resources)
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('Error caching static assets:', error);
      })
  );
  // Force activation
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  const VALID_CACHES = [STATIC_CACHE, DYNAMIC_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!VALID_CACHES.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all clients
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  const isCacheableAssetResponse = (response, destination) => {
    if (!response || response.status !== 200) {
      return false;
    }

    const contentType = (response.headers.get('Content-Type') || '').toLowerCase();

    if (destination === 'font') {
      return contentType.includes('font') || contentType.includes('application/octet-stream');
    }

    if (destination === 'script') {
      return contentType.includes('javascript') || contentType.includes('ecmascript') || contentType.includes('module');
    }

    if (destination === 'style') {
      return contentType.includes('css');
    }

    if (destination === 'image') {
      return contentType.startsWith('image/');
    }

    return true;
  };

  // Handle API requests with network-first strategy (only cache GET requests)
  if (url.pathname.startsWith('/api/')) {
    // Only use cache strategy for GET requests; POST/PUT/DELETE can't be cached
    if (request.method !== 'GET') {
      event.respondWith(
        fetch(request).catch(() => {
          return new Response(
            JSON.stringify({
              error: 'Offline',
              message: 'This feature requires an internet connection'
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
      );
      return;
    }

    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful GET API responses for offline use
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Return cached version if network fails
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return offline fallback for API calls
              return new Response(
                JSON.stringify({
                  error: 'Offline',
                  message: 'This feature requires an internet connection'
                }),
                {
                  status: 503,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        })
    );
    return;
  }

  // Handle static assets with cache-first strategy
  if (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'image' ||
      request.destination === 'font') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse && isCacheableAssetResponse(cachedResponse, request.destination)) {
            return cachedResponse;
          }
          return fetch(request)
            .then((response) => {
              if (isCacheableAssetResponse(response, request.destination)) {
                const responseClone = response.clone();
                caches.open(STATIC_CACHE)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            })
            .catch(() => {
              if (cachedResponse && isCacheableAssetResponse(cachedResponse, request.destination)) {
                return cachedResponse;
              }

              return Response.error();
            });
        })
    );
    return;
  }

  // Handle HTML pages (SPA navigation fallback)
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful page responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          // If we get a 404 for an SPA route, serve the cached index instead
          if (response.status === 404) {
            return caches.match('/') || response;
          }
          return response;
        })
        .catch(() => {
          // Network failed — try cached version of this URL first, then fall back to cached index (SPA shell)
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // SPA fallback: serve cached index.html for client-side routes
              return caches.match('/');
            })
            .then((response) => {
              return response || new Response(
                '<html><body><h1>You are offline</h1><p>Please check your internet connection.</p></body></html>',
                { headers: { 'Content-Type': 'text/html' } }
              );
            });
        })
    );
    return;
  }

  // Default: try cache first, then network
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request)
          .then((response) => {
            // Don't cache error responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseClone);
              });
            return response;
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Push notifications for offline updates
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.primaryKey
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received.');
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

// Background sync implementation
async function doBackgroundSync() {
  try {
    // Get pending offline actions from IndexedDB
    const pendingActions = await getPendingActions();

    for (const action of pendingActions) {
      try {
        await syncAction(action);
        await removePendingAction(action.id);
      } catch (error) {
        console.error('Failed to sync action:', action.id, error);
        // Keep failed actions for retry
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// IndexedDB helpers for offline storage
function getPendingActions() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('KambiAcademyDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingActions'], 'readonly');
      const store = transaction.objectStore('pendingActions');
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingActions')) {
        db.createObjectStore('pendingActions', { keyPath: 'id' });
      }
    };
  });
}

function syncAction(action) {
  // Implement specific sync logic based on action type
  switch (action.type) {
    case 'submit-assignment':
      return fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data)
      });
    case 'quiz-response':
      return fetch('/api/quiz-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data)
      });
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

function removePendingAction(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('KambiAcademyDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['pendingActions'], 'readwrite');
      const store = transaction.objectStore('pendingActions');
      const deleteRequest = store.delete(id);

      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}