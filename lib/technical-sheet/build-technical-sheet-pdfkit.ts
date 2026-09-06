import { APP_NAME } from "@/lib/app-brand"
import PDFDocument from "pdfkit"
import type { TechnicalSheetPayload } from "@/lib/api/technical-sheet"
import { technicalSheetMessages as m } from "@/lib/messages/technical-sheet"
import { getTechnicalSheetCandidateHeaderFacts } from "@/lib/technical-sheet/candidate-from-payload"
import { DEFAULT_TECHNICAL_SHEET_SCHEMA } from "@/lib/technical-sheet/schema/technical-sheet-default-schema"
import { renderTechnicalSheetSchemaToPdfKit } from "@/lib/technical-sheet/schema/render-technical-sheet-schema-to-pdfkit"
import type { TechnicalSheetSchema } from "@/lib/technical-sheet/schema/technical-sheet-schema-types"
import { buildTechnicalSheetTemplateContext } from "@/lib/technical-sheet/template-interpolate"
import { tryLoadAppLogoRasterBufferForPdfKit } from "@/lib/technical-sheet/technical-sheet-pdf-logo"

/**
 * PDF estructurado con PDFKit desde el esquema JSON (mismo patrón que reportes).
 */

const BRAND = {
  purple: "#6EB940",
  cyan: "#438C39",
  footer: "#256D35",
  black: "#000000",
  taglineGray: "#57585B",
  dotGray: "#94a3b8",
}

const FOOTER_H = 16
/** Banda superior reservada para logo + tagline + datos (el texto del cuerpo empieza en margin.top) */
const HEADER_BAND_TOP = 48
const CONTENT_MARGIN_TOP = 120
/** Altura fija entre líneas del bloque datos (evita depender de doc.y con coords absolutas) */
const HEADER_FACT_LINE_HEIGHT = 14
/** Hueco respecto al borde útil para no solapar decoración esquina superior derecha */
const HEADER_FACTS_RIGHT_INSET = 24

type PdfDoc = InstanceType<typeof PDFDocument>

function contentMetrics(doc: PdfDoc): { left: number; right: number; width: number } {
  const left = doc.page.margins.left
  const right = doc.page.width - doc.page.margins.right
  return { left, right, width: right - left }
}

function drawFooterBar(doc: PdfDoc) {
  doc.save()
  doc.fillOpacity(1).fillColor(BRAND.footer)
  doc.rect(0, doc.page.height - FOOTER_H, doc.page.width, FOOTER_H).fill()
  doc.restore()
}

/** Decoración esquinas + grilla (todas las páginas). */
function drawPageDecorations(doc: PdfDoc) {
  const W = doc.page.width
  const H = doc.page.height

  doc.save()

  doc.save()
  doc.translate(W - 2, 26)
  doc.rotate((12 * Math.PI) / 180)
  doc.fillColor(BRAND.cyan).fillOpacity(0.88)
  doc.rect(-34, -40, 64, 48).fill()
  doc.restore()

  doc.save()
  doc.translate(W - 14, 38)
  doc.rotate((-8 * Math.PI) / 180)
  doc.fillColor(BRAND.purple).fillOpacity(1)
  doc.rect(-20, -20, 48, 48).fill()
  doc.restore()

  doc.save()
  doc.translate(30, H - 38)
  doc.rotate((-10 * Math.PI) / 180)
  doc.fillColor(BRAND.purple).fillOpacity(0.94)
  doc.rect(-24, -18, 40, 24).fill()
  doc.restore()

  doc.save()
  doc.translate(50, H - 28)
  doc.rotate((8 * Math.PI) / 180)
  doc.fillColor(BRAND.cyan).fillOpacity(0.82)
  doc.rect(-10, -10, 20, 20).fill()
  doc.restore()

  doc.fillColor(BRAND.purple).fillOpacity(0.9)
  doc.rect(W - 50, H - 54, 24, 24).fill()

  doc.fillColor(BRAND.dotGray).fillOpacity(0.9)
  const gx = W - 46
  const gy = H - 28
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      doc.circle(gx + c * 9.5, gy + r * 9.5, 2.2).fill()
    }
  }

  doc.restore()
}

/**
 * Logo Applican Tree + tagline + datos personales (solo página 1; las siguientes no repiten cabecera).
 */
