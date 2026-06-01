import { describe, expect, it } from "vitest"
import {
  buildTechnicalSheetTemplateContext,
  escapeHtmlForTechnicalSheet,
  interpolateTechnicalSheetTemplate,
  renderTechnicalSheetHtml,
} from "@/lib/technical-sheet/template-interpolate"

describe("escapeHtmlForTechnicalSheet", () => {
  it("escapes HTML-special characters", () => {
    expect(escapeHtmlForTechnicalSheet(`<&>"'`)).toBe("&lt;&amp;&gt;&quot;&#39;")
  })
})

describe("interpolateTechnicalSheetTemplate", () => {
  it("replaces placeholders from nested paths", () => {
    const html = "<p>{{header.fullName}}</p>"
    const ctx = buildTechnicalSheetTemplateContext({
      personal: {
        firstName: "Ana",
        lastName: "García",
        address: "Montevideo",
        englishLevel: "B2",
      },
    })
    expect(interpolateTechnicalSheetTemplate(html, ctx)).toBe("<p>Ana García</p>")
  })

  it("resolves array index segments", () => {
    const html = "{{candidate.workExperience.0.company}}"
    const ctx = buildTechnicalSheetTemplateContext({
      candidate: {
        workExperience: [{ company: "Acme", Role: "Dev" }],
      },
    })
    expect(interpolateTechnicalSheetTemplate(html, ctx)).toBe("Acme")
  })

  it("resolves vacancy.title with fallback option", () => {
    const html = "{{vacancy.title}}"
    const ctx = buildTechnicalSheetTemplateContext({}, { vacancyTitleFallback: "Backend Sr" })
    expect(interpolateTechnicalSheetTemplate(html, ctx)).toBe("Backend Sr")
  })

  it("leaves empty string when path missing", () => {
    expect(interpolateTechnicalSheetTemplate("{{candidate.missing}}", { candidate: {} })).toBe("")
  })

  it("does not escape placeholders ending with Html", () => {
    const html = "<ul>{{insightsHtml}}</ul>"
    const ctx = { insightsHtml: "<li>OK</li>" }
    expect(interpolateTechnicalSheetTemplate(html, ctx)).toBe("<ul><li>OK</li></ul>")
  })

  it("escapes substituted values", () => {
    expect(
      interpolateTechnicalSheetTemplate("{{header.fullName}}", {
        header: { fullName: "<b>X</b>", address: "", englishLevel: "" },
      })
    ).toBe("&lt;b&gt;X&lt;/b&gt;")
  })

  it("preserves data:image and https logoUrl for img src without escaping", () => {
    const data = "data:image/png;base64,abc+/="
    expect(interpolateTechnicalSheetTemplate(`<img src="{{logoUrl}}">`, { logoUrl: data })).toBe(
      `<img src="${data}">`
    )
    expect(
      interpolateTechnicalSheetTemplate(`<img src="{{logoUrl}}">`, {
        logoUrl: "https://app.example.com/visible-icon.png",
      })
    ).toBe(`<img src="https://app.example.com/visible-icon.png">`)
  })

  it("escapes logoUrl when it is not a safe URL scheme", () => {
    expect(
      interpolateTechnicalSheetTemplate(`<img src="{{logoUrl}}">`, {
        logoUrl: '"><script>x</script>',
      })
    ).toContain("&quot;")
  })
})

describe("buildTechnicalSheetTemplateContext", () => {
  it("maps vacancyInfo to vacancy key", () => {
    const ctx = buildTechnicalSheetTemplateContext({
      vacancyInfo: { title: "Designer", departmentDisplayName: "Design" },
    })
    expect(ctx.vacancy).toMatchObject({ title: "Designer" })
  })

  it("aliases skills to technicalSkills when technicalSkills is empty", () => {
    const ctx = buildTechnicalSheetTemplateContext({
      candidate: {
        skills: ["JS", "TS"],
      },
    })
    expect(ctx.candidate).toMatchObject({ technicalSkills: ["JS", "TS"] })
  })

  it("includes logoUrl from options for document templates", () => {
    const ctx = buildTechnicalSheetTemplateContext(
      {},
      { logoUrl: "https://app.example.com/visible-icon.png" }
    )
    expect(ctx.logoUrl).toBe("https://app.example.com/visible-icon.png")
    expect(
      renderTechnicalSheetHtml('<img src="{{logoUrl}}" alt="" />', ctx)
    ).toBe('<img src="https://app.example.com/visible-icon.png" alt="" />')
  })

  it("fills responsibilities from Description when the API sends no bullet array", () => {
    const ctx = buildTechnicalSheetTemplateContext({
      firstName: "Diego",
      lastName: "Murillo",
      address: "Colón",
      englishLevel: "Avanzado",
      workExperience: [
        {
          Role: "Dev",
          Company: "Acme",
          StartDate: "Ene 2023",
          EndDate: "Presente",
          Description: "Primera función.\nSegunda función.",
        },
      ],
    })
    const cand = ctx.candidate as Record<string, unknown>
    const wx = cand.workExperience as Record<string, unknown>[]
    expect(wx[0].responsibilities).toEqual(["Primera función.", "Segunda función."])
  })

  it("injects languages from englishLevel when languages is absent", () => {
    const ctx = buildTechnicalSheetTemplateContext({
      firstName: "A",
      lastName: "B",
      address: "",
      englishLevel: "Avanzado",
    })
    const cand = ctx.candidate as Record<string, unknown>
    expect(cand.languages).toEqual([{ language: "Inglés", level: "Avanzado" }])
  })
})

describe("expandEachBlocks & renderTechnicalSheetHtml", () => {
  it("repeats blocks per array item", () => {
    const tpl = "{{#each items}}<li>{{name}}</li>{{/each}}"
    const ctx = { items: [{ name: "a" }, { name: "b" }] }
    expect(renderTechnicalSheetHtml(tpl, ctx)).toBe("<li>a</li><li>b</li>")
  })

  it("uses this as alias for primitive items in #each", () => {
    const tpl = "{{#each items}}<x>{{this}}</x>{{/each}}"
    expect(renderTechnicalSheetHtml(tpl, { items: ["p", "q"] })).toBe("<x>p</x><x>q</x>")
  })

  it("supports nested each for responsibilities", () => {
    const tpl =
      "{{#each candidate.workExperience}}<ul>{{#each responsibilities}}<li>{{.}}</li>{{/each}}</ul>{{/each}}"
    const ctx = buildTechnicalSheetTemplateContext({
      candidate: {
        workExperience: [
          { responsibilities: ["one", "two"] },
          { responsibilities: ["three"] },
        ],
      },
    })
    expect(renderTechnicalSheetHtml(tpl, ctx)).toBe("<ul><li>one</li><li>two</li></ul><ul><li>three</li></ul>")
  })

  it("still resolves header paths inside each iteration", () => {
    const tpl = "{{#each candidate.workExperience}}<span>{{company}}</span>-{{header.fullName}}{{/each}}"
    const ctx = buildTechnicalSheetTemplateContext({
      candidate: {
        firstName: "Zoe",
        lastName: "Lee",
        address: "",
        englishLevel: "",
        workExperience: [{ company: "Acme" }],
      },
    })
    expect(renderTechnicalSheetHtml(tpl, ctx)).toBe("<span>Acme</span>-Zoe Lee")
  })
})
