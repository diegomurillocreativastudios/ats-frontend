import { afterEach, describe, expect, it, vi } from "vitest"

import {
  getBundledCountryOptions,
  getBundledStateByCode,
  getBundledStatesOfCountry,
  resetBundledStatesCache,
} from "@/lib/locations/bundled-catalog"

describe("getBundledCountryOptions", () => {
  it("includes El Salvador from the packaged catalog without a remote fetch", () => {
    const rows = getBundledCountryOptions()
    expect(rows.length).toBeGreaterThan(100)
    expect(rows.some((row) => row.iso2 === "SV" && row.label === "El Salvador")).toBe(
      true
    )
  })
})

describe("getBundledStatesOfCountry", () => {
  afterEach(() => {
    resetBundledStatesCache()
    vi.unstubAllGlobals()
  })

  it("reads departments from the same-origin catalog route", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify([
            {
              iso2: "SS",
              name: "San Salvador",
              native: "San Salvador",
              translations: {},
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    )

    const states = await getBundledStatesOfCountry("sv")
    const state = await getBundledStateByCode("SV", "SS")

    expect(states).toHaveLength(1)
    expect(state?.name).toBe("San Salvador")
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/location-catalog\/states\/SV$/),
      expect.objectContaining({ credentials: "same-origin" })
    )
  })

  it("returns an empty list when the catalog request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to parse URL")
      })
    )

    await expect(getBundledStatesOfCountry("DE")).resolves.toEqual([])
  })
})
