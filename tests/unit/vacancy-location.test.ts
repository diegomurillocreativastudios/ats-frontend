import { describe, expect, it, vi } from "vitest"
import {
  appendVacancyLocationToPayload,
  buildVacancyLocationLabel,
  formatVacancyLocationLabel,
  normalizeCountryCode,
  normalizeStateCode,
  readVacancyStateCode,
  resolveVacancyStateName,
} from "@/lib/vacancies/vacancy-location"

vi.mock("@countrystatecity/countries-browser", () => ({
  getStateByCode: vi.fn(async (countryCode: string, stateCode: string) => {
    if (countryCode === "SV" && stateCode === "SS") {
      return {
        iso2: "SS",
        name: "San Salvador",
        native: "San Salvador",
        translations: {},
      }
    }
    return null
  }),
}))

describe("vacancy-location", () => {
  it("normalizes ISO country and state codes", () => {
    expect(normalizeCountryCode(" sv ")).toBe("SV")
    expect(normalizeCountryCode("SVA")).toBeNull()
    expect(normalizeStateCode(" ss ")).toBe("SS")
    expect(readVacancyStateCode({ state_code: "us-ca" })).toBe("US-CA")
  })

  it("formats sync location labels as country, state", () => {
    expect(
      formatVacancyLocationLabel({
        countryLabel: "El Salvador",
        stateName: "San Salvador",
      })
    ).toBe("El Salvador, San Salvador")

    expect(
      formatVacancyLocationLabel({
        countryLabel: "Honduras",
        countryCode: "HN",
        stateCode: "08",
      })
    ).toBe("Honduras")

    expect(
      formatVacancyLocationLabel({
        countryLabel: "México",
      })
    ).toBe("México")
  })

  it("appends country and state codes to recruiter payloads", () => {
    const payload: Record<string, unknown> = { title: "Dev" }
    appendVacancyLocationToPayload(payload, { countryCode: "sv", stateCode: "ss" })
    expect(payload).toEqual({
      title: "Dev",
      countryCode: "SV",
      stateCode: "SS",
    })
  })

  it("clears location when country is empty", () => {
    const payload: Record<string, unknown> = {}
    appendVacancyLocationToPayload(payload, { countryCode: "", stateCode: "SS" })
    expect(payload).toEqual({ countryCode: "", stateCode: null })
  })

  it("resolves state names through the countries-browser helper", async () => {
    await expect(resolveVacancyStateName("SV", "SS")).resolves.toBe("San Salvador")
    await expect(buildVacancyLocationLabel({
      countryCode: "SV",
      stateCode: "SS",
      countryLabel: "El Salvador",
    })).resolves.toBe("El Salvador, San Salvador")
  })
})
