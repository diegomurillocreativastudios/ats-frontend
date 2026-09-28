import { describe, expect, it } from "vitest"

import { getBundledPhoneCountryRows } from "@/lib/phone-countries-data"

describe("getBundledPhoneCountryRows", () => {
  it("includes El Salvador calling code from the packaged catalog", () => {
    const rows = getBundledPhoneCountryRows()
    expect(rows.length).toBeGreaterThan(100)
    expect(rows.some((row) => row.iso2 === "SV" && row.phonecode.includes("503"))).toBe(
      true
    )
  })
})
