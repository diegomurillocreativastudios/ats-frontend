import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("ficha-tecnica-visible-template.html (article-only / paginated shell)", () => {
  const pathToTemplate = join(
    process.cwd(),
    "lib",
    "technical-sheet",
    "ficha-tecnica-visible-template.html"
  )

  it("keeps article and sections for per-page shell wrapping", () => {
    const html = readFileSync(pathToTemplate, "utf8")
    expect(html).toContain('class="technical-sheet-source"')
    expect(html).toContain('class="ts-article"')
    expect(html).toContain("<section>")
    expect(html).not.toContain("position: fixed")
  })

  it("includes experience loop markers for long profiles", () => {
    const html = readFileSync(pathToTemplate, "utf8")
    expect(html).toContain("{{#each candidate.workExperience}}")
    expect(html).toContain("{{/each}}")
  })

  it("does not include interview notes section", () => {
    const html = readFileSync(pathToTemplate, "utf8")
    expect(html).not.toContain("Notas de entrevista")
    expect(html).not.toContain("candidate.interviewNotes")
  })
})
