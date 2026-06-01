import { JSDOM } from "jsdom"
import { describe, expect, it } from "vitest"
import { paginateTechnicalSheetArticleToPageBodies } from "@/lib/technical-sheet/paginate-technical-sheet-article-dom"
import { TECHNICAL_SHEET_CONTENT_AVAILABLE_HEIGHT_PX } from "@/lib/technical-sheet/technical-sheet-page-constants"

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
})
