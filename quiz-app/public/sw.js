// Bump this version whenever the caching strategy changes — the activate
// handler deletes any cache that doesn't match, clearing stale assets.
const CACHE = 'psih-quiz-v2'
const CORE = ['/', '/index.html']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)))
  self.skipWaiting()
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

  const isNavigation =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html')

  if (isNavigation) {
    // Network-first for the page itself: always load the freshest app shell
    // when online (so new deploys appear right away), fall back to cache offline.
    e.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put('/index.html', clone))
          return res
        })
        .catch(() => caches.match(req).then(c => c || caches.match('/index.html')))
    )
    return
  }

  // Stale-while-revalidate for static assets (Vite hashes filenames, so a
  // cached asset is always correct): serve instantly, refresh in background.
  e.respondWith(
    caches.match(req).then(cached => {
      const fresh = fetch(req).then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(req, clone))
        }
        return res
      }).catch(() => cached)
      return cached || fresh
    })
  )
})
