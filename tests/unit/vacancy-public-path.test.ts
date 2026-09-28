import { describe, expect, it } from "vitest"
import {
  buildPublicVacancyAbsoluteUrl,
  buildPublicVacancyPath,
  buildRecruiterVacancyPath,
  isVacancyGuid,
  isVacancyPublicLinkShareable,
  readPublicSlug,
  vacancyPathSegment,
} from "@/lib/vacancies/vacancy-public-path"

describe("isVacancyGuid", () => {
  it("accepts standard Guids", () => {
    expect(isVacancyGuid("1d2f9cbe-9079-4794-8569-eff14f0f8943")).toBe(true)
    expect(isVacancyGuid("AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE")).toBe(true)
  })

  it("rejects public slugs and empty values", () => {
    expect(isVacancyGuid("aoj-9920")).toBe(false)
    expect(isVacancyGuid("asistente-de-operaciones-junior-9920")).toBe(false)
    expect(isVacancyGuid("")).toBe(false)
    expect(isVacancyGuid(null)).toBe(false)
    expect(isVacancyGuid("1d2f9cbe")).toBe(false)
  })
})

describe("readPublicSlug", () => {
  it("reads camelCase and snake_case from records", () => {
    expect(readPublicSlug({ publicSlug: "aoj-9920" })).toBe(
      "aoj-9920"
    )
    expect(readPublicSlug({ public_slug: "aoj-9920" })).toBe(
      "aoj-9920"
    )
  })

  it("returns null for missing or blank values", () => {
    expect(readPublicSlug(null)).toBeNull()
    expect(readPublicSlug({ publicSlug: "  " })).toBeNull()
    expect(readPublicSlug({ id: "vac-1" })).toBeNull()
  })
})

describe("vacancyPathSegment", () => {
  it("prefers publicSlug over id", () => {
    expect(
      vacancyPathSegment({
        id: "1d2f9cbe-9079-4794-8569-eff14f0f8943",
        publicSlug: "aoj-9920",
      })
    ).toBe("aoj-9920")
  })

  it("falls back to id when publicSlug is null", () => {
    expect(
      vacancyPathSegment({
        id: "1d2f9cbe-9079-4794-8569-eff14f0f8943",
        publicSlug: null,
      })
    ).toBe("1d2f9cbe-9079-4794-8569-eff14f0f8943")
  })
})

describe("buildRecruiterVacancyPath / buildPublicVacancyPath", () => {
  it("builds recruiter paths with optional suffix", () => {
    expect(
      buildRecruiterVacancyPath({
        id: "vac-1",
        publicSlug: "aoj-9920",
      })
    ).toBe("/portal-rrhh/vacantes/aoj-9920")
    expect(
      buildRecruiterVacancyPath(
        { id: "vac-1", publicSlug: "aoj-9920" },
        "resultados"
      )
    ).toBe("/portal-rrhh/vacantes/aoj-9920/resultados")
  })

  it("builds public paths falling back to Guid", () => {
    expect(
      buildPublicVacancyPath({
        id: "1d2f9cbe-9079-4794-8569-eff14f0f8943",
        publicSlug: null,
      })
    ).toBe(
      "/portal-oportunidades/1d2f9cbe-9079-4794-8569-eff14f0f8943"
    )
    expect(
      buildPublicVacancyPath(
        { id: "vac-1", publicSlug: "aoj-9920" },
        "aplicar"
      )
    ).toBe("/portal-oportunidades/aoj-9920/aplicar")
  })
})

describe("buildPublicVacancyAbsoluteUrl", () => {
  it("joins origin and public path without query or aplicar", () => {
    expect(
      buildPublicVacancyAbsoluteUrl(
        { id: "vac-1", publicSlug: "aoj-9920" },
        "https://app.example.com"
      )
    ).toBe("https://app.example.com/portal-oportunidades/aoj-9920")
  })

  it("strips trailing slash from origin", () => {
    expect(
      buildPublicVacancyAbsoluteUrl(
        { id: "vac-1", publicSlug: null },
        "https://app.example.com/"
      )
    ).toBe("https://app.example.com/portal-oportunidades/vac-1")
  })
})

describe("isVacancyPublicLinkShareable", () => {
  it("allows open/activa and active vacancies", () => {
    expect(
      isVacancyPublicLinkShareable({ status: "open", isActive: true })
    ).toBe(true)
    expect(
      isVacancyPublicLinkShareable({ status: "activa", isActive: true })
    ).toBe(true)
    expect(
      isVacancyPublicLinkShareable({ status: "Open", is_active: true })
    ).toBe(true)
  })

  it("rejects closed, paused, draft, or inactive vacancies", () => {
    expect(
      isVacancyPublicLinkShareable({ status: "closed", isActive: true })
    ).toBe(false)
    expect(
      isVacancyPublicLinkShareable({ status: "pausada", isActive: true })
    ).toBe(false)
    expect(
      isVacancyPublicLinkShareable({ status: "borrador", isActive: true })
    ).toBe(false)
    expect(
      isVacancyPublicLinkShareable({ status: "open", isActive: false })
    ).toBe(false)
    expect(isVacancyPublicLinkShareable(null)).toBe(false)
  })
})
