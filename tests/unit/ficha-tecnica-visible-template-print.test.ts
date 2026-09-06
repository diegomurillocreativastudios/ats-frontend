import { describe, expect, it } from "vitest"
import { DEFAULT_TECHNICAL_SHEET_SCHEMA } from "@/lib/technical-sheet/schema/technical-sheet-default-schema"

describe("default technical sheet schema", () => {
  it("keeps the article sections used by the paginated preview shell", () => {
    const titles = DEFAULT_TECHNICAL_SHEET_SCHEMA.sections.map((section) => section.title)
    expect(titles).toContain("Experiencia laboral")
    expect(titles).toContain("Educación")
    expect(titles).toContain("Información adicional")
    expect(DEFAULT_TECHNICAL_SHEET_SCHEMA.kind).toBe("technical-sheet")
  })

  it("includes experience bindings for long profiles", () => {
    const work = DEFAULT_TECHNICAL_SHEET_SCHEMA.sections.find(
      (section) => section.type === "repeatCards" && section.rowsBinding === "candidate.workExperience"
    )
    expect(work).toBeTruthy()
    if (work?.type === "repeatCards") {
      expect(work.bullets?.rowsBinding).toBe("responsibilities")
    }
  })

  it("does not include interview notes section", () => {
    const titles = DEFAULT_TECHNICAL_SHEET_SCHEMA.sections.map((section) => section.title)
    expect(titles.join(" ")).not.toContain("entrevista")
    const bindings = JSON.stringify(DEFAULT_TECHNICAL_SHEET_SCHEMA)
    expect(bindings).not.toContain("interviewNotes")
  })
})
