import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  createAssessmentLink,
  getAssessmentLinkApiErrorCode,
  getAssessmentLinksCatalog,
  normalizeAssessmentLinkRow,
  normalizeAssessmentLinksCatalog,
  resolveAssessmentLinkErrorMessage,
  setAssessmentLinkActive,
} from "@/lib/api/recruiter-assessments-links"
import { apiClient } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const getMock = apiClient.get as ReturnType<typeof vi.fn>
const postMock = apiClient.post as ReturnType<typeof vi.fn>
const patchMock = apiClient.patch as ReturnType<typeof vi.fn>

beforeEach(() => {
  getMock.mockReset()
  postMock.mockReset()
  patchMock.mockReset()
})

describe("normalizeAssessmentLinksCatalog", () => {
  it("maps versions, vacancies and links with linkedAtUtc", () => {
    const catalog = normalizeAssessmentLinksCatalog({
      versions: [
        {
          id: "ver-1",
          testId: "test-tech",
          testTitle: "Análisis de datos",
          versionNumber: 2,
        },
      ],
      vacancies: [
        {
          id: "vac-open",
          title: "Analista de datos",
          companyId: "co-1",
          companyName: "Applican Demo",
          linkable: true,
          unavailableReason: null,
        },
        {
          id: "vac-closed",
          title: "Inventario de almacén",
          companyId: "co-1",
          companyName: "Applican Demo",
          linkable: false,
          unavailableReason: "closed",
        },
      ],
      links: [
        {
          id: "link-1",
          testVersionId: "ver-1",
          testId: "test-tech",
          testTitle: "Análisis de datos",
          versionNumber: 2,
          vacancyId: "vac-open",
          vacancyTitle: "Analista de datos",
          companyId: "co-1",
          companyName: "Applican Demo",
          active: true,
          linkedAtUtc: "2026-10-13T15:00:00Z",
        },
      ],
    })

    expect(catalog.versions).toHaveLength(1)
    expect(catalog.vacancies[1]).toMatchObject({
      id: "vac-closed",
      linkable: false,
      unavailableReason: "closed",
    })
    expect(catalog.links[0]).toMatchObject({
      id: "link-1",
      linkedAt: "2026-10-13T15:00:00Z",
      active: true,
    })
  })

  it("accepts PascalCase and CreatedAtUtc", () => {
    const row = normalizeAssessmentLinkRow({
      Id: "link-2",
      TestVersionId: "ver-1",
      TestId: "test-tech",
      TestTitle: "JS",
      VersionNumber: 1,
      VacancyId: "vac-1",
      VacancyTitle: "Dev",
      CompanyId: "co-1",
      CompanyName: "Demo",
      Active: false,
      CreatedAtUtc: "2026-09-01T00:00:00Z",
    })
    expect(row).toMatchObject({
      id: "link-2",
      active: false,
      linkedAt: "2026-09-01T00:00:00Z",
    })
  })

  it("sorts links by linkedAt descending", () => {
    const catalog = normalizeAssessmentLinksCatalog({
      versions: [],
      vacancies: [],
      links: [
        {
          id: "older",
          testVersionId: "v1",
          testId: "t1",
          testTitle: "A",
          versionNumber: 1,
          vacancyId: "vac",
          vacancyTitle: "V",
          companyId: "c",
          companyName: "C",
          active: true,
          linkedAtUtc: "2026-01-01T00:00:00Z",
        },
        {
          id: "newer",
          testVersionId: "v1",
          testId: "t1",
          testTitle: "A",
          versionNumber: 1,
          vacancyId: "vac",
          vacancyTitle: "V",
          companyId: "c",
          companyName: "C",
          active: false,
          linkedAtUtc: "2026-10-01T00:00:00Z",
        },
      ],
    })
    expect(catalog.links.map((item) => item.id)).toEqual(["newer", "older"])
  })
})

describe("getAssessmentLinkApiErrorCode", () => {
  it("reads snake_case and PascalCase codes", () => {
    expect(
      getAssessmentLinkApiErrorCode({
        body: { code: "duplicate_link", message: "dup" },
      }),
    ).toBe("duplicate_link")
    expect(
      getAssessmentLinkApiErrorCode({
        body: { code: "VacancyClosed", message: "closed" },
      }),
    ).toBe("vacancy_closed")
  })
})

describe("resolveAssessmentLinkErrorMessage", () => {
  it("maps known codes and falls back to API message", () => {
    const t = (key: string) => `t:${key}`
    expect(
      resolveAssessmentLinkErrorMessage(
        { body: { code: "duplicate_link", message: "dup" } },
        t,
      ),
    ).toBe("t:errors.duplicate_link")
    expect(
      resolveAssessmentLinkErrorMessage(
        { body: { code: "mystery", message: "Algo falló" }, status: 422 },
        t,
      ),
    ).toBe("Algo falló")
  })
})

describe("assessment links API calls", () => {
  it("loads the catalog", async () => {
    getMock.mockResolvedValueOnce({
      versions: [],
      vacancies: [],
      links: [],
    })
    const catalog = await getAssessmentLinksCatalog()
    expect(getMock).toHaveBeenCalledWith("/api/recruiter/assessments/links")
    expect(catalog).toEqual({ versions: [], vacancies: [], links: [] })
  })

  it("creates a link", async () => {
    postMock.mockResolvedValueOnce({
      id: "link-new",
      testVersionId: "ver-1",
      testId: "test-tech",
      testTitle: "Análisis",
      versionNumber: 1,
      vacancyId: "vac-1",
      vacancyTitle: "Analista",
      companyId: "co-1",
      companyName: "Demo",
      active: true,
      linkedAtUtc: "2026-10-19T12:00:00Z",
    })
    const link = await createAssessmentLink({
      vacancyId: "vac-1",
      testVersionId: "ver-1",
    })
    expect(postMock).toHaveBeenCalledWith("/api/recruiter/assessments/links", {
      vacancyId: "vac-1",
      testVersionId: "ver-1",
    })
    expect(link.id).toBe("link-new")
    expect(link.active).toBe(true)
  })

  it("patches active", async () => {
    patchMock.mockResolvedValueOnce({
      id: "link-1",
      testVersionId: "ver-1",
      testId: "test-tech",
      testTitle: "Análisis",
      versionNumber: 1,
      vacancyId: "vac-1",
      vacancyTitle: "Analista",
      companyId: "co-1",
      companyName: "Demo",
      active: false,
      linkedAtUtc: "2026-10-13T15:00:00Z",
    })
    const link = await setAssessmentLinkActive("link-1", false)
    expect(patchMock).toHaveBeenCalledWith(
      "/api/recruiter/assessments/links/link-1",
      { active: false },
    )
    expect(link.active).toBe(false)
    expect(link.linkedAt).toBe("2026-10-13T15:00:00Z")
  })
})
