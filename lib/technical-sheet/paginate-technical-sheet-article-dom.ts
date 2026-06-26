import {
  TECHNICAL_SHEET_CONTENT_AVAILABLE_HEIGHT_PX,
  TECHNICAL_SHEET_CONTENT_INNER_WIDTH_PX,
} from "@/lib/technical-sheet/technical-sheet-page-constants"

const TECH_SHEET_INNER_W = TECHNICAL_SHEET_CONTENT_INNER_WIDTH_PX

interface TechnicalSheetBlock {
  html: string
  h: number
}

function measureHtmlBlock(doc: Document, html: string): number {
  const ghost = doc.createElement("div")
  ghost.setAttribute(
    "style",
    `position:absolute;left:-99999px;top:0;width:${TECH_SHEET_INNER_W}px;visibility:hidden;pointer-events:none;font-size:13.5px;line-height:1.42;color:#256D35`
  )
  ghost.innerHTML = `<div style="width:${TECH_SHEET_INNER_W}px;box-sizing:border-box">${html}</div>`
  doc.body.appendChild(ghost)
  const inner = ghost.firstElementChild as HTMLElement
  const h = inner.scrollHeight
  ghost.remove()
  return h
}

function buildFlatBlocks(article: Element, doc: Document, maxPx: number): TechnicalSheetBlock[] {
  const sections = [...article.querySelectorAll(":scope > section")]
  if (sections.length === 0) {
    const inner = article.innerHTML.trim() || "<p></p>"
    const h = measureHtmlBlock(doc, `<article class="ts-article">${inner}</article>`)
    return [{ html: inner, h }]
  }

  const blocks: TechnicalSheetBlock[] = []
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
      const frag = (isFirst && h2 ? h2.outerHTML : "") + (node as HTMLElement).outerHTML
      isFirst = false
      blocks.push({ html: frag, h: measureHtmlBlock(doc, frag) })
    }
  }
  return blocks
}

function packBlocks(blocks: TechnicalSheetBlock[], maxPx: number): string[][] {
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

/**
 * Parte el contenido de `<article>` en varios HTML de artículo (uno por hoja),
 * midiendo en el DOM real (iframe de vista previa).
 *
 * `maxContentPx` debe coincidir con TECHNICAL_SHEET_CONTENT_AVAILABLE_HEIGHT_PX (altura útil CSS).
 */
export const paginateTechnicalSheetArticleToPageBodies = function (
  article: Element | null,
  maxContentPx: number = TECHNICAL_SHEET_CONTENT_AVAILABLE_HEIGHT_PX
): string[] {
  if (!article) {
    return [`<article class="ts-article"></article>`]
  }

  const doc = article.ownerDocument
  if (!doc?.body) {
    return [`<article class="ts-article">${article.innerHTML}</article>`]
  }

  const flat = buildFlatBlocks(article, doc, maxContentPx)
  if (flat.length === 0) {
    return [`<article class="ts-article"></article>`]
  }

  const packed = packBlocks(flat, maxContentPx)
  return packed.map((parts) => `<article class="ts-article">${parts.join("")}</article>`)
}
