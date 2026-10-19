import {
  TECHNICAL_SHEET_CONTENT_AVAILABLE_HEIGHT_PX,
  TECHNICAL_SHEET_CONTENT_INNER_WIDTH_PX,
} from "@/lib/technical-sheet/technical-sheet-page-constants"

const TECH_SHEET_INNER_W = TECHNICAL_SHEET_CONTENT_INNER_WIDTH_PX

interface TechnicalSheetBlock {
  html: string
  h: number
}

/**
 * Wraps a content fragment so measurement sees the same CSS as painted pages
 * (`article.ts-article > section { margin-bottom: 28px }`). Packed page HTML
 * must keep the unwrapped fragment.
 */
export function wrapTechnicalSheetFragmentForMeasure(html: string): string {
  return `<article class="ts-article">${html}</article>`
}

function measureHtmlBlock(doc: Document, html: string): number {
  const ghost = doc.createElement("div")
  ghost.setAttribute(
    "style",
    `position:absolute;left:-99999px;top:0;width:${TECH_SHEET_INNER_W}px;visibility:hidden;pointer-events:none;font-size:13.5px;line-height:1.42;color:#256D35`
  )
  // flow-root keeps section margin-bottom inside the measured box (scrollHeight
  // otherwise ignores the last child's collapsing margin — that was clipping the
  // final «Expectativa salarial» line under the green footer).
  ghost.innerHTML = `<div style="width:${TECH_SHEET_INNER_W}px;box-sizing:border-box"><article class="ts-article" style="display:flow-root;margin:0;padding:0">${html}</article></div>`
  doc.body.appendChild(ghost)
  const article = ghost.querySelector("article.ts-article") as HTMLElement | null
  const h = article?.offsetHeight ?? (ghost.firstElementChild as HTMLElement).scrollHeight
  ghost.remove()
  return h
}

function cloneListWithItems(list: Element, items: Element[]): string {
  const clone = list.cloneNode(false) as HTMLElement
  for (const item of items) {
    clone.appendChild(item.cloneNode(true))
  }
  return clone.outerHTML
}

function splitOversizedListSection(
  sec: Element,
  doc: Document,
  maxPx: number,
  h0: number
): TechnicalSheetBlock[] | null {
  const children = [...sec.children]
  const h2 = children.find((c) => c.tagName === "H2")
  const rest = children.filter((c) => c.tagName !== "H2")
  if (rest.length !== 1 || rest[0].tagName !== "UL") return null

  const list = rest[0]
  const items = [...list.children].filter((c) => c.tagName === "LI")
  if (items.length < 2) return null

  const blocks: TechnicalSheetBlock[] = []
  let chunk: Element[] = []
  let isFirst = true

  const flush = () => {
    if (chunk.length === 0) return
    const listHtml = cloneListWithItems(list, chunk)
    const frag = (isFirst && h2 ? h2.outerHTML : "") + listHtml
    isFirst = false
    blocks.push({ html: frag, h: measureHtmlBlock(doc, frag) })
    chunk = []
  }

  for (const item of items) {
    const trial = [...chunk, item]
    const listHtml = cloneListWithItems(list, trial)
    const frag = (isFirst && h2 && chunk.length === 0 ? h2.outerHTML : "") + listHtml
    const h = measureHtmlBlock(doc, frag)
    if (h > maxPx && chunk.length > 0) {
      flush()
      chunk = [item]
      continue
    }
    chunk = trial
  }
  flush()

  if (blocks.length === 0) return null
  // If we could not shrink below a single oversized block, keep original.
  if (blocks.length === 1 && blocks[0].h >= h0) return null
  return blocks
}

function buildFlatBlocks(article: Element, doc: Document, maxPx: number): TechnicalSheetBlock[] {
  const sections = [...article.querySelectorAll(":scope > section")]
  if (sections.length === 0) {
    const inner = article.innerHTML.trim() || "<p></p>"
    const h = measureHtmlBlock(doc, inner)
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

    const listSplit = splitOversizedListSection(sec, doc, maxPx, h0)
    if (listSplit) {
      blocks.push(...listSplit)
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

function packBlocks(
  blocks: TechnicalSheetBlock[],
  maxPx: number,
  doc: Document
): string[][] {
  const pages: string[][] = []
  let cur: string[] = []

  for (const b of blocks) {
    if (b.h > maxPx) {
      if (cur.length) {
        pages.push(cur)
        cur = []
      }
      pages.push([b.html])
      continue
    }

    const trial = [...cur, b.html]
    const trialH = measureHtmlBlock(doc, trial.join(""))
    if (trialH <= maxPx) {
      cur = trial
      continue
    }

    if (cur.length) pages.push(cur)
    cur = [b.html]
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

  const packed = packBlocks(flat, maxContentPx, doc)
  return packed.map((parts) => `<article class="ts-article">${parts.join("")}</article>`)
}
