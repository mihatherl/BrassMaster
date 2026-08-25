/**
 * A tombstone for the service worker that used to live here.
 *
 * Until 2026-08-25 the app was served from `/`, and its service worker
 * registered at that scope with the whole app precached and a navigation
 * fallback to its own `index.html`. That registration does not disappear
 * because the deploy changed: **every browser that ever loaded brassmaster.net
 * still has it**, and it would keep answering requests for `/` out of its cache
 * — serving the old app in place of the landing page, indefinitely, with no
 * page left at that scope to update it.
 *
 * Installing a PWA was never needed for this. A single visit registers a worker,
 * so "there are no installed copies" — true, and what made moving the app
 * affordable — does not settle it.
 *
 * So this replaces it: byte-different, therefore installed on the next
 * navigation to `/`, and its only job is to clear the caches, unregister
 * itself, and reload whatever windows it still controls so they land on the
 * real page. The new app registers its own worker under `/app/`, which this
 * never touches — `caches.delete` only reaches this origin's caches by name,
 * and by the time the app's worker fills them again this one is gone.
 *
 * **Keep this file until it is certainly unnecessary**, and note there is no
 * way to know when that is: a browser that has not visited since the move
 * still holds the old worker. It costs a few hundred bytes to leave here.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
      await self.registration.unregister();
      // Windows this worker still controls are showing the old cached app.
      // Navigating them to their own URL fetches the real page from the
      // network, now that nothing is left to intercept it.
      const windows = await self.clients.matchAll({ type: 'window' });
      for (const client of windows) client.navigate(client.url);
    })(),
  );
});
