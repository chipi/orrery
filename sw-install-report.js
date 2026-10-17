/**
 * sw-install-report.js — tell open pages WHY a service-worker install failed (#588).
 *
 * Injected into the workbox `generateSW` service worker via `workbox.importScripts`
 * (vite.config.ts), which runs before workbox registers its own install listener.
 * Workbox's precache rejects the install promise on a failed fetch / quota error and
 * the SW goes `redundant`; the page only ever saw that state change, never the cause
 * (Umami `sw-install-failed`, 14 events in 30 days, no reason). This wraps the install
 * event's waitUntil so a rejected install promise is posted to every window client as
 * { type: 'orrery-sw-install-error', name, message }. It never changes the outcome.
 */
self.addEventListener('install', (event) => {
  const waitUntil = event.waitUntil.bind(event);
  event.waitUntil = (promise) => {
    waitUntil(promise);
    Promise.resolve(promise).catch((err) => {
      const detail = {
        type: 'orrery-sw-install-error',
        name: String((err && err.name) || 'Error').slice(0, 80),
        message: String((err && err.message) || err).slice(0, 300),
      };
      self.clients
        .matchAll({ includeUncontrolled: true, type: 'window' })
        .then((clients) => clients.forEach((client) => client.postMessage(detail)))
        .catch(() => {});
    });
  };
});
