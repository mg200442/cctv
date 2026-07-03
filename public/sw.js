// Minimal hand-written service worker — no Workbox/vite-plugin-pwa, same
// "avoid a new dependency for something this small" approach as the rest of
// the server (ffmpeg-static, native fetch/FormData for Telegram, etc.).
// Registered only in production builds — see src/main.tsx.
const CACHE_NAME = 'sentinel-ops-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  )
  self.clients.claim()
})

// This is a LIVE surveillance dashboard — a cached camera snapshot,
// recording list, or alert feed would be actively misleading (looks current,
// isn't), not just a minor inconvenience like on a typical content site. So
// anything dynamic is explicitly excluded from the cache and always goes to
// the network untouched; only the built app shell (JS/CSS/HTML/icons) gets
// cached, and even that is stale-while-revalidate (serve the cached copy
// immediately if present, but always refetch in the background) rather than
// cache-first, so a deploy is picked up on the very next load instead of
// being stuck on an old cached shell.
const NEVER_CACHE_PREFIXES = [
  '/api/', '/snapshot/', '/stream/', '/recordings/', '/snapshots/', '/detection-frames/',
]

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (NEVER_CACHE_PREFIXES.some(p => url.pathname.startsWith(p))) return // let the browser/network handle it normally

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(request)
      const network = fetch(request)
        .then(res => {
          if (res.ok) cache.put(request, res.clone())
          return res
        })
        .catch(() => cached)
      return cached ?? network
    })
  )
})
