import { describe, expect, it } from "vitest"
import { readVacancyIsActive } from "@/lib/vacancies/read-vacancy-is-active"
import { mapVacancyFromApi } from "@/lib/vacancies/map-vacancy-list-item"

describe("readVacancyIsActive", () => {
  it("returns true when isActive is true", () => {
    expect(readVacancyIsActive({ isActive: true })).toBe(true)
  })

  it("returns false when isActive is false", () => {
    expect(readVacancyIsActive({ isActive: false })).toBe(false)
  })

  it("reads snake_case is_active", () => {
    expect(readVacancyIsActive({ is_active: false })).toBe(false)
  })

  it("defaults to true when flag is missing", () => {
    expect(readVacancyIsActive({ title: "Role" })).toBe(true)
    expect(readVacancyIsActive(null)).toBe(true)
  })
})

describe("mapVacancyFromApi isActive", () => {
  it("maps isActive from API payload", () => {
    const active = mapVacancyFromApi({ id: "1", title: "A", isActive: true })
    const inactive = mapVacancyFromApi({ id: "2", title: "B", isActive: false })

    expect(active.isActive).toBe(true)
    expect(inactive.isActive).toBe(false)
  })
})
