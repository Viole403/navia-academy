import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  enqueue,
  drain,
  getPendingCount,
  reviewWithQueue,
  logStudyWithQueue,
} from "../offlineQueue"

describe("offlineQueue", () => {
  beforeEach(async () => {
    await AsyncStorage.removeItem("navia.outbox.v1")
  })

  describe("enqueue + getPendingCount", () => {
    it("increments pending count", async () => {
      await enqueue({
        kind: "srs.review",
        body: { item_id: "w1", kind: "word", grade: 2 },
      })
      expect(await getPendingCount()).toBe(1)
    })

    it("accumulates multiple ops", async () => {
      await enqueue({
        kind: "srs.review",
        body: { item_id: "w1", kind: "word", grade: 1 },
      })
      await enqueue({ kind: "study.session", body: { minutes: 5, xp: 10 } })
      expect(await getPendingCount()).toBe(2)
    })
  })

  describe("drain", () => {
    it("returns flushed=0 when empty", async () => {
      const result = await drain()
      expect(result.flushed).toBe(0)
      expect(result.remained).toBe(0)
    })
  })

  describe("reviewWithQueue", () => {
    it("returns offline=true when network fails", async () => {
      // Without mocking progress.review, it will throw → offline fallback kicks in
      const result = await reviewWithQueue("w99", "word", 3)
      expect(result.ok).toBe(true)
      expect(result.offline).toBe(true)
    })
  })

  describe("logStudyWithQueue", () => {
    it("returns offline=true when network fails", async () => {
      const result = await logStudyWithQueue(10, 25)
      expect(result.ok).toBe(true)
      expect(result.offline).toBe(true)
    })
  })
})
