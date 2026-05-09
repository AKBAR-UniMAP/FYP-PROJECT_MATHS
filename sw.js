// Service Worker for Math Kids Game
// Provides offline support and enhanced caching

const CACHE_NAME = 'math-adventure-v1.0';
const STATIC_CACHE = 'math-adventure-static-v1.0';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/TemplateData/style.css',
  '/math-game-loader.js',
  '/Build/html.loader.js'
];

// Files to cache when requested (runtime cache)
const RUNTIME_CACHE = [
  '/Build/html.data.gz',
  '/Build/html.framework.js.gz',
  '/Build/html.wasm.gz',
  '/TemplateData/unity-logo-dark.png',
  '/TemplateData/progress-bar-empty-dark.png',
  '/TemplateData/progress-bar-full-dark.png',
  '/TemplateData/webgl-logo.png',
  '/TemplateData/fullscreen-button.png'
];

self.addEventListener('install', (event) => {
  console.log('🛠️ Installing Math Adventure Service Worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Caching static assets...');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('✅ Static assets cached successfully!');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Failed to cache static assets:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('🎯 Activating Math Adventure Service Worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('🎉 Service Worker activated!');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  const fixUnityGzipHeadersIfNeeded = (response) => {
    try {
      const pathname = url.pathname.toLowerCase();
      if (!pathname.endsWith('.gz')) return response;

      const headers = new Headers(response.headers);
      const contentEncoding = headers.get('content-encoding');

      // If the server doesn't provide Content-Encoding for precompressed .gz files,
      // browsers will not decompress and Unity will fail to parse/compile.
      if (!contentEncoding) {
        headers.set('Content-Encoding', 'gzip');
      }

      // Ensure correct content types for Unity assets.
      if (!headers.get('content-type')) {
        if (pathname.endsWith('.wasm.gz')) headers.set('Content-Type', 'application/wasm');
        else if (pathname.endsWith('.js.gz')) headers.set('Content-Type', 'application/javascript');
        else headers.set('Content-Type', 'application/octet-stream');
      }

      // If we didn't change anything, keep the original response.
      if (headers.get('content-encoding') === contentEncoding && response.headers.get('content-type') === headers.get('content-type')) {
        return response;
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch {
      return response;
    }
  };

  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html')
        .then((response) => {
          return response || fetch(event.request);
        })
    );
    return;
  }

  // Handle static assets
  if (STATIC_FILES.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
    return;
  }

  // Handle runtime assets with network-first strategy for game files
  if (RUNTIME_CACHE.some(pattern => url.pathname.includes(pattern.replace('/', '')))) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          response = fixUnityGzipHeadersIfNeeded(response);

          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request)
            .then((response) => {
              if (response) {
                console.log('📱 Serving from cache (offline):', url.pathname);
                return response;
              }
              throw new Error('Asset not available offline');
            });
        })
    );
    return;
  }

  // Default strategy: cache-first for other assets
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request)
          .then((response) => {
            response = fixUnityGzipHeadersIfNeeded(response);

            // Don't cache non-successful responses
            if (!response.ok) {
              return response;
            }

            // Cache the response
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseClone);
              });

            return response;
          });
      })
  );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_CACHE_INFO') {
    caches.keys().then((cacheNames) => {
      const cachePromises = cacheNames.map((cacheName) => {
        return caches.open(cacheName).then((cache) => {
          return cache.keys().then((requests) => {
            return {
              name: cacheName,
              count: requests.length,
              urls: requests.map(r => r.url)
            };
          });
        });
      });

      Promise.all(cachePromises).then((cacheInfo) => {
        event.ports[0].postMessage({
          type: 'CACHE_INFO',
          caches: cacheInfo
        });
      });
    });
  }
});

// Background sync for saving game progress
self.addEventListener('sync', (event) => {
  if (event.tag === 'save-game-progress') {
    event.waitUntil(saveGameProgress());
  }
});

async function saveGameProgress() {
  // This would be implemented to sync game progress to a server
  console.log('💾 Syncing game progress...');
  // Implementation would depend on your backend
}