/* Navia Academy service worker: offline-first shell with runtime caching. */

const CACHE = "navia-v1"
const PRECACHE = ["/", "/dashboard", "/icon.svg"]
const CDN_AUDIO_RE = /^https?:\/\/[^/]+\/audio\/.*\.mp3$/

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)

  // CDN audio files: CacheFirst with long TTL (immutable content-addressed URLs)
  if (CDN_AUDIO_RE.test(url.href)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
            return res
          })
      )
    )
    return
  }

  // Static assets: cache-first. Pages: network-first with cache fallback.
  const isAsset = /\.(js|css|woff2?|svg|png|jpg|webp|mp4|json)$/.test(
    url.pathname
  )

  if (isAsset) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
            return res
          })
      )
    )
  } else {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
          return res
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/dashboard"))
        )
    )
  }
})
