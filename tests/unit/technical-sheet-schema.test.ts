import { describe, expect, it } from "vitest"
import { buildTechnicalSheetTemplateContext } from "@/lib/technical-sheet/template-interpolate"
import { DEFAULT_TECHNICAL_SHEET_SCHEMA } from "@/lib/technical-sheet/schema/technical-sheet-default-schema"
import { renderTechnicalSheetSchemaToHtml } from "@/lib/technical-sheet/schema/render-technical-sheet-schema-to-html"
import {
  resolveTechnicalSheetSchema,
  safeParseTechnicalSheetSchema,
} from "@/lib/technical-sheet/schema/technical-sheet-schema"

describe("safeParseTechnicalSheetSchema", () => {
  it("accepts the default schema", () => {
    const parsed = safeParseTechnicalSheetSchema(DEFAULT_TECHNICAL_SHEET_SCHEMA)
    expect(parsed.success).toBe(true)
  })

  it("rejects HTML templates", () => {
    const parsed = safeParseTechnicalSheetSchema("<article>{{candidate.fullName}}</article>")
    expect(parsed.success).toBe(false)
  })

  it("rejects report schemas", () => {
    const parsed = safeParseTechnicalSheetSchema({
      version: 1,
      reportKey: "vacancy-progress-by-client",
      sections: [{ type: "heroHeader", title: "Reporte" }],
    })
    expect(parsed.success).toBe(false)
  })
})

describe("resolveTechnicalSheetSchema", () => {
  it("falls back to the default schema when content is HTML", () => {
    const resolved = resolveTechnicalSheetSchema("<h1>Ficha</h1>")
    expect(resolved.source).toBe("default")
    expect(resolved.schema.kind).toBe("technical-sheet")
  })

  it("uses a valid template schema", () => {
    const custom = {
      version: 1,
      kind: "technical-sheet",
      sections: [{ type: "paragraph", title: "Bio", text: "{{candidate.profileSummary}}" }],
    }
    const resolved = resolveTechnicalSheetSchema(JSON.stringify(custom))
    expect(resolved.source).toBe("template")
    expect(resolved.schema.sections).toHaveLength(1)
  })
})

describe("renderTechnicalSheetSchemaToHtml", () => {
  it("renders escaped candidate data from the default schema", () => {
    const ctx = buildTechnicalSheetTemplateContext({
      personal: { firstName: "Ana", lastName: "García", address: "Montevideo" },
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
        technicalSkills: ["TypeScript"],
        availability: "Inmediata",
        profileSummary: "Senior engineer",
      },
    })
    const html = renderTechnicalSheetSchemaToHtml(DEFAULT_TECHNICAL_SHEET_SCHEMA, ctx)
    expect(html).toContain("Acme")
    expect(html).toContain("TypeScript")
    expect(html).toContain("Inmediata")
    expect(html).toContain("Senior engineer")
    expect(html).toContain("Experiencia laboral")
    expect(html).toContain('class="ts-article"')
    expect(html).not.toContain("{{#each")
  })

  it("escapes script payloads from bound values", () => {
    const ctx = buildTechnicalSheetTemplateContext({
      candidate: {
        profileSummary: '<script>alert(1)</script><img src=x onerror=alert(2)>',
      },
    })
    const html = renderTechnicalSheetSchemaToHtml(
      {
        version: 1,
        kind: "technical-sheet",
        sections: [{ type: "paragraph", title: "Resumen", text: "{{candidate.profileSummary}}" }],
      },
      ctx
    )
    expect(html).toContain("&lt;script&gt;")
    expect(html).not.toMatch(/<script/i)
  })
})
