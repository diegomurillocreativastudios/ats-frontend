import { describe, it, expect, vi } from "vitest"
import {
  runVacancyPreliminaryMatchBatch,
  type VacancyPreliminaryMatchBatchProgress,
} from "@/lib/rrhh/run-vacancy-preliminary-match-batch"

describe("runVacancyPreliminaryMatchBatch", () => {
  it("returns empty result when there are no items", async () => {
    const matchOne = vi.fn()
    const onProgress = vi.fn()

    const result = await runVacancyPreliminaryMatchBatch({
      items: [],
      matchOne,
      onProgress,
    })

    expect(result).toEqual({ succeeded: 0, failed: [], total: 0 })
    expect(matchOne).not.toHaveBeenCalled()
    expect(onProgress).not.toHaveBeenCalled()
  })

  it("processes candidates sequentially with a new cycleKey each time", async () => {
    const order: string[] = []
    const matchOne = vi.fn(async (documentId: string) => {
      order.push(documentId)
    })
    const progressEvents: VacancyPreliminaryMatchBatchProgress[] = []
    let keyCounter = 0

    const result = await runVacancyPreliminaryMatchBatch({
      items: [
        { documentId: "doc-a", displayName: "Ana" },
        { documentId: "doc-b", displayName: "Bruno" },
      ],
      matchOne,
      onProgress: (progress) => {
        progressEvents.push(progress)
      },
      createCycleKey: () => `cycle-${++keyCounter}`,
      sleep: async () => undefined,
    })

    expect(order).toEqual(["doc-a", "doc-b"])
    expect(matchOne).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ succeeded: 2, failed: [], total: 2 })

    expect(progressEvents[0]).toMatchObject({
      cycleKey: "cycle-1",
      batchIndex: 1,
      batchTotal: 2,
      documentId: "doc-a",
      displayName: "Ana",
      isCompleted: false,
    })
    expect(progressEvents[1]).toMatchObject({
      cycleKey: "cycle-2",
      batchIndex: 2,
      batchTotal: 2,
      documentId: "doc-b",
      displayName: "Bruno",
      isCompleted: false,
    })
    expect(progressEvents[2]).toMatchObject({
      cycleKey: "cycle-2",
      batchIndex: 2,
      isCompleted: true,
    })
  })

  it("continues after a failure and reports partial results", async () => {
    const matchOne = vi.fn(async (documentId: string) => {
      if (documentId === "doc-b") {
        throw new Error("match failed for B")
      }
    })
    const progressEvents: VacancyPreliminaryMatchBatchProgress[] = []
    let keyCounter = 0

    const result = await runVacancyPreliminaryMatchBatch({
      items: [
        { documentId: "doc-a", displayName: "Ana" },
        { documentId: "doc-b", displayName: "Bruno" },
        { documentId: "doc-c", displayName: "Carla" },
      ],
      matchOne,
      onProgress: (progress) => {
        progressEvents.push(progress)
      },
      createCycleKey: () => `k-${++keyCounter}`,
      sleep: async () => undefined,
    })

    expect(matchOne).toHaveBeenCalledTimes(3)
    expect(result.succeeded).toBe(2)
    expect(result.total).toBe(3)
    expect(result.failed).toEqual([
      {
        documentId: "doc-b",
        displayName: "Bruno",
        message: "match failed for B",
      },
    ])

    const completedEvents = progressEvents.filter((event) => event.isCompleted)
    expect(completedEvents).toHaveLength(1)
    expect(completedEvents[0]?.documentId).toBe("doc-c")
  })

  it("does not mark completed when the last candidate fails", async () => {
    const matchOne = vi.fn(async (documentId: string) => {
      if (documentId === "doc-b") {
        throw { message: "boom" }
      }
    })
    const progressEvents: VacancyPreliminaryMatchBatchProgress[] = []

    const result = await runVacancyPreliminaryMatchBatch({
      items: [
        { documentId: "doc-a", displayName: "Ana" },
        { documentId: "doc-b", displayName: "Bruno" },
      ],
      matchOne,
      onProgress: (progress) => {
        progressEvents.push(progress)
      },
      createCycleKey: () => "fixed-key",
      sleep: async () => undefined,
    })

    expect(result.succeeded).toBe(1)
    expect(result.failed).toHaveLength(1)
    expect(progressEvents.every((event) => !event.isCompleted)).toBe(true)
  })
})
