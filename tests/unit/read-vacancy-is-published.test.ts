import { describe, expect, it } from "vitest"
import { readVacancyIsPublished } from "@/lib/vacancies/read-vacancy-is-published"
import { mapVacancyFromApi } from "@/lib/vacancies/map-vacancy-list-item"

describe("readVacancyIsPublished", () => {
  it("reads camelCase isPublished", () => {
    expect(readVacancyIsPublished({ isPublished: true })).toBe(true)
    expect(readVacancyIsPublished({ isPublished: false })).toBe(false)
  })

  it("reads snake_case is_published", () => {
    expect(readVacancyIsPublished({ is_published: false })).toBe(false)
  })

  it("defaults to true when the flag is missing or the payload is invalid", () => {
    expect(readVacancyIsPublished({ title: "Role" })).toBe(true)
    expect(readVacancyIsPublished(null)).toBe(true)
    expect(readVacancyIsPublished("vac-1")).toBe(true)
    expect(readVacancyIsPublished({ isPublished: null })).toBe(true)
  })
})

describe("mapVacancyFromApi isPublished", () => {
  it("maps isPublished independently from isActive and status", () => {
    const unpublishedOpen = mapVacancyFromApi({
      id: "1",
      title: "A",
      status: "Open",
      isActive: true,
      isPublished: false,
    })
    const publishedClosed = mapVacancyFromApi({
      id: "2",
      title: "B",
      status: "Closed",
      isActive: false,
      is_published: true,
    })

    expect(unpublishedOpen.isPublished).toBe(false)
    expect(unpublishedOpen.isActive).toBe(true)
    expect(unpublishedOpen.status).toBe("activa")
    expect(publishedClosed.isPublished).toBe(true)
    expect(publishedClosed.isActive).toBe(false)
    expect(publishedClosed.status).toBe("cerrada")
  })

  it("defaults to published for legacy payloads", () => {
    expect(mapVacancyFromApi({ id: "3", title: "C" }).isPublished).toBe(true)
  })
})
