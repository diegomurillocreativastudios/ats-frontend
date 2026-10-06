import { describe, expect, it } from "vitest"
import {
  EU_COUNTRY_CODES,
  normalizeDataProtectionLawIds,
  sameDataProtectionLawIds,
  suggestDataProtectionLawIds,
} from "@/lib/vacancies/data-protection-law-suggestion"

const laws = [
  { id: "sv-1", jurisdictionCode: "SV", isActive: true },
  { id: "sv-off", jurisdictionCode: "sv", isActive: false },
  { id: "eu-1", jurisdictionCode: "EU", isActive: true },
  { id: "eu-2", jurisdictionCode: "eu", isActive: true },
]

describe("suggestDataProtectionLawIds", () => {
  it("covers the 27 European Union member states", () => {
    expect(EU_COUNTRY_CODES).toHaveLength(27)
  })

  it("suggests the active El Salvador law for SV", () => {
    expect(suggestDataProtectionLawIds("sv", laws)).toEqual(["sv-1"])
  })

  it("suggests active European Union laws for a member state", () => {
    expect(suggestDataProtectionLawIds("DE", laws)).toEqual(["eu-1", "eu-2"])
  })

  it("suggests nothing for a country outside those jurisdictions", () => {
    expect(suggestDataProtectionLawIds("US", laws)).toEqual([])
    expect(suggestDataProtectionLawIds("", laws)).toEqual([])
  })
})

describe("normalizeDataProtectionLawIds", () => {
  it("drops blanks and duplicates", () => {
    expect(normalizeDataProtectionLawIds([" a ", "a", "", "b"])).toEqual(["a", "b"])
  })

  it("treats a missing list as empty", () => {
    expect(normalizeDataProtectionLawIds(undefined)).toEqual([])
    expect(normalizeDataProtectionLawIds(null)).toEqual([])
  })

  it("treats the same identifiers as equal regardless of order", () => {
    expect(sameDataProtectionLawIds(["b", "a"], ["a", "b"])).toBe(true)
    expect(sameDataProtectionLawIds(["a"], ["a", "b"])).toBe(false)
  })
})
