import { describe, expect, it } from "vitest"
import { pickCandidateDisplayRecord } from "@/lib/technical-sheet/candidate-from-payload"
import { paginateTechnicalSheetArticleToPageBodies } from "@/lib/technical-sheet/paginate-technical-sheet-article-dom"
import { DEFAULT_TECHNICAL_SHEET_SCHEMA } from "@/lib/technical-sheet/schema/technical-sheet-default-schema"
import { renderTechnicalSheetSchemaToHtml } from "@/lib/technical-sheet/schema/render-technical-sheet-schema-to-html"
import { buildTechnicalSheetTemplateContext } from "@/lib/technical-sheet/template-interpolate"

describe("ficha template context merge", () => {
  it("merges personal header fields with candidate profile arrays", () => {
    const record = pickCandidateDisplayRecord({
      personal: { firstName: "Diego", lastName: "Murillo", address: "Bogotá" },
      candidate: {
        workExperience: [{ company: "Acme", role: "Dev" }],
        availability: "Inmediata",
        profileSummary: "Senior engineer",
      },
    })
    expect(record).toMatchObject({
      firstName: "Diego",
      lastName: "Murillo",
      address: "Bogotá",
      availability: "Inmediata",
      profileSummary: "Senior engineer",
    })
    expect(record?.workExperience).toEqual([{ company: "Acme", role: "Dev" }])
  })

  it("keeps work experience after schema render when personal and candidate are both present", () => {
    const payload = {
      personal: {
        firstName: "Diego",
        lastName: "Murillo",
        address: "Bogotá",
        englishLevel: "B2",
      },
      candidate: {
        workExperience: [
          {
            company: "Acme",
            role: "Dev",
            startDate: "2020",
            endDate: "2021",
            responsibilities: ["Code"],
          },
        ],
        education: [{ institution: "U", degree: "CS", startDate: "2015", endDate: "2019" }],
        technicalSkills: ["TypeScript"],
        softSkills: ["Leadership"],
        languages: [{ language: "Inglés", level: "B2" }],
        availability: "Inmediata",
        workMode: "Remoto",
        country: "Colombia",
        salaryExpectation: "$5M",
        profileSummary: "Senior engineer",
      },
    }
    const ctx = buildTechnicalSheetTemplateContext(payload)
    const html = renderTechnicalSheetSchemaToHtml(DEFAULT_TECHNICAL_SHEET_SCHEMA, ctx)
    expect(html).toContain("Acme")
    expect(html).toContain("TypeScript")
    expect(html).toContain("Inmediata")
    expect(html).toContain("Senior engineer")
    expect((ctx.header as { address: string }).address).toBe("Bogotá")

    document.body.innerHTML = html
    const article = document.querySelector("article.ts-article")
    expect(article).toBeTruthy()
    const bodies = paginateTechnicalSheetArticleToPageBodies(article, 900)
    expect(bodies.join("")).toContain("Acme")
  })
})
