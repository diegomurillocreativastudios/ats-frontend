import { existsSync, readFileSync } from "fs"
import { join } from "path"
import PDFDocument from "pdfkit"
import type { TechnicalSheetPayload } from "@/lib/api/technical-sheet"
import { technicalSheetMessages as m } from "@/lib/messages/technical-sheet"
import {
  getTechnicalSheetCandidateHeaderFacts,
  pickCandidateDisplayRecord,
} from "@/lib/technical-sheet/candidate-from-payload"

/** Alineado con marca Visible (`app/globals.css` --vo-purple) */
const BRAND = {
  purple: "#6E3385",
  cyan: "#06B6D4",
  footer: "#0f172a",
  black: "#000000",
  taglineGray: "#525252",
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

function pickFromRecord(o: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k] ?? o[k.charAt(0).toUpperCase() + k.slice(1)]
    if (v != null && String(v).trim() !== "") return String(v)
  }
  return null
}

const capitalizeSentence = (s: string) =>
  s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)

function formatSpanishMonthYearRaw(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === "") return ""
  const t = String(raw).trim()
  const d = new Date(t)
  if (!Number.isNaN(d.getTime())) {
    const formatted = new Intl.DateTimeFormat("es", {
      month: "long",
      year: "numeric",
    }).format(d)
    return capitalizeSentence(formatted)
  }
  return t
}

function formatWorkPeriodDisplay(from: string | null, to: string | null): string {
  const a = formatSpanishMonthYearRaw(from)
  const b = formatSpanishMonthYearRaw(to)
  if (a !== "" && b !== "") return `${a}–${b}`
  if (a !== "") return a
  if (b !== "") return b
  return "—"
}

function extractWorkFunctions(rec: Record<string, unknown>): string[] {
  const arrayKeys = [
    "responsibilities",
    "Responsibilities",
    "functions",
    "Functions",
    "mainFunctions",
    "MainFunctions",
    "bullets",
    "Bullets",
    "achievements",
    "Achievements",
  ]
  for (const k of arrayKeys) {
    const v = rec[k]
    if (Array.isArray(v)) {
      const out = v.map((x) => String(x).trim()).filter((x) => x !== "")
      if (out.length > 0) return out
    }
  }
  const desc = pickFromRecord(rec, ["Description", "description", "summary"])
  if (!desc) return []
  const lines = desc
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s\-•*·]+/, "").trim())
    .filter((line) => line !== "")
  if (lines.length > 1) return lines
  if (lines.length === 1) {
    const single = lines[0]
    if (single.length > 200) {
      const bySentence = single.split(/(?<=[.!?])\s+/).filter((p) => p.trim().length > 0)
      if (bySentence.length > 1) return bySentence
    }
    return lines
  }
  return [desc.trim()]
}

function collectStringList(v: unknown): string[] {
  return Array.isArray(v)
    ? [...new Set(v.map((s) => String(s).trim()).filter((s) => s !== ""))]
    : []
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v != null && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>
  return null
}

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
 * Logo Visible + tagline + datos personales (solo página 1; las siguientes no repiten cabecera).
 */
