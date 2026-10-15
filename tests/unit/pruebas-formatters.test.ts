import { describe, expect, it } from "vitest"

import {
  ASSESSMENT_LIFECYCLE_STATUSES,
  ASSIGNMENT_STATUSES,
  formatDurationMinutes,
  formatMockDate,
  formatScoreRatio,
  formatStatusCode,
} from "@/lib/pruebas/formatters"

describe("pruebas formatters", () => {
  it("formats ISO dates with the given locale", () => {
    const value = formatMockDate("2026-10-13T18:00:00.000Z", "en-US", {
      dateStyle: "medium",
      timeStyle: undefined,
    })
    expect(value).toContain("2026")
  })

  it("formats demo times in UTC so SSR and client match", () => {
    const value = formatMockDate("2026-10-12T09:00:00.000Z", "es")
    expect(value).toMatch(/9:00|09:00/)
  })

  it("returns empty string for invalid dates", () => {
    expect(formatMockDate("not-a-date", "es")).toBe("")
  })

  it("returns whole minutes for duration", () => {
    expect(formatDurationMinutes(45.9)).toBe(45)
    expect(formatDurationMinutes(-3)).toBe(0)
  })

  it("builds a score ratio", () => {
    expect(formatScoreRatio(8, 10)).toEqual({
      score: 8,
      maxScore: 10,
      ratio: 0.8,
    })
    expect(formatScoreRatio(1, 0)).toBeNull()
    expect(formatScoreRatio(undefined, 10)).toBeNull()
  })

  it("keeps status codes as typed identities", () => {
    expect(formatStatusCode("published")).toBe("published")
    expect(formatStatusCode("in_progress")).toBe("in_progress")
  })

  it("separates lifecycle codes from assignment codes", () => {
    expect(ASSESSMENT_LIFECYCLE_STATUSES).toEqual([
      "draft",
      "published",
      "archived",
    ])
    expect(ASSESSMENT_LIFECYCLE_STATUSES).not.toContain("in_progress")
    expect(ASSESSMENT_LIFECYCLE_STATUSES).not.toContain("expired")
    expect(ASSIGNMENT_STATUSES).toContain("in_progress")
    expect(ASSIGNMENT_STATUSES).toContain("expired")
  })
})
