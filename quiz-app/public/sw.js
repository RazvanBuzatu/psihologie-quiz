// Bump this version on any caching change. The activate handler deletes every
// cache that isn't the current one, so bumping purges stale/poisoned entries
// from all devices on their next visit.
const CACHE = 'psih-quiz-v3'

self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE).then(c => c.add('/')).catch(() => {})
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const req = e.request
  if (req.method !== 'GET') return

  // Only handle same-origin requests; let everything else go to the network.
  let url
  try { url = new URL(req.url) } catch { return }
  if (url.origin !== self.location.origin) return

  // Page navigations → network-first: always load the freshest HTML (so new
  // deploys appear immediately and HTML never points at missing assets). Fall
  // back to the cached shell only when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put('/', clone)).catch(() => {})
          return res
        })
        .catch(() => caches.match('/').then(c => c || caches.match(req)))
    )
    return
  }

  // Static assets (Vite hashes filenames, so a cached file is always valid) →
  // cache-first, otherwise network. This NEVER resolves to an empty response:
  // if it's cached we return it; otherwise we return the live network request.
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(req, clone)).catch(() => {})
        }
        return res
      })
      return cached || network
    })
  )
})
