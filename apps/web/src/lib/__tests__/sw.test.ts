/**
 * @jest-environment node
 */
import { describe, it, expect, beforeEach, jest } from "@jest/globals"

/**
 * The service worker is plain JavaScript in `public/`, loaded by the browser and
 * not by the module graph, so it has no imports to lean on and every global it
 * touches has to be stood up here. What is worth pinning down is not the
 * plumbing but the three ways this file used to be wrong: model binaries fell
 * through to the page branch, `activate` swept away the model cache on every
 * update, and a failed cache write surfaced as an unhandled rejection.
 */

type Listener = (event: unknown) => void

const listeners: Record<string, Listener> = {}

const SHELL = "navia-v1"
const MODELS = "navia-models-v1"

let store: Map<string, { cacheName: string; response: Response }>
let putShouldFail: boolean
let fetchImpl: jest.Mock<() => Promise<Response>>

function makeEvent(request: Request) {
  return {
    request,
    respondWith: jest.fn((p: Promise<Response>) => p),
    waitUntil: jest.fn((p: Promise<unknown>) => p),
  }
}

function req(url: string) {
  return new Request(url)
}

beforeEach(async () => {
  store = new Map()
  putShouldFail = false
  fetchImpl = jest.fn(async () => new Response("body", { status: 200 }))

  for (const k of Object.keys(listeners)) delete listeners[k]

  // The Cache API accepts a string or a Request; the worker uses both.
  const keyOf = (r: Request | string) => (typeof r === "string" ? r : r.url)

  const cache = {
    match: jest.fn(async (r: Request | string) => {
      const hit = store.get(keyOf(r))
      return hit ? hit.response : undefined
    }),
    put: jest.fn(async (r: Request, res: Response) => {
      if (putShouldFail) throw new DOMException("quota", "QuotaExceededError")
      store.set(r.url, { cacheName: "unknown", response: res })
    }),
  }
  const cachesStub = {
    open: jest.fn(async (name: string) => cache),
    match: jest.fn(async (r: Request | string) => {
      const hit = store.get(keyOf(r))
      return hit ? hit.response : undefined
    }),
    keys: jest.fn(async () => [SHELL, MODELS, "navia-v0"]),
    delete: jest.fn(async () => true),
  }

  const g = globalThis as unknown as Record<string, unknown>
  g.caches = cachesStub
  g.fetch = fetchImpl
  g.self = {
    addEventListener: (type: string, fn: Listener) => {
      listeners[type] = fn
    },
    skipWaiting: jest.fn(),
    clients: { claim: jest.fn() },
  }

  jest.resetModules()
  // The worker is a classic script the browser evaluates on its own, so it has
  // no exports for the module resolver to find.
  // @ts-expect-error -- not an ES module by design
  await import("../../../public/sw.js")
})

function fireFetch(url: string) {
  const request = req(url)
  const event = makeEvent(request)
  listeners.fetch(event as never)
  return event
}

/** The response promise the worker handed to respondWith. */
function responded(event: ReturnType<typeof makeEvent>): Promise<Response> {
  const calls = (event.respondWith as jest.Mock).mock.calls
  return calls[0][0] as Promise<Response>
}

describe("model binaries", () => {
  it.each([
    "https://cdn.example/models/macbert4csc.onnx",
    "https://cdn.example/models/ort-wasm-simd.wasm",
    "https://cdn.example/models/ORT.NEXT.MJS",
  ])("serves %s without touching the network once cached", async (url) => {
    store.set(url, { cacheName: MODELS, response: new Response("cached") })
    fetchImpl.mockClear()

    const event = fireFetch(url)
    const res = await responded(event)

    expect(await res.text()).toBe("cached")
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("keeps the model cache when the worker activates", async () => {
    const event = makeEvent(req("https://app.test/"))
    listeners.activate(event as never)
    // The listener hands its promise to waitUntil rather than returning it.
    await (event.waitUntil as jest.Mock).mock.calls[0][0]

    const deleted = (caches.delete as jest.Mock).mock.calls.map((c) => c[0])
    expect(deleted).toContain("navia-v0")
    expect(deleted).not.toContain(MODELS)
    expect(deleted).not.toContain(SHELL)
  })
})

describe("cache writes", () => {
  it("still serves the response when the write fails on quota", async () => {
    putShouldFail = true
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {})

    const event = fireFetch("https://cdn.example/models/small.onnx")
    const res = await responded(event)

    expect(res.status).toBe(200)
    expect(await res.text()).toBe("body")
    warn.mockRestore()
  })

  it("sends non-ok responses straight through without caching them", async () => {
    fetchImpl.mockResolvedValueOnce(new Response("nope", { status: 404 }))

    const event = fireFetch("https://cdn.example/models/missing.onnx")
    const res = await responded(event)

    expect(res.status).toBe(404)
    expect(store.size).toBe(0)
  })
})

describe("page requests", () => {
  it("falls back to the dashboard when the network is gone", async () => {
    // The worker asks for "/dashboard" — a scope-relative path, not a full URL.
    store.set("/dashboard", {
      cacheName: SHELL,
      response: new Response("dashboard"),
    })
    fetchImpl.mockRejectedValueOnce(Promise.reject(new Error("offline")))

    const event = fireFetch("https://app.test/progress")
    const res = await responded(event)

    expect(await res.text()).toBe("dashboard")
  })
})
