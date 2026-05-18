import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  findReportDocumentTemplate,
  findReportDocumentTemplateById,
  filterReportDocumentTemplates,
  mapTemplatesList,
  sortReportDocumentTemplates,
  fetchTemplateById,
  type TemplateListItem,
} from "@/lib/templates/technical-sheet-template"
import { apiClient } from "@/lib/api"

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

describe("filterReportDocumentTemplates", () => {
  it("returns only Document rows with isReport true", () => {
    const items: TemplateListItem[] = [
      { id: 1, type: "Document", name: "R", contentTemplate: "", isTechnicalSheet: false, isReport: true },
      { id: 2, type: "Document", name: "D", contentTemplate: "", isTechnicalSheet: false, isReport: false },
      { id: 3, type: "Notification", name: "N", contentTemplate: "", isTechnicalSheet: false, isReport: true },
    ]
    expect(filterReportDocumentTemplates(items).map((t) => t.id)).toEqual([1])
  })
})

describe("findReportDocumentTemplate", () => {
  it("returns null when no Document with isReport", () => {
    const items: TemplateListItem[] = [
      { id: 1, type: "Document", name: "A", contentTemplate: "", isTechnicalSheet: false, isReport: false },
    ]
    expect(findReportDocumentTemplate(items)).toBeNull()
  })

  it("returns the only matching Document", () => {
    const items: TemplateListItem[] = [
      { id: 5, type: "Document", name: "Reporte mensual", contentTemplate: "<h1>R</h1>", isTechnicalSheet: false, isReport: true },
    ]
    expect(findReportDocumentTemplate(items)?.id).toBe(5)
  })

  it("prefers name containing reporte when multiple matches", () => {
    const items: TemplateListItem[] = [
      { id: 1, type: "Document", name: "Otro doc", contentTemplate: "", isTechnicalSheet: false, isReport: true },
      { id: 2, type: "Document", name: "Reporte ejecutivo", contentTemplate: "", isTechnicalSheet: false, isReport: true },
    ]
    expect(findReportDocumentTemplate(items)?.id).toBe(2)
  })
})

describe("mapTemplatesList isReport", () => {
  it("maps isReport from API rows", () => {
    const raw = [{ id: 1, type: "Document", name: "R", contentTemplate: "<p>x</p>", isReport: true }]
    expect(mapTemplatesList(raw)[0]?.isReport).toBe(true)
  })

  it("defaults isReport to false when absent", () => {
    const raw = [{ id: 1, type: "Document", name: "R", contentTemplate: "<p>x</p>" }]
    expect(mapTemplatesList(raw)[0]?.isReport).toBe(false)
  })

  it("maps slug from API rows", () => {
    const raw = [
      {
        id: 1,
        type: "Document",
        name: "R",
        contentTemplate: "<p>x</p>",
        isReport: true,
        slug: "reporte-ejecutivo",
      },
    ]
    expect(mapTemplatesList(raw)[0]?.slug).toBe("reporte-ejecutivo")
  })

  it("maps outputFormat from API rows", () => {
    const raw = [
      {
        id: 1,
        type: "Document",
        name: "R",
        contentTemplate: "",
        isReport: true,
        outputFormat: "PDF",
      },
    ]
    expect(mapTemplatesList(raw)[0]?.outputFormat).toBe("PDF")
  })
})

describe("sortReportDocumentTemplates", () => {
  it("sorts by name then id", () => {
    const items: TemplateListItem[] = [
      { id: 10, type: "Document", name: "Zeta", contentTemplate: "", isTechnicalSheet: false, isReport: true },
      { id: 2, type: "Document", name: "Alpha", contentTemplate: "", isTechnicalSheet: false, isReport: true },
      { id: 5, type: "Document", name: "Alpha", contentTemplate: "", isTechnicalSheet: false, isReport: true },
    ]
    expect(sortReportDocumentTemplates(items).map((t) => t.id)).toEqual([2, 5, 10])
  })
})

describe("findReportDocumentTemplateById", () => {
  const reportDoc: TemplateListItem = {
    id: 7,
    type: "Document",
    name: "Reporte",
    contentTemplate: "",
    isTechnicalSheet: false,
    isReport: true,
  }

  it("returns match for valid report document", () => {
    expect(findReportDocumentTemplateById([reportDoc], 7)?.id).toBe(7)
    expect(findReportDocumentTemplateById([reportDoc], "7")?.id).toBe(7)
  })

  it("returns null when id does not exist", () => {
    expect(findReportDocumentTemplateById([reportDoc], 99)).toBeNull()
  })

  it("returns null when id exists but isReport is false", () => {
    const items: TemplateListItem[] = [
      { id: 7, type: "Document", name: "Doc", contentTemplate: "", isTechnicalSheet: false, isReport: false },
    ]
    expect(findReportDocumentTemplateById(items, 7)).toBeNull()
  })

  it("returns null when id exists but type is not document", () => {
    const items: TemplateListItem[] = [
      { id: 7, type: "Notification", name: "N", contentTemplate: "", isTechnicalSheet: false, isReport: true },
    ]
    expect(findReportDocumentTemplateById(items, 7)).toBeNull()
  })
})

describe("fetchTemplateById", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
  })

  it("returns mapped report document from GET by id", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      id: 3,
      type: "Document",
      name: "Reporte mensual",
      contentTemplate: "<p>x</p>",
      isReport: true,
      outputFormat: "PDF",
    })
    const result = await fetchTemplateById(3)
    expect(apiClient.get).toHaveBeenCalledWith("/api/Templates/3")
    expect(result?.id).toBe(3)
    expect(result?.isReport).toBe(true)
    expect(result?.outputFormat).toBe("PDF")
  })

  it("returns null when GET by id returns non-report document", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      id: 3,
      type: "Document",
      name: "Ficha",
      contentTemplate: "",
      isTechnicalSheet: true,
      isReport: false,
    })
    const result = await fetchTemplateById(3)
    expect(result).toBeNull()
  })

  it("falls back to list when GET by id fails", async () => {
    vi.mocked(apiClient.get)
      .mockRejectedValueOnce(new Error("not found"))
      .mockResolvedValueOnce([
        { id: 9, type: "Document", name: "R", contentTemplate: "", isReport: true },
      ])
    const result = await fetchTemplateById(9)
    expect(apiClient.get).toHaveBeenNthCalledWith(1, "/api/Templates/9")
    expect(apiClient.get).toHaveBeenNthCalledWith(2, "/api/Templates?type=Document")
    expect(result?.id).toBe(9)
  })
})
