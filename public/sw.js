/* Retired. The old Fluidz app used to install a service worker here; this version removes it.
   On install it takes over, then clears every cache, unregisters itself and reloads open tabs, so visitors who had the old app cached get the current site. */
self.addEventListener('install', function () { self.skipWaiting() })
self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    try { var keys = await caches.keys(); await Promise.all(keys.map(function (k) { return caches.delete(k) })) } catch (e) {}
    try { await self.registration.unregister() } catch (e) {}
    try {
      var cl = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      cl.forEach(function (c) { try { c.navigate(c.url) } catch (e) {} })
    } catch (e) {}
  })())
})
