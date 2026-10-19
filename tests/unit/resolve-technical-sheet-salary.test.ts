import { describe, expect, it } from "vitest"
import { resolveTechnicalSheetSalaryExpectation } from "@/lib/technical-sheet/resolve-technical-sheet-salary"

describe("resolveTechnicalSheetSalaryExpectation", () => {
  it("prefers profileMinSalary over JobPreferences", () => {
    expect(
      resolveTechnicalSheetSalaryExpectation({
        profileMinSalary: 4000,
        candidate: { JobPreferences: { MinSalary: 500 } },
      })
    ).toBe("$4,000 USD")
  })

  it("reads flat MinSalary on candidate", () => {
    expect(
      resolveTechnicalSheetSalaryExpectation({
        candidate: { MinSalary: 2500 },
      })
    ).toBe("$2,500 USD")
  })

  it("reads nested JobPreferences when flat keys are missing", () => {
    expect(
      resolveTechnicalSheetSalaryExpectation({
        candidate: { jobPreferences: { minSalary: 1800 } },
      })
    ).toBe("$1,800 USD")
  })

  it("falls back to application sibling", () => {
    expect(
      resolveTechnicalSheetSalaryExpectation({
        candidate: { firstName: "A" },
        application: { MinSalary: 3100 },
      })
    ).toBe("$3,100 USD")
  })

  it("returns empty when no salary sources exist", () => {
    expect(resolveTechnicalSheetSalaryExpectation({ candidate: {} })).toBe("")
  })
})
