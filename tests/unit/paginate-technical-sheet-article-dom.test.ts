import { JSDOM } from "jsdom"
import { describe, expect, it } from "vitest"
import {
  paginateTechnicalSheetArticleToPageBodies,
  wrapTechnicalSheetFragmentForMeasure,
} from "@/lib/technical-sheet/paginate-technical-sheet-article-dom"
import { TECHNICAL_SHEET_CONTENT_AVAILABLE_HEIGHT_PX } from "@/lib/technical-sheet/technical-sheet-page-constants"

describe("wrapTechnicalSheetFragmentForMeasure", () => {
  it("envuelve el fragmento en article.ts-article para la medición", () => {
    const frag = `<section><h2>Información adicional</h2><p>Expectativa salarial</p></section>`
    expect(wrapTechnicalSheetFragmentForMeasure(frag)).toBe(
      `<article class="ts-article">${frag}</article>`
    )
  })
})

describe("measure / pack overflow guard", () => {
  it("expone el helper de envoltorio usado por la medición", () => {
    expect(wrapTechnicalSheetFragmentForMeasure("<p>x</p>")).toContain('class="ts-article"')
  })
})

describe("paginateTechnicalSheetArticleToPageBodies", () => {
  it("returns one empty article when article is null", () => {
    expect(paginateTechnicalSheetArticleToPageBodies(null, TECHNICAL_SHEET_CONTENT_AVAILABLE_HEIGHT_PX)).toEqual([
      `<article class="ts-article"></article>`,
    ])
  })

  it("returns at least one page for a minimal article in jsdom", () => {
    const dom = new JSDOM(
      `<!DOCTYPE html><html><body><article class="ts-article"><section><p>a</p></section></article></body></html>`
    )
    const article = dom.window.document.querySelector("article")
    const pages = paginateTechnicalSheetArticleToPageBodies(article, TECHNICAL_SHEET_CONTENT_AVAILABLE_HEIGHT_PX)
    expect(pages.length).toBeGreaterThanOrEqual(1)
    expect(pages[0]).toContain("ts-article")
  })

  it("empaqueta secciones sin anidar article.ts-article por bloque", () => {
    const sectionA = `<section><h2>A</h2><p>uno</p></section>`
    const sectionB = `<section><h2>B</h2><p>Expectativa salarial</p></section>`
    const dom = new JSDOM(
      `<!DOCTYPE html><html><body><article class="ts-article">${sectionA}${sectionB}</article></body></html>`
    )
    const article = dom.window.document.querySelector("article")
    const pages = paginateTechnicalSheetArticleToPageBodies(article, TECHNICAL_SHEET_CONTENT_AVAILABLE_HEIGHT_PX)

    expect(pages.length).toBeGreaterThanOrEqual(1)
    for (const page of pages) {
      expect(page.startsWith(`<article class="ts-article">`)).toBe(true)
      expect(page.endsWith(`</article>`)).toBe(true)
      const nestedArticles = page.match(/<article\b/g) ?? []
      expect(nestedArticles).toHaveLength(1)
    }
    expect(pages.join("")).toContain("Expectativa salarial")
    expect(pages.join("")).toContain(sectionA)
  })
})
