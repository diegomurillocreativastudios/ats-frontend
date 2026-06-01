import { describe, expect, it } from "vitest"
import {
  findTechnicalSheetDocumentTemplate,
  mapTemplatesList,
  unwrapTemplatesResponse,
  type TemplateListItem,
} from "@/lib/templates/technical-sheet-template"

describe("unwrapTemplatesResponse", () => {
  it("returns the array when the body is already a list", () => {
    expect(unwrapTemplatesResponse([{ id: 1 }])).toEqual([{ id: 1 }])
  })

  it("unwraps templates, items, and data keys", () => {
    const row = { id: 1, type: "Document" }
    expect(unwrapTemplatesResponse({ templates: [row] })).toEqual([row])
    expect(unwrapTemplatesResponse({ items: [row] })).toEqual([row])
    expect(unwrapTemplatesResponse({ data: [row] })).toEqual([row])
  })

  it("returns empty array for invalid shapes", () => {
    expect(unwrapTemplatesResponse(null)).toEqual([])
    expect(unwrapTemplatesResponse({})).toEqual([])
    expect(unwrapTemplatesResponse({ templates: {} })).toEqual([])
  })
})

describe("findTechnicalSheetDocumentTemplate", () => {
  it("returns null for empty list", () => {
    expect(findTechnicalSheetDocumentTemplate([])).toBeNull()
  })

  it("returns null when no Document with isTechnicalSheet", () => {
    const items: TemplateListItem[] = [
      { id: 1, type: "Notification", name: "A", contentTemplate: "", isTechnicalSheet: false, isReport: false },
      { id: 2, type: "Document", name: "B", contentTemplate: "<p>x</p>", isTechnicalSheet: false, isReport: false },
    ]
    expect(findTechnicalSheetDocumentTemplate(items)).toBeNull()
  })

  it("returns the only matching Document", () => {
    const items: TemplateListItem[] = [
      { id: 1, type: "Document", name: "FT", contentTemplate: "<h1>Hi</h1>", isTechnicalSheet: true, isReport: false },
    ]
    const found = findTechnicalSheetDocumentTemplate(items)
    expect(found?.id).toBe(1)
    expect(found?.contentTemplate).toBe("<h1>Hi</h1>")
  })

  it("matches document type case-insensitively", () => {
    const items: TemplateListItem[] = [
      { id: 1, type: "document", name: "FT", contentTemplate: "<p>a</p>", isTechnicalSheet: true, isReport: false },
    ]
    expect(findTechnicalSheetDocumentTemplate(items)?.id).toBe(1)
  })

  it("prefers name containing ficha when multiple matches", () => {
    const items: TemplateListItem[] = [
      { id: 1, type: "Document", name: "Otro doc", contentTemplate: "<p>1</p>", isTechnicalSheet: true, isReport: false },
      { id: 2, type: "Document", name: "Ficha técnica CV", contentTemplate: "<p>2</p>", isTechnicalSheet: true, isReport: false },
    ]
    expect(findTechnicalSheetDocumentTemplate(items)?.id).toBe(2)
  })

  it("uses id then name when ficha preference ties", () => {
    const items: TemplateListItem[] = [
      { id: 10, type: "Document", name: "B", contentTemplate: "<p>b</p>", isTechnicalSheet: true, isReport: false },
      { id: 2, type: "Document", name: "A", contentTemplate: "<p>a</p>", isTechnicalSheet: true, isReport: false },
    ]
    expect(findTechnicalSheetDocumentTemplate(items)?.id).toBe(2)
  })
})

describe("mapTemplatesList", () => {
  it("maps API rows to TemplateListItem", () => {
    const raw = [
      {
        id: "x-1",
        type: "Document",
        name: "N",
        contentTemplate: "<p>z</p>",
        isTechnicalSheet: true,
        isReport: false,
      },
    ]
    expect(mapTemplatesList(raw)).toEqual([
      {
        id: "x-1",
        type: "Document",
        name: "N",
        contentTemplate: "<p>z</p>",
        isTechnicalSheet: true,
        isReport: false,
      },
    ])
  })
})
