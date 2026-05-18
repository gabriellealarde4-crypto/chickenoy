// Service Worker for Chicken Noy PWA
// Provides offline support, caching, and improved performance

const CACHE_NAME = 'chicken-noy-v24';
const CACHE_ASSETS = [
  '/Page/index.html',
  '/Page/menu.html',
  '/Page/login.html',
  '/Page/register.html',
  '/Page/cart.html',
  '/Page/checkout.html',
  '/Page/dashboard.html',
  '/Page/profile.html',
  '/Page/admin.html',
  '/Page/contact.html',
  '/Page/about.html',
  '/Page/privacy-policy.html',
  '/Page/terms-conditions.html',
  '/Page/delivery-information.html',
  '/Page/gcash-payment.html',
  '/CSS/style.css',
  '/JS/app.js',
  '/JS/offline-handler.js?v=3',
  '/JS/menu.js?v=6',
  '/JS/cart.js',
  '/JS/checkout.js?v=3',
  '/JS/dashboard.js?v=7',
  '/JS/admin.js?v=10',
  '/JS/common.js?v=16',
  '/JS/auth.js',
  '/manifest.json',
  '/images/chicken-mascot.png',
  '/images/gcash-logo.png?v=2',
  '/images/gcash-qr.png'
];

// Install event - cache essential assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching essential assets');
        return cache.addAll(CACHE_ASSETS).catch(err => {
          console.log('Some assets failed to cache:', err);
          // Don't fail the entire install if some assets can't be cached
          return Promise.resolve();
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle API calls differently than static assets
  let isApiRequest = false;

  try {
    const reqUrl = new URL(event.request.url);
    isApiRequest = reqUrl.pathname.startsWith('/api/') || reqUrl.pathname === '/api';
  } catch (e) {
    isApiRequest = false;
  }

  if (isApiRequest) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful API responses
          if (response && response.ok) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          // If offline, try to return cached JSON response for APIs
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) return cachedResponse;
            return new Response(JSON.stringify({ error: 'offline', message: 'API unavailable' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  let requestPath = "";
  try {
    requestPath = new URL(event.request.url).pathname.replace(/\/+$/, "").toLowerCase() || "/";
  } catch (e) {
    requestPath = "";
  }

  const documentFallbacks = {
    "/": "/Page/index.html",
    "/index.html": "/Page/index.html",
    "/admin": "/Page/admin.html",
    "/admin.html": "/Page/admin.html",
    "/menu": "/Page/menu.html",
    "/menu.html": "/Page/menu.html",
    "/cart": "/Page/cart.html",
    "/cart.html": "/Page/cart.html",
    "/checkout": "/Page/checkout.html",
    "/checkout.html": "/Page/checkout.html",
    "/dashboard": "/Page/dashboard.html",
    "/dashboard.html": "/Page/dashboard.html",
    "/profile": "/Page/profile.html",
    "/profile.html": "/Page/profile.html",
    "/contact": "/Page/contact.html",
    "/contact.html": "/Page/contact.html",
    "/about": "/Page/about.html",
    "/about.html": "/Page/about.html",
    "/delivery-information": "/Page/delivery-information.html",
    "/delivery-information.html": "/Page/delivery-information.html",
    "/gcash-payment": "/Page/gcash-payment.html",
    "/gcash-payment.html": "/Page/gcash-payment.html",
    "/login": "/Page/login.html",
    "/login.html": "/Page/login.html",
    "/register": "/Page/register.html",
    "/register.html": "/Page/register.html",
    "/privacy-policy": "/Page/privacy-policy.html",
    "/privacy-policy.html": "/Page/privacy-policy.html",
    "/terms-conditions": "/Page/terms-conditions.html",
    "/terms-conditions.html": "/Page/terms-conditions.html"
  };

  // For static assets: cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(response => {
          // Cache successful responses
          if (response && response.status === 200) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, clonedResponse);
            });
          }
          return response;
        });
      })
      .catch(err => {
        console.log('Fetch failed:', err);
        // Return the matching offline page for direct browser routes.
        if (event.request.destination === 'document') {
          return caches.match(documentFallbacks[requestPath] || '/Page/index.html');
        }
        return new Response('Network request failed', { status: 503 });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
