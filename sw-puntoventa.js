// sw-puntoventa.js — Service Worker PuntoVenta v3.0
// P3 ROBUSTEZ: Caja + Ventas offline

const CACHE_NAME = 'puntoventa-v3.1';
// Rutas en la raíz del dominio (puntoventa.raventechsapp.com)
const SHELL = ['/', '/index.html'];
const EXTRA = [
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL).then(() => Promise.all(EXTRA.map(u => cache.add(u).catch(() => {})))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Red primero: siempre trae la versión nueva de la app y usa la copia guardada solo si no hay conexión
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('identitytoolkit.googleapis.com') ||
      url.hostname.includes('securetoken.googleapis.com')) {
    return;
  }
  e.respondWith(
    fetch(e.request).then(response => {
      if (response && response.status === 200 &&
          (url.origin === self.location.origin ||
           url.hostname.includes('googleapis.com') ||
           url.hostname.includes('gstatic.com'))) {
        const clon = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clon));
      }
      return response;
    }).catch(() =>
      caches.match(e.request).then(cached =>
        cached || (e.request.mode === 'navigate' ? caches.match('/index.html') : undefined)
      )
    )
  );
});
