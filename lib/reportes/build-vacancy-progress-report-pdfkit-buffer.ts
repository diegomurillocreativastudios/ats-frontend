import PDFDocument from "pdfkit"
import type { VacancyProgressByClientRow } from "@/lib/api/recruiter-reports"

/**
 * PDFKit fallback for the vacancy-progress-by-client report.
 *
 * Used by the server endpoint only when Chromium/Puppeteer fails (cold start,
 * missing binary, executor crash). Produces a sober, text-only PDF with the
 * essential summary and a per-vacancy table grouped by client so the user
 * always receives something downloadable instead of a 500.
 */

const TITLE_FALLBACK = "Avance de vacantes por cliente"

const COLOR_INK = "#111827"
const COLOR_INK_SOFT = "#374151"
const COLOR_MUTED = "#6b7280"
const COLOR_BORDER = "#d1d5db"
const COLOR_HEADER_BG = "#111827"
const COLOR_HEADER_INK = "#ffffff"

/** Estructura mínima que el endpoint pasa al fallback. */
export interface VacancyProgressReportPdfKitInput {
  rows: VacancyProgressByClientRow[]
  summary?: VacancyProgressReportPdfKitSummary | null
  fileBaseName?: string | null
  reportTitle?: string | null
}

export interface VacancyProgressReportPdfKitSummary {
  generatedAt?: string | null
  periodStart?: string | null
  periodEnd?: string | null
  clientName?: string | null
  totalCount?: number | string | null
  totalVacancies?: number | string | null
  openVacancies?: number | string | null
  totalClients?: number | string | null
  totalCandidates?: number | string | null
  vacanciesWithCandidates?: number | string | null
  vacanciesWithoutCandidates?: number | string | null
  candidatesInInterview?: number | string | null
  candidatesFinalist?: number | string | null
  candidatesHired?: number | string | null
  averagePreliminaryMatchScore?: number | string | null
  candidatesWithPreliminaryAnalysis?: number | string | null
}

type PdfDoc = InstanceType<typeof PDFDocument>

interface ClientGroup {
  clientLabel: string
  rows: VacancyProgressByClientRow[]
  totals: {
    candidates: number
    inProcess: number
    hired: number
  }
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed === "") return fallback
    const parsed = Number.parseFloat(trimmed.replace(/[,\s]/g, ""))
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function formatInt(value: unknown): string {
  if (value == null || value === "") return "0"
  const n = asNumber(value, Number.NaN)
  if (!Number.isFinite(n)) return String(value)
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(
    Math.round(n)
  )
}

function formatPercent(value: unknown): string {
  if (value == null || value === "") return "—"
  const n = asNumber(value, Number.NaN)
  if (!Number.isFinite(n)) return "—"
  const clamped = Math.max(0, Math.min(100, n))
  return `${clamped.toFixed(1)}%`
}

function formatScore(value: unknown): string {
  if (value == null || value === "") return "—"
  const n = asNumber(value, Number.NaN)
  if (!Number.isFinite(n)) return "—"
  return n.toFixed(1)
}

function safeText(value: unknown, fallback = "—"): string {
  if (value == null) return fallback
  const text = String(value).trim()
  return text === "" ? fallback : text
}

function resolveClientLabel(row: VacancyProgressByClientRow): string {
  return safeText(row.clientName ?? row.companyName, "Sin cliente")
}

function resolveProgress(row: VacancyProgressByClientRow): number | null {
  const v = row.averageApplicationProgressPercent ?? row.progressPercent
  if (v == null) return null
  const n = asNumber(v, Number.NaN)
  return Number.isFinite(n) ? n : null
}

function resolveHiredCount(row: VacancyProgressByClientRow): number {
  if (typeof row.candidatesHired === "number" && Number.isFinite(row.candidatesHired)) {
    return row.candidatesHired
  }
  const stages = row.candidatesByStage
  if (stages && typeof stages === "object") {
    for (const [key, n] of Object.entries(stages)) {
      if (/hired|contrat|seleccion|offer|oferta/i.test(key)) {
        const v = asNumber(n)
        if (v > 0) return v
      }
    }
  }
  return 0
}

function resolveInProcessCount(row: VacancyProgressByClientRow): number {
  const total = asNumber(row.totalCandidates)
  const hired = resolveHiredCount(row)
  return Math.max(0, total - hired)
}

function groupByClient(rows: VacancyProgressByClientRow[]): ClientGroup[] {
  const map = new Map<string, ClientGroup>()
  for (const row of rows) {
    const label = resolveClientLabel(row)
    const cur =
      map.get(label) ??
      ({
        clientLabel: label,
        rows: [],
        totals: { candidates: 0, inProcess: 0, hired: 0 },
      } satisfies ClientGroup)
    cur.rows.push(row)
    cur.totals.candidates += asNumber(row.totalCandidates)
    cur.totals.inProcess += resolveInProcessCount(row)
    cur.totals.hired += resolveHiredCount(row)
    map.set(label, cur)
  }
  return [...map.values()].sort((a, b) =>
    a.clientLabel.localeCompare(b.clientLabel, "es")
  )
}