function drawRepeatedHeader(
  doc: PdfDoc,
  facts: ReturnType<typeof getTechnicalSheetCandidateHeaderFacts>,
  wordmarkBuffer: Buffer | undefined,
  iconBuffer: Buffer | undefined
) {
  const { left, right, width } = contentMetrics(doc)
  const headerTop = HEADER_BAND_TOP
  const factsRight = right - HEADER_FACTS_RIGHT_INSET
  const factsColW = Math.min(240, width * 0.42)
  const factsX = factsRight - factsColW
  const iconW = 32
  const iconGap = 8
  const wordmarkW = 108
  const wordmarkX = left + iconW + iconGap

  if (wordmarkBuffer && wordmarkBuffer.length > 0) {
    try {
      if (iconBuffer && iconBuffer.length > 0) {
        doc.image(iconBuffer, left, headerTop, { width: iconW })
      }
      doc.image(wordmarkBuffer, wordmarkX, headerTop, { width: wordmarkW })
      doc.fontSize(8.5).font("Helvetica").fillColor(BRAND.taglineGray)
      doc.text(m.brandTagline, left, headerTop + 36, { width: wordmarkW + iconW + iconGap + 72, lineGap: 2 })
    } catch {
      drawVisibleFallbackWordmark(doc, left, headerTop)
    }
  } else {
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
  doc.fontSize(15).font("Helvetica-Bold").fillColor(BRAND.purple).text("Visible", left, headerTop, {
    width: 220,
  })
  doc.fontSize(8.5).font("Helvetica").fillColor(BRAND.taglineGray)
  doc.text(m.brandTagline, left, headerTop + 18, { width: 280, lineGap: 2 })
}

function resetTextCursorToContentArea(doc: PdfDoc) {
  doc.x = doc.page.margins.left
  doc.y = doc.page.margins.top
}

function sectionHeading(doc: PdfDoc, title: string) {
  const { width, left, right } = contentMetrics(doc)
  doc.moveDown(0.85)
  doc.fontSize(11).font("Helvetica-Bold").fillColor(BRAND.black).text(title.toUpperCase(), {
    width,
    align: "left",
  })
  doc.moveDown(0.22)
  doc.strokeColor(BRAND.black).lineWidth(0.85).moveTo(left, doc.y).lineTo(right, doc.y).stroke()
  doc.moveDown(0.55)
  doc.fillColor(BRAND.black).font("Helvetica").fontSize(10)
}

function paragraph(doc: PdfDoc, text: string) {
  const { width } = contentMetrics(doc)
  doc.fontSize(10).font("Helvetica").fillColor(BRAND.black).text(text, {
    width,
    align: "left",
    lineGap: 4,
  })
  doc.moveDown(0.45)
}

/**
 * Etiqueta y valor en bloques separados (sin `continued`) para que los saltos de página
 * no superpongan texto como en FORMACIÓN ACADÉMICA página 2.
 */
function labeledLine(doc: PdfDoc, label: string, value: string) {
  const { width } = contentMetrics(doc)
  const v = value.trim() !== "" ? value : "—"
  doc.fontSize(10).font("Helvetica-Bold").fillColor(BRAND.black).text(`${label}:`, {
    width,
    align: "left",
  })
  doc.moveDown(0.07)
  doc.font("Helvetica").fontSize(10).fillColor(BRAND.black).text(v, {
    width,
    align: "left",
    lineGap: 3,
  })
  doc.moveDown(0.28)
}

function bulletList(doc: PdfDoc, items: string[]) {
  const { width } = contentMetrics(doc)
  for (const item of items) {
    doc.fontSize(10).font("Helvetica").fillColor(BRAND.black).text(`• ${item}`, {
      width: width - 14,
      indent: 14,
      align: "left",
      lineGap: 5,
    })
    doc.moveDown(0.28)
  }
  doc.moveDown(0.12)
}

function renderTechnicalSheetBody(doc: PdfDoc, payload: TechnicalSheetPayload, record: Record<string, unknown> | null) {
  const { width } = contentMetrics(doc)

  if (!record) {
    doc.fontSize(11).font("Helvetica").fillColor(BRAND.black).text(m.emptyPreview, { width, lineGap: 4 })
    return
  }

  const summary = typeof record.summary === "string" ? record.summary.trim() : ""
  if (summary !== "") {
    sectionHeading(doc, m.summary)
    paragraph(doc, summary)
  }

  const work = Array.isArray(record.workExperience) ? record.workExperience : []
  if (work.length > 0) {
    sectionHeading(doc, m.workExperience)
    for (const raw of work) {
      const rec = asRecord(raw)
      if (!rec) {
        paragraph(doc, typeof raw === "string" ? raw : JSON.stringify(raw))
        continue
      }
      const company = pickFromRecord(rec, ["Company", "company", "employer"]) ?? "—"
      const role = pickFromRecord(rec, ["Role", "role", "position", "title"]) ?? "—"
      const from = pickFromRecord(rec, ["StartDate", "startDate", "from"])
      const to = pickFromRecord(rec, ["EndDate", "endDate", "to"])
      const period = formatWorkPeriodDisplay(from, to)
      labeledLine(doc, m.company, company)
      labeledLine(doc, m.workRolePerformed, role)
      labeledLine(doc, m.workPeriod, period)
      doc.font("Helvetica-Bold").fontSize(10).fillColor(BRAND.black).text(`${m.workMainFunctions}:`, { width })
      doc.moveDown(0.18)
      const lines = extractWorkFunctions(rec)
      if (lines.length > 0) bulletList(doc, lines)
      else paragraph(doc, "—")
      doc.moveDown(0.5)
    }
  }

  const education = Array.isArray(record.education) ? record.education : []
  if (education.length > 0) {
    sectionHeading(doc, m.education)
    for (const raw of education) {
      const rec = asRecord(raw)
      if (!rec) {
        paragraph(doc, typeof raw === "string" ? raw : JSON.stringify(raw))
        continue
      }
      const inst = pickFromRecord(rec, ["Institution", "institution", "school"]) ?? "—"
      const deg = pickFromRecord(rec, ["Degree", "degree", "title"])
      const from = pickFromRecord(rec, ["StartDate", "startDate"])
      const to = pickFromRecord(rec, ["EndDate", "endDate"])
      const period = from || to ? formatWorkPeriodDisplay(from, to) : null
      labeledLine(doc, m.institution, inst)
      if (deg) labeledLine(doc, m.degree, deg)
      if (period && period !== "—") labeledLine(doc, m.workPeriod, period)
      doc.moveDown(0.22)
    }
  }

  const langs = Array.isArray(record.languages) ? record.languages : []
  if (langs.length > 0) {
    sectionHeading(doc, m.languages)
    for (const raw of langs) {
      const rec = asRecord(raw)
      const lang = rec
        ? pickFromRecord(rec, ["Language", "language", "name"])
        : typeof raw === "string"
          ? raw
          : null
      const level = rec ? pickFromRecord(rec, ["Level", "level", "proficiency"]) : null
      paragraph(doc, level ? `${lang ?? "—"} — ${level}` : `${lang ?? "—"}`)
    }
  }

  const skillsLegacy = collectStringList(record.skills)
  const technicalSkillsList = collectStringList(record.technicalSkills)
  const softSkillsList = collectStringList(record.softSkills)
  const hasTechnicalBucket = technicalSkillsList.length > 0
  const hasSoftBucket = softSkillsList.length > 0
  const showSplitSkillBuckets = hasTechnicalBucket || hasSoftBucket
  const combinedTechnicalSkills = hasTechnicalBucket
    ? [...new Set([...technicalSkillsList, ...skillsLegacy])]
    : []
  const legacySkillsWhenOnlySoftTyped =
    !hasTechnicalBucket && hasSoftBucket ? skillsLegacy : []

  if (showSplitSkillBuckets) {
    if (combinedTechnicalSkills.length > 0) {
      sectionHeading(doc, m.technicalSkills)
      bulletList(doc, combinedTechnicalSkills)
    }
    if (softSkillsList.length > 0) {
      sectionHeading(doc, m.softSkills)
      bulletList(doc, softSkillsList)
    }
    if (legacySkillsWhenOnlySoftTyped.length > 0) {
      sectionHeading(doc, m.skills)
      bulletList(doc, legacySkillsWhenOnlySoftTyped)
    }
  } else if (skillsLegacy.length > 0) {
    sectionHeading(doc, m.skills)
    bulletList(doc, skillsLegacy)
  }

  const socialLinks = Array.isArray(record.socialLinks) ? record.socialLinks : []
  if (socialLinks.length > 0) {
    sectionHeading(doc, m.socialLinks)
    for (const raw of socialLinks) {
      const rec = asRecord(raw)
      const platform = rec
        ? pickFromRecord(rec, ["Platform", "platform", "name", "label"])
        : null
      const url = rec ? pickFromRecord(rec, ["Url", "url", "link", "href"]) : null
      paragraph(doc, `${platform ?? "—"}: ${url ?? "—"}`)
    }
  }

  const recognitions = Array.isArray(record.recognitions)
    ? record.recognitions.map((r) => String(r)).filter((r) => r.trim() !== "")
    : []
  if (recognitions.length > 0) {
    sectionHeading(doc, m.recognitions)
    bulletList(doc, recognitions)
  }

  const resume = typeof record.resumeMarkdown === "string" ? record.resumeMarkdown.trim() : ""
  if (resume !== "") {
    sectionHeading(doc, m.resumeMarkdown)
    paragraph(doc, resume)
  }
}

function loadImageBuffer(publicFileName: string): Buffer | undefined {
  const imagePath = join(process.cwd(), "public", publicFileName)
  if (!existsSync(imagePath)) return undefined
  try {
    return readFileSync(imagePath)
  } catch {
    return undefined
  }
}

export function buildTechnicalSheetPdfKitBuffer(payload: TechnicalSheetPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const record = pickCandidateDisplayRecord(payload)
    const facts = getTechnicalSheetCandidateHeaderFacts(payload)
    const wordmarkBuffer = loadImageBuffer("visible-text.png")
    const iconBuffer = loadImageBuffer("visible-icon.png")

    const doc = new PDFDocument({
      size: "A4",
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
      drawRepeatedHeader(doc, facts, wordmarkBuffer, iconBuffer)
      resetTextCursorToContentArea(doc)
    }

    doc.on("pageAdded", paintPageChrome)

    try {
      doc.addPage()
      renderTechnicalSheetBody(doc, payload, record)
    } catch (e) {
      reject(e)
      return
    }
    doc.end()
  })
}
