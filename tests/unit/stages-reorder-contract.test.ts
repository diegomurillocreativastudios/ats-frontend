import { describe, expect, it, vi } from "vitest"
import { arrayMove } from "@dnd-kit/sortable"

/**
 * FE-SEC-017: stages reorder contract used by SortableStagesList → handleReorder.
 */
describe("FE-SEC-017 stages reorder contract", () => {
  it("reassigns orderIndex 1..n after a drag move", () => {
    const stages = [
      { id: "a", name: "Applied", orderIndex: 1 },
      { id: "b", name: "Screen", orderIndex: 2 },
      { id: "c", name: "Offer", orderIndex: 3 },
    ]

    const moved = arrayMove(stages, 0, 2)
    const reindexed = moved.map((stage, index) => ({
      ...stage,
      orderIndex: index + 1,
    }))

    expect(reindexed.map((s) => s.id)).toEqual(["b", "c", "a"])
    expect(reindexed.map((s) => s.orderIndex)).toEqual([1, 2, 3])
  })

  it("persists stages sequentially with the reindexed payload", async () => {
    const put = vi.fn().mockResolvedValue({})
    const stages = [
      { id: "b", name: "Screen", orderIndex: 1 },
      { id: "a", name: "Applied", orderIndex: 2 },
    ]

    for (const stage of stages) {
      await put(`/api/recruiter/stages/${stage.id}`, {
        id: stage.id,
        orderIndex: stage.orderIndex,
      })
    }

    expect(put).toHaveBeenCalledTimes(2)
    expect(put.mock.calls[0]?.[0]).toBe("/api/recruiter/stages/b")
    expect(put.mock.calls[0]?.[1]).toMatchObject({ orderIndex: 1 })
    expect(put.mock.calls[1]?.[0]).toBe("/api/recruiter/stages/a")
    expect(put.mock.calls[1]?.[1]).toMatchObject({ orderIndex: 2 })
  })
})
