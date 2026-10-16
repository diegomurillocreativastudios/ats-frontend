import { describe, expect, it } from "vitest"
import { formatTechnicalSheetSalaryExpectation } from "@/lib/technical-sheet/format-technical-sheet-salary"

describe("formatTechnicalSheetSalaryExpectation", () => {
  it("formats numbers as $X,XXX USD", () => {
    expect(formatTechnicalSheetSalaryExpectation(2500)).toBe("$2,500 USD")
    expect(formatTechnicalSheetSalaryExpectation(3000)).toBe("$3,000 USD")
  })

  it("formats numeric strings", () => {
    expect(formatTechnicalSheetSalaryExpectation("2500")).toBe("$2,500 USD")
    expect(formatTechnicalSheetSalaryExpectation("2,500")).toBe("$2,500 USD")
  })

  it("is idempotent when already formatted", () => {
    expect(formatTechnicalSheetSalaryExpectation("$2,500 USD")).toBe("$2,500 USD")
  })

  it("returns empty for missing values", () => {
    expect(formatTechnicalSheetSalaryExpectation(null)).toBe("")
    expect(formatTechnicalSheetSalaryExpectation(undefined)).toBe("")
    expect(formatTechnicalSheetSalaryExpectation("")).toBe("")
  })
})
