import { describe, expect, it } from "vitest"
import {
  dateInputValueToPresentationDueAtUtc,
  isPresentationDueOverdue,
  presentationDueAtUtcToDateInputValue,
  suggestPresentationDueAtUtc,
} from "@/lib/vacancies/presentation-due-at"

describe("suggestPresentationDueAtUtc", () => {
  it("adds calendar days in UTC from the current UTC day", () => {
    const now = new Date("2026-10-05T15:30:00.000Z")
    const due = suggestPresentationDueAtUtc(3, now)
    expect(due).toBe("2026-10-08T23:59:59.999Z")
  })

  it("rejects non-positive sla days", () => {
    expect(() => suggestPresentationDueAtUtc(0)).toThrow(/slaDays/)
  })
})

describe("date input round-trip", () => {
  it("converts ISO to yyyy-MM-dd and back", () => {
    const input = presentationDueAtUtcToDateInputValue("2026-10-08T23:59:59.999Z")
    expect(input).toBe("2026-10-08")
    expect(dateInputValueToPresentationDueAtUtc(input)).toBe("2026-10-08T23:59:59.999Z")
  })
})

describe("isPresentationDueOverdue", () => {
  it("is true when due is before now", () => {
    const now = new Date("2026-10-09T00:00:00.000Z")
    expect(isPresentationDueOverdue("2026-10-08T23:59:59.999Z", now)).toBe(true)
    expect(isPresentationDueOverdue("2026-10-09T23:59:59.999Z", now)).toBe(false)
  })
})