interface ContentMetrics {
  left: number
  right: number
  width: number
  bottom: number
}

function contentMetrics(doc: PdfDoc): ContentMetrics {
  const left = doc.page.margins.left
  const right = doc.page.width - doc.page.margins.right
  const bottom = doc.page.height - doc.page.margins.bottom
  return { left, right, width: right - left, bottom }
}

function ensureSpace(doc: PdfDoc, neededHeight: number): void {
  const { bottom } = contentMetrics(doc)
  if (doc.y + neededHeight > bottom) {
    doc.addPage()
  }
}

function drawTitleBlock(doc: PdfDoc, input: VacancyProgressReportPdfKitInput): void {
  const { left, width } = contentMetrics(doc)
  doc.font("Helvetica-Bold").fontSize(18).fillColor(COLOR_INK)
  doc.text(input.reportTitle?.trim() || TITLE_FALLBACK, left, doc.y, {
    width,
    align: "left",
  })

  const generatedAt = input.summary?.generatedAt?.trim()
  if (generatedAt) {
    doc.moveDown(0.25)
    doc.font("Helvetica").fontSize(9.5).fillColor(COLOR_MUTED)
    doc.text(`Generado: ${generatedAt}`, left, doc.y, { width })
  }
  doc.moveDown(0.6)
}

function drawSummaryBox(
  doc: PdfDoc,
  summary: VacancyProgressReportPdfKitSummary | null | undefined
): void {
  if (!summary) return
  const { left, width } = contentMetrics(doc)

  const lines: Array<{ label: string; value: string }> = []
  if (summary.clientName?.trim()) {
    lines.push({ label: "Cliente", value: safeText(summary.clientName) })
  }
  if (summary.periodStart?.trim() || summary.periodEnd?.trim()) {
    lines.push({
      label: "Periodo",
      value: `${safeText(summary.periodStart)} — ${safeText(summary.periodEnd)}`,
    })
  }
  lines.push({
    label: "Total vacantes",
    value: formatInt(summary.totalVacancies ?? summary.totalCount),
  })
  lines.push({
    label: "Total candidatos",
    value: formatInt(summary.totalCandidates),
  })
  lines.push({
    label: "En entrevista",
    value: formatInt(summary.candidatesInInterview),
  })
  lines.push({
    label: "Contratados",
    value: formatInt(summary.candidatesHired),
  })
  if (summary.averagePreliminaryMatchScore != null) {
    lines.push({
      label: "Score IA promedio",
      value: formatScore(summary.averagePreliminaryMatchScore),
    })
  }

  if (lines.length === 0) return

  const boxPadding = 10
  const lineHeight = 14
  const boxHeight = lines.length * lineHeight + boxPadding * 2 + 6
  ensureSpace(doc, boxHeight + 6)

  const topY = doc.y
  doc.save()
  doc.lineWidth(0.75).strokeColor(COLOR_BORDER).fillColor("#f9fafb")
  doc.roundedRect(left, topY, width, boxHeight, 6).fillAndStroke("#f9fafb", COLOR_BORDER)
  doc.restore()

  doc.font("Helvetica-Bold").fontSize(10).fillColor(COLOR_INK)
  doc.text("Resumen general", left + boxPadding, topY + boxPadding, {
    width: width - boxPadding * 2,
  })

  let lineY = topY + boxPadding + 16
  for (const row of lines) {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(COLOR_INK_SOFT)
    doc.text(`${row.label}: `, left + boxPadding, lineY, {
      continued: true,
      width: width - boxPadding * 2,
    })
    doc.font("Helvetica").fillColor(COLOR_INK)
    doc.text(row.value)
    lineY += lineHeight
  }

  doc.y = topY + boxHeight + 10
}

const TABLE_COLUMNS: Array<{
  key: "vacancy" | "status" | "candidates" | "inProcess" | "hired" | "progress"
  label: string
  weight: number
  align: "left" | "center"
}> = [
  { key: "vacancy", label: "Vacante", weight: 3.4, align: "left" },
  { key: "status", label: "Estado", weight: 1.2, align: "left" },
  { key: "candidates", label: "Cand.", weight: 0.9, align: "center" },
  { key: "inProcess", label: "En proceso", weight: 1.2, align: "center" },
  { key: "hired", label: "Contratados", weight: 1.2, align: "center" },
  { key: "progress", label: "Avance", weight: 1.0, align: "center" },
]

function computeColumnWidths(totalWidth: number): number[] {
  const totalWeight = TABLE_COLUMNS.reduce((sum, col) => sum + col.weight, 0)
  return TABLE_COLUMNS.map((col) => (col.weight / totalWeight) * totalWidth)
}

