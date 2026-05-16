import {
  getTechnicalSheetPdfPageOptions,
  renderHtmlToPdfBuffer,
  waitForTechnicalSheetPdfDocumentAssets,
} from "@/lib/technical-sheet/html-to-pdf-chromium"
import { launchPdfBrowser } from "@/lib/pdf/launch-pdf-browser"
import {
  TECHNICAL_SHEET_CONTENT_AVAILABLE_HEIGHT_PX,
  TECHNICAL_SHEET_CONTENT_INNER_WIDTH_PX,
} from "@/lib/technical-sheet/technical-sheet-page-constants"
import {
  buildTechnicalSheetPageHtml,
  TECHNICAL_SHEET_MULTI_PAGE_STYLES,
  type TechnicalSheetPageHeaderFields,
} from "@/lib/technical-sheet/technical-sheet-page-shell"
import { ensureTechnicalSheetPdfDocument } from "@/lib/technical-sheet/wrap-technical-sheet-html-for-pdf"

/**
 * PDF con hojas Letter reales: mide `<article>` en Chromium, parte en `.technical-sheet-page`
 * y vuelve a renderizar antes de `page.pdf`.
 */
export async function renderPaginatedTechnicalSheetPdfFromInterpolated(
  interpolatedFragment: string,
  header: TechnicalSheetPageHeaderFields,
  logoUrl: string
): Promise<Buffer> {
  const safeLogo = logoUrl.replace(/"/g, "")
  if (
    interpolatedFragment.includes("technical-sheet-page") &&
    interpolatedFragment.includes("technical-sheet-doc")
  ) {
    return renderHtmlToPdfBuffer(ensureTechnicalSheetPdfDocument(interpolatedFragment))
  }

  const measureDoc = ensureTechnicalSheetPdfDocument(
    `${TECHNICAL_SHEET_MULTI_PAGE_STYLES}<div class="technical-sheet-measure-root" style="width:816px;margin:0 auto;background:#fff">${interpolatedFragment}</div>`
  )

  let browser: import("puppeteer-core").Browser | undefined
  try {
    browser = await launchPdfBrowser({
      defaultViewport: { width: 1280, height: 1600 },
      timeout: 120_000,
    })
    const page = await browser.newPage()
    try {
      await page.emulateMediaType("screen")
      await page.setContent(measureDoc, { waitUntil: "load", timeout: 60_000 })
      await waitForTechnicalSheetPdfDocumentAssets(page)

      const articleBodies = await page.evaluate(
        (dims: { maxContentPx: number; innerW: number }) => {
          const maxContentPx = dims.maxContentPx
          const TECH_SHEET_INNER_W = dims.innerW

          function measureHtmlBlock(doc: Document, html: string): number {
            const ghost = doc.createElement("div")
            ghost.setAttribute(
              "style",
              `position:absolute;left:-99999px;top:0;width:${TECH_SHEET_INNER_W}px;visibility:hidden;pointer-events:none;font-size:13.5px;line-height:1.42;color:#111827`
            )
            ghost.innerHTML = `<div style="width:${TECH_SHEET_INNER_W}px;box-sizing:border-box">${html}</div>`
            doc.body.appendChild(ghost)
            const inner = ghost.firstElementChild as HTMLElement
            const h = inner.scrollHeight
            ghost.remove()
            return h
          }

        function buildFlatBlocks(article: Element, doc: Document, maxPx: number) {
          const sections = [...article.querySelectorAll(":scope > section")]
          if (sections.length === 0) {
            const inner = article.innerHTML.trim() || "<p></p>"
            const h = measureHtmlBlock(doc, `<article class="ts-article">${inner}</article>`)
            return [{ html: inner, h }]
          }

          const blocks: { html: string; h: number }[] = []
          for (const sec of sections) {
            const outer = sec.outerHTML
            const h0 = measureHtmlBlock(doc, outer)
            if (h0 <= maxPx) {
              blocks.push({ html: outer, h: h0 })
              continue
            }

            const children = [...sec.children]
            const h2 = children.find((c) => c.tagName === "H2")
            const rest = children.filter((c) => c.tagName !== "H2")
            if (rest.length <= 1) {
              blocks.push({ html: outer, h: h0 })
              continue
            }

            let isFirst = true
            for (const node of rest) {
              const frag =
                (isFirst && h2 ? h2.outerHTML : "") + (node as HTMLElement).outerHTML
              isFirst = false
              blocks.push({ html: frag, h: measureHtmlBlock(doc, frag) })
            }
          }
          return blocks
        }

        function packBlocks(blocks: { html: string; h: number }[], maxPx: number): string[][] {
          const pages: string[][] = []
          let cur: string[] = []
          let sum = 0

          for (const b of blocks) {
            if (b.h > maxPx) {
              if (cur.length) {
                pages.push(cur)
                cur = []
                sum = 0
              }
              pages.push([b.html])
              continue
            }

            if (sum + b.h <= maxPx) {
              cur.push(b.html)
              sum += b.h
              continue
            }

            if (cur.length) pages.push(cur)
            cur = [b.html]
            sum = b.h
          }

          if (cur.length) pages.push(cur)
          return pages
        }

        function paginateBodies(article: Element | null, maxPx: number): string[] {
          if (!article) {
            return [`<article class="ts-article"></article>`]
          }
          const doc = article.ownerDocument
          if (!doc?.body) {
            return [`<article class="ts-article">${article.innerHTML}</article>`]
          }
          const flat = buildFlatBlocks(article, doc, maxPx)
          if (flat.length === 0) {
            return [`<article class="ts-article"></article>`]
          }
          const packed = packBlocks(flat, maxPx)
          return packed.map((parts) => `<article class="ts-article">${parts.join("")}</article>`)
        }

        const article =
          document.querySelector("article.ts-article") || document.querySelector("article")
        return paginateBodies(article, maxContentPx)
        },
        {
          maxContentPx: TECHNICAL_SHEET_CONTENT_AVAILABLE_HEIGHT_PX,
          innerW: TECHNICAL_SHEET_CONTENT_INNER_WIDTH_PX,
        }
      )

      const pages = articleBodies.map((body) =>
        buildTechnicalSheetPageHtml({
          bodyHtml: body,
          header,
          logoUrl: safeLogo,
        })
      )

      const finalHtml = ensureTechnicalSheetPdfDocument(
        `${TECHNICAL_SHEET_MULTI_PAGE_STYLES}<main class="technical-sheet-doc">${pages.join("")}</main>`
      )

      await page.emulateMediaType("print")
      await page.setContent(finalHtml, { waitUntil: "load", timeout: 60_000 })
      await waitForTechnicalSheetPdfDocumentAssets(page)
      const buf = await page.pdf(getTechnicalSheetPdfPageOptions())
      return Buffer.from(buf)
    } finally {
      await page.close().catch(() => {})
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => {})
    }
  }
}
