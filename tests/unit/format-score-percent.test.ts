import { describe, expect, it } from "vitest"
import {
  formatScorePercent,
  scoreBarWidth,
} from "@/lib/vacancies/format-score-percent"

describe("formatScorePercent", () => {
  it("keeps one decimal on the total when requested", () => {
    expect(formatScorePercent(0.897, { forceOneDecimal: true })).toBe("89.7%")
  })

  it("drops a trailing .0 for whole percents", () => {
    expect(formatScorePercent(1)).toBe("100%")
    expect(formatScorePercent(0)).toBe("0%")
    expect(formatScorePercent(0.99)).toBe("99%")
  })

  it("keeps a meaningful tenth", () => {
    expect(formatScorePercent(0.777)).toBe("77.7%")
  })

  it("returns null for missing scores", () => {
    expect(formatScorePercent(null)).toBeNull()
    expect(formatScorePercent("0.9")).toBeNull()
  })
})

describe("scoreBarWidth", () => {
  it("clamps the bar to 0–100", () => {
    expect(scoreBarWidth(0.5)).toBe(50)
    expect(scoreBarWidth(1.4)).toBe(100)
    expect(scoreBarWidth(-0.2)).toBe(0)
    expect(scoreBarWidth(null)).toBe(0)
  })
})