function drawTableHeader(
  doc: PdfDoc,
  left: number,
  width: number,
  widths: number[]
): void {
  const headerHeight = 18
  doc.save()
  doc.fillColor(COLOR_HEADER_BG)
  doc.rect(left, doc.y, width, headerHeight).fill()
  doc.restore()

  let x = left
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLOR_HEADER_INK)
  TABLE_COLUMNS.forEach((col, idx) => {
    doc.text(col.label, x + 4, doc.y + 4, {
      width: widths[idx] - 8,
      align: col.align,
      lineBreak: false,
    })
    x += widths[idx]
  })
  doc.y += headerHeight
  doc.fillColor(COLOR_INK)
}

function drawTableRow(
  doc: PdfDoc,
  values: Record<(typeof TABLE_COLUMNS)[number]["key"], string>,
  left: number,
  widths: number[],
  totalWidth: number
): void {
  const rowMinHeight = 18
  const padding = 4
  const cellHeights: number[] = []
  doc.font("Helvetica").fontSize(8.5).fillColor(COLOR_INK)

  for (let i = 0; i < TABLE_COLUMNS.length; i++) {
    const col = TABLE_COLUMNS[i]
    const text = values[col.key]
    const h = doc.heightOfString(text, {
      width: widths[i] - padding * 2,
      align: col.align,
    })
    cellHeights.push(h)
  }
  const rowHeight = Math.max(rowMinHeight, Math.max(...cellHeights) + padding * 2)
  ensureSpace(doc, rowHeight + 4)

  if (doc.y === doc.page.margins.top) {
    drawTableHeader(doc, left, totalWidth, widths)
  }

  const rowTop = doc.y
  doc.save()
  doc.lineWidth(0.4).strokeColor("#e5e7eb")
  doc.rect(left, rowTop, totalWidth, rowHeight).stroke()
  doc.restore()

  let x = left
  for (let i = 0; i < TABLE_COLUMNS.length; i++) {
    const col = TABLE_COLUMNS[i]
    doc.font("Helvetica").fontSize(8.5).fillColor(COLOR_INK_SOFT)
    doc.text(values[col.key], x + padding, rowTop + padding, {
      width: widths[i] - padding * 2,
      align: col.align,
    })
    x += widths[i]
  }
  doc.y = rowTop + rowHeight
}

function drawClientSection(
  doc: PdfDoc,
  group: ClientGroup
): void {
  const { left, width } = contentMetrics(doc)
  const widths = computeColumnWidths(width)

  ensureSpace(doc, 60)
  doc.font("Helvetica-Bold").fontSize(11).fillColor(COLOR_INK)
  doc.text(group.clientLabel, left, doc.y, { width })
  doc.moveDown(0.2)
  doc.font("Helvetica").fontSize(8.5).fillColor(COLOR_MUTED)
  doc.text(
    `${formatInt(group.rows.length)} vacante(s) · ${formatInt(
      group.totals.candidates
    )} candidatos · ${formatInt(group.totals.hired)} contratados`,
    left,
    doc.y,
    { width }
  )
  doc.moveDown(0.4)

  drawTableHeader(doc, left, width, widths)

  const sorted = [...group.rows].sort((a, b) =>
    safeText(a.vacancyTitle, "")
      .localeCompare(safeText(b.vacancyTitle, ""), "es")
  )

  for (const row of sorted) {
    const candidates = asNumber(row.totalCandidates)
    const hired = resolveHiredCount(row)
    const inProcess = Math.max(0, candidates - hired)
    drawTableRow(
      doc,
      {
        vacancy: safeText(row.vacancyTitle, "Sin título"),
        status: safeText(row.vacancyStatus, "—"),
        candidates: formatInt(candidates),
        inProcess: formatInt(inProcess),
        hired: formatInt(hired),
        progress: formatPercent(resolveProgress(row)),
      },
      left,
      widths,
      width
    )
  }

  doc.moveDown(0.8)
}

/**
 * Generates a basic but complete PDF as a buffer using PDFKit. Used as fallback
 * when Chromium fails server-side, so the user always gets a downloadable file.
 */
export function buildVacancyProgressReportPdfKitBuffer(
  input: VacancyProgressReportPdfKitInput
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 48, bottom: 48, left: 48, right: 48 },
      autoFirstPage: true,
    })

    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    try {
      drawTitleBlock(doc, input)
      drawSummaryBox(doc, input.summary)

      const rows = Array.isArray(input.rows) ? input.rows : []
      if (rows.length === 0) {
        doc.moveDown(1)
        doc.font("Helvetica").fontSize(11).fillColor(COLOR_MUTED)
        doc.text(
          "No hay vacantes registradas para los filtros seleccionados.",
          { align: "left" }
        )
        doc.end()
        return
      }

      const groups = groupByClient(rows)
      for (const group of groups) {
        drawClientSection(doc, group)
      }

      doc.end()
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)))
    }
  })
}
