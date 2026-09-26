/* Navia Academy service worker: offline-first shell with runtime caching. */

const CACHE = "navia-v1"
/**
 * Grammar and speech models live in their own cache. They are tens to hundreds
 * of megabytes against a few hundred kilobytes for the rest of the shell, so
 * they are evicted on an explicit version bump rather than on every service
 * worker update — re-downloading a model to pick up a JavaScript change is the
 * one outcome a learner on a phone cannot afford.
 */
const MODEL_CACHE = "navia-models-v1"
const PERSISTENT_CACHES = new Set([CACHE, MODEL_CACHE])

const PRECACHE = ["/", "/dashboard", "/icon.svg"]
const CDN_AUDIO_RE = /^https?:\/\/[^/]+\/audio\/.*\.mp3$/
/**
 * Model binaries: on the CDN under /models/, or same-origin if self-hosted.
 * `mjs` is here because the ONNX Runtime ESM bundle ships as `ort.*.mjs` and is
 * itself large — and the asset regex below cannot catch it, since `js` does not
 * match `mjs` past the dot. Left out, it would be served network-first.
 */
const MODEL_RE = /\.(onnx|wasm|mjs)$/i

/**
 * Cache writes are best-effort. A model that will not fit in the quota must not
 * take the page down with it, and a failed write has to leave the response the
 * caller asked for untouched — so the copy is dropped and the original returned.
 */
function cachePut(request, response, cacheName) {
  const copy = response.clone()
  return caches
    .open(cacheName)
    .then((cache) => cache.put(request, copy))
    .catch((err) => {
      // QuotaExceededError lands here. The fetch still succeeds for this page;
      // the next visit will re-download, which is the correct degradation.
      console.warn("[sw] cache put failed", cacheName, request.url, err)
    })
}

function cacheFirst(request, cacheName) {
  return caches.match(request, { cacheName }).then((cached) => {
    if (cached) return cached
    return fetch(request).then((res) => {
      if (res && (res.ok || res.type === "opaque")) {
        cachePut(request, res, cacheName)
      }
      return res
    })
  })
}

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
          keys
            .filter((k) => !PERSISTENT_CACHES.has(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)

  // Model binaries are immutable and content-addressed, so a hit is always
  // correct and never needs revalidating. They get their own cache for the
  // eviction reason above, not for a different serving strategy.
  if (MODEL_RE.test(url.pathname)) {
    event.respondWith(cacheFirst(request, MODEL_CACHE))
    return
  }

  // CDN audio files: CacheFirst with long TTL (immutable content-addressed URLs)
  if (CDN_AUDIO_RE.test(url.href)) {
    event.respondWith(cacheFirst(request, CACHE))
    return
  }

  // Static assets: cache-first. Pages: network-first with cache fallback.
  const isAsset = /\.(js|css|woff2?|svg|png|jpg|webp|mp4|json)$/.test(
    url.pathname
  )

  if (isAsset) {
    event.respondWith(cacheFirst(request, CACHE))
  } else {
    event.respondWith(
      fetch(request)
        .then((res) => {
          cachePut(request, res, CACHE)
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
