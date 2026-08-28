import { describe, expect, it } from "vitest"
import { countryFlagPngUrl, iso2ToFlagEmoji } from "@/lib/country-flag"

describe("country-flag", () => {
  it("convierte ISO-2 en emoji de bandera", () => {
    expect(iso2ToFlagEmoji("SV")).toBe("🇸🇻")
    expect(iso2ToFlagEmoji("us")).toBe("🇺🇸")
  })

  it("ignora códigos que no son ISO-2", () => {
    expect(iso2ToFlagEmoji("")).toBe("")
    expect(iso2ToFlagEmoji("USA")).toBe("")
  })

  it("arma la URL de bandera en minúsculas", () => {
    expect(countryFlagPngUrl("SV")).toBe("https://flagcdn.com/w40/sv.png")
    expect(countryFlagPngUrl("")).toBeNull()
  })
})