function drawRepeatedHeader(
  doc: PdfDoc,
  facts: ReturnType<typeof getTechnicalSheetCandidateHeaderFacts>,
  iconBuffer: Buffer | undefined
) {
  const { left, right, width } = contentMetrics(doc)
  const headerTop = HEADER_BAND_TOP
  const factsRight = right - HEADER_FACTS_RIGHT_INSET
  const factsColW = Math.min(240, width * 0.42)
  const factsX = factsRight - factsColW
  const iconW = 32
  const iconGap = 10
  const wordmarkX = left + (iconBuffer ? iconW + iconGap : 0)

  try {
    if (iconBuffer && iconBuffer.length > 0) {
      doc.image(iconBuffer, left, headerTop, { width: iconW })
    }
    doc.fontSize(15).font("Helvetica-Bold").fillColor(BRAND.purple).text(APP_NAME, wordmarkX, headerTop + 2, {
      width: 160,
    })
    doc.fontSize(8.5).font("Helvetica").fillColor(BRAND.taglineGray)
    doc.text(m.brandTagline, left, headerTop + 22, { width: 280, lineGap: 2 })
  } catch {
    drawVisibleFallbackWordmark(doc, left, headerTop)
  }

  let factsY = headerTop

  if (facts) {
    const rows: Array<{ label: string; value: string }> = [
      { label: m.headerName, value: facts.fullName || "—" },
      { label: m.headerAddress, value: facts.address || "—" },
      { label: m.headerEnglishLevel, value: facts.englishLevel || "—" },
    ]
    for (const row of rows) {
      const labelPart = `${row.label}: `
      const valuePart = row.value.trim() !== "" ? row.value : "—"
      doc.fontSize(10).fillColor(BRAND.black)
      doc.font("Helvetica-Bold")
      const wLabel = doc.widthOfString(labelPart)
      doc.font("Helvetica")
      const wVal = doc.widthOfString(valuePart)
      const startX = factsX + factsColW - (wLabel + wVal)
      doc.font("Helvetica-Bold").text(labelPart, startX, factsY, { lineBreak: false })
      const valueMaxWidth = Math.max(48, factsRight - (startX + wLabel))
      doc.font("Helvetica").text(valuePart, startX + wLabel, factsY, { width: valueMaxWidth, lineGap: 2 })
      factsY = Math.max(doc.y + 4, factsY + HEADER_FACT_LINE_HEIGHT)
    }
  }

  doc.fillOpacity(1).fillColor(BRAND.black)
}

function drawVisibleFallbackWordmark(doc: PdfDoc, left: number, headerTop: number) {
  doc.fontSize(15).font("Helvetica-Bold").fillColor(BRAND.purple).text(APP_NAME, left, headerTop, {
    width: 220,
  })
  doc.fontSize(8.5).font("Helvetica").fillColor(BRAND.taglineGray)
  doc.text(m.brandTagline, left, headerTop + 18, { width: 280, lineGap: 2 })
}

function resetTextCursorToContentArea(doc: PdfDoc) {
  doc.x = doc.page.margins.left
  doc.y = doc.page.margins.top
}

export interface BuildTechnicalSheetPdfKitOptions {
  schema?: TechnicalSheetSchema
  vacancyTitleFallback?: string | null
  logoUrl?: string | null
}

export async function buildTechnicalSheetPdfKitBuffer(
  payload: TechnicalSheetPayload,
  options?: BuildTechnicalSheetPdfKitOptions
): Promise<Buffer> {
  const schema = options?.schema ?? DEFAULT_TECHNICAL_SHEET_SCHEMA
  const ctx = buildTechnicalSheetTemplateContext(payload, {
    vacancyTitleFallback: options?.vacancyTitleFallback,
    logoUrl: options?.logoUrl,
  })
  const facts = getTechnicalSheetCandidateHeaderFacts(payload)
  const iconBuffer = (await tryLoadAppLogoRasterBufferForPdfKit(32)) ?? undefined

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      autoFirstPage: false,
      margins: { top: CONTENT_MARGIN_TOP, bottom: 56, left: 48, right: 48 },
    })
    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    const paintPageChrome = () => {
      const margins = doc.page.margins as { top: number; left: number; bottom: number; right: number }
      margins.top = CONTENT_MARGIN_TOP

      drawFooterBar(doc)
      drawPageDecorations(doc)
      drawRepeatedHeader(doc, facts, iconBuffer)
      resetTextCursorToContentArea(doc)
    }

    doc.on("pageAdded", paintPageChrome)

    try {
      doc.addPage()
      renderTechnicalSheetSchemaToPdfKit(doc, schema, ctx)
    } catch (e) {
      reject(e)
      return
    }
    doc.end()
  })
}
