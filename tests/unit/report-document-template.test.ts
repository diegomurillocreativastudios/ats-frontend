import { describe, expect, it } from "vitest"
import {
  findReportDocumentTemplate,
  filterReportDocumentTemplates,
  mapTemplatesList,
  type TemplateListItem,
} from "@/lib/templates/technical-sheet-template"

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
})
