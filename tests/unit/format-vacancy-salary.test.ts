import { describe, expect, it } from "vitest"

import { formatVacancySalary } from "@/lib/vacancies/format-vacancy-salary"

describe("formatVacancySalary", () => {
  it("formats a bare number as USD", () => {
    expect(formatVacancySalary("650", "en")).toEqual({
      kind: "amount",
      primary: "$650",
      period: null,
    })
  })

  it("formats a range and a monthly period", () => {
    const formatted = formatVacancySalary("US$1,200 - US$1,800 / mes", "en")
    expect(formatted.kind).toBe("amount")
    expect(formatted.primary).toContain("1,200")
    expect(formatted.primary).toContain("1,800")
    expect(formatted.period).toBe("monthly")
  })

  it("keeps non-numeric prose", () => {
    expect(formatVacancySalary("A convenir", "es")).toEqual({
      kind: "text",
      primary: "A convenir",
      period: null,
    })
  })

  it("returns empty for blank values", () => {
    expect(formatVacancySalary("")).toEqual({ kind: "empty", primary: "", period: null })
    expect(formatVacancySalary(null)).toEqual({ kind: "empty", primary: "", period: null })
  })
})
