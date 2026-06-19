import PDFDocument from "pdfkit"
import type { VacancyProgressByClientRow } from "@/lib/api/recruiter-reports"
import type { ReportSchema } from "@/lib/reportes/schema/report-schema-types"
import { renderReportSchemaToPdfKit } from "@/lib/reportes/schema/render-report-schema-to-pdfkit"
import { buildVacancyProgressReportTemplateContext } from "@/lib/reportes/vacancy-progress-report-template-context"
import { VACANCY_PROGRESS_PDF_TEMPLATE_VERSION } from "@/lib/reportes/vacancy-progress-pdf-constants"
import {
  buildExecutiveInsights,
  computeAvanceVacantesDashboardKpis,
  type ExecutiveInsight,
} from "@/lib/reportes-avance-vacantes-helpers"
import { formatVacancyStatusSlug } from "@/lib/reportes-display"
import {
  formatExecutiveInt,
  formatExecutivePercent,
} from "@/lib/reportes/executive-summary-metrics"
import {
  vacancyClientLabel,
  vacancyProgressPercentValue,
  vacancyStageCounts,
} from "@/lib/reportes-metrics"

export { VACANCY_PROGRESS_PDF_TEMPLATE_VERSION }

const EM_DASH = "—"
const PAGE_W = 612
const PAGE_H = 792
const PAGE_MARGIN = 48
const MARGIN = {
  top: PAGE_MARGIN,
  bottom: PAGE_MARGIN,
  left: PAGE_MARGIN,
  right: PAGE_MARGIN,
}
const CONTENT_W = PAGE_W - MARGIN.left - MARGIN.right
const FOOTER_DEBUG_MARKER_PREFIX = "PDFKit v2 · "

/**
 * Vertical safety area reserved at the bottom of every page so table rows and
 * card content never overlap the page footer text.
 */
const FOOTER_RESERVE = 28

const COLOR_INK = "#202124"
const COLOR_INK_SOFT = "#3D3E41"
const COLOR_MUTED = "#5A5B5E"
const COLOR_BORDER = "#EAE0D5"
const COLOR_HEADER_BG = "#202124"
const COLOR_HEADER_INK = "#ffffff"
const COLOR_FILL_LIGHT = "#FBFAF7"
const COLOR_PROGRESS_TRACK = "#EAE0D5"

export interface VacancyProgressReportPdfKitInput {
  rows: VacancyProgressByClientRow[]
  summary?: VacancyProgressReportPdfKitSummary | null
  fileBaseName?: string | null
  reportTitle?: string | null
  schema: ReportSchema
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

interface ContentMetrics {
  left: number
  right: number
  width: number
  bottom: number
}

interface FormattedVacancyRow {
  row: VacancyProgressByClientRow
  clientLabel: string
  vacancyTitleLabel: string
  vacancyStatusLabel: string
  openedAtLabel: string
  closedAtLabel: string
  totalCandidatesLabel: string
  interviewLabel: string
  finalistLabel: string
  hiredLabel: string
  progressPercentLabel: string
  progressPercentSafe: number
  averagePreliminaryMatchScoreLabel: string
  minPreliminaryMatchScoreLabel: string
  maxPreliminaryMatchScoreLabel: string
  averageDaysToFillLabel: string
  stageEntries: Array<{ name: string; count: string }>
}

interface ClientAggregate {
  clientLabel: string
  vacancies: number
  candidates: number
  withAi: number
  hired: number
}

interface PdfTableColumn {
  label: string
  /** Relative weight (in points). Widths are normalized to fit the content area. */
  width: number
  align?: "left" | "center" | "right"
}

interface AddPdfTableOptions {
  columns: PdfTableColumn[]
  rows: string[][]
  emptyMessage: string
  fontSize?: number
  headerFontSize?: number
  cellPadding?: number
  minRowHeight?: number
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
  return formatExecutiveInt(Math.round(n))
}

function formatScore(value: unknown): string {
  if (value == null || value === "") return EM_DASH
  const n = asNumber(value, Number.NaN)
  if (!Number.isFinite(n)) return EM_DASH
  return n.toFixed(1)
}

function formatSpanishDate(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return EM_DASH
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(d)
}

function formatDaysLabel(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return EM_DASH
  return formatExecutiveInt(Math.round(Number(value)))
}

function progressPercentSafe(value: number | null | undefined): number {
  if (value == null || Number.isNaN(Number(value))) return 0
  const n = Number(value)
  return Math.max(0, Math.min(100, n))
}

function resolvePeriodLabel(periodStart: string, periodEnd: string): string {
  const left = periodStart.trim() === "" ? EM_DASH : periodStart
  const right = periodEnd.trim() === "" ? EM_DASH : periodEnd
  if (left === EM_DASH && right === EM_DASH) return EM_DASH
  return `${left} ${EM_DASH} ${right}`
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

function buildFormattedRow(row: VacancyProgressByClientRow): FormattedVacancyRow {
  const stageCounts = vacancyStageCounts(row)
  const progress = vacancyProgressPercentValue(row)
  const interview = stageCounts.interview ?? row.candidatesInInterview ?? 0
  const finalist = stageCounts.finalist ?? row.candidatesFinalist ?? 0
  const hired = stageCounts.hired ?? resolveHiredCount(row)

  const stageEntries = row.candidatesByStage
    ? Object.entries(row.candidatesByStage)
        .filter(([, n]) => typeof n === "number" && n > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count: formatInt(count) }))
    : []

  return {
    row,
    clientLabel: vacancyClientLabel(row),
    vacancyTitleLabel: String(row.vacancyTitle ?? EM_DASH).trim() || EM_DASH,
    vacancyStatusLabel: formatVacancyStatusSlug(row.vacancyStatus),
    openedAtLabel: formatSpanishDate(row.openedAt),
    closedAtLabel: formatSpanishDate(row.closedAt),
    totalCandidatesLabel: formatInt(row.totalCandidates),
    interviewLabel: formatInt(interview),
    finalistLabel: formatInt(finalist),
    hiredLabel: formatInt(hired),
    progressPercentLabel: formatExecutivePercent(progress),
    progressPercentSafe: progressPercentSafe(progress),
    averagePreliminaryMatchScoreLabel: formatScore(row.averagePreliminaryMatchScore),
    minPreliminaryMatchScoreLabel: formatScore(row.minPreliminaryMatchScore),
    maxPreliminaryMatchScoreLabel: formatScore(row.maxPreliminaryMatchScore),
    averageDaysToFillLabel: formatDaysLabel(row.averageDaysToFill),
    stageEntries,
  }
}

function aggregateByClient(rows: VacancyProgressByClientRow[]): ClientAggregate[] {
  const map = new Map<string, ClientAggregate>()
  for (const row of rows) {
    const label = vacancyClientLabel(row)
    const cur =
      map.get(label) ??
      ({
        clientLabel: label,
        vacancies: 0,
        candidates: 0,
        withAi: 0,
        hired: 0,
      } satisfies ClientAggregate)
    cur.vacancies += 1
    cur.candidates += asNumber(row.totalCandidates)
    cur.withAi += asNumber(row.candidatesWithPreliminaryAnalysis)
    cur.hired += resolveHiredCount(row)
    map.set(label, cur)
  }
  return [...map.values()].sort((a, b) =>
    a.clientLabel.localeCompare(b.clientLabel, "es")
  )
}

function pickInsight(
  rows: VacancyProgressByClientRow[],
  id: ExecutiveInsight["id"]
): { label: string; metric: string } {
  const found = buildExecutiveInsights(rows).find((i) => i.id === id)
  if (!found || found.isEmpty) return { label: EM_DASH, metric: EM_DASH }
  return { label: found.description, metric: found.metric }
}

function contentMetrics(doc: PdfDoc): ContentMetrics {
  const left = doc.page.margins.left
  const right = doc.page.width - doc.page.margins.right
  const bottom = doc.page.height - doc.page.margins.bottom
  return { left, right, width: right - left, bottom }
}

/**
 * Returns the maximum y coordinate where content may flow on the current page
 * while keeping `FOOTER_RESERVE` points of breathing room above the page footer.
 */
function bottomContentLimit(doc: PdfDoc): number {
  return doc.page.height - doc.page.margins.bottom - FOOTER_RESERVE
}

function ensureSpace(doc: PdfDoc, neededHeight: number): void {
  if (doc.y + neededHeight > bottomContentLimit(doc)) {
    doc.addPage()
  }
}

interface PageFooterOptions {
  pageNumber: number
  totalPages: number
  templateVersion: string
  showDebugMarker: boolean
}

/**
 * Writes footer text on the current page only. Must not call `doc.addPage()`.
 */
function addPageFooter(doc: PdfDoc, options: PageFooterOptions): void {
  const bottomY = doc.page.height - 32
  const savedBottomMargin = doc.page.margins.bottom

  doc.page.margins.bottom = 0
  doc.x = MARGIN.left
  doc.y = bottomY

  doc.font("Helvetica").fontSize(7).fillColor("#9ca3af")

  if (options.showDebugMarker) {
    doc.text(`${FOOTER_DEBUG_MARKER_PREFIX}${options.templateVersion}`, MARGIN.left, bottomY, {
      width: 250,
      align: "left",
      lineBreak: false,
    })
  }

  doc.text(
    `Página ${options.pageNumber} de ${options.totalPages}`,
    doc.page.width - 180,
    bottomY,
    {
      width: 132,
      align: "right",
      lineBreak: false,
    }
  )

  doc.fillColor(COLOR_INK)
  doc.page.margins.bottom = savedBottomMargin
}

function applyBufferedPageFooters(doc: PdfDoc): void {
  const range = doc.bufferedPageRange()
  const totalPages = range.count
  const showDebugMarker = process.env.NODE_ENV !== "production"

  for (let pageIndex = range.start; pageIndex < range.start + totalPages; pageIndex++) {
    doc.switchToPage(pageIndex)
    addPageFooter(doc, {
      pageNumber: pageIndex - range.start + 1,
      totalPages,
      templateVersion: VACANCY_PROGRESS_PDF_TEMPLATE_VERSION,
      showDebugMarker,
    })
  }
}

function drawReportHeader(
  doc: PdfDoc,
  input: {
    generatedAt: string
    periodLabel: string
    totalCount: string
  }
): void {
  const { left, width } = contentMetrics(doc)
  const headerTop = doc.y

  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(COLOR_MUTED)
  doc.text("REPORTE DE RECLUTAMIENTO", left, headerTop, { width: width * 0.62 })

  doc.font("Helvetica-Bold").fontSize(20).fillColor(COLOR_INK)
  doc.text("Estado de vacantes y candidatos", left, doc.y + 4, {
    width: width * 0.62,
  })

  doc.font("Helvetica").fontSize(9).fillColor(COLOR_INK_SOFT)
  doc.text(
    "Resumen informativo del estado actual de las vacantes, candidatos asociados, avance del proceso, etapas del pipeline, métricas de contratación y resultados del análisis preliminar generado por inteligencia artificial.",
    left,
    doc.y + 6,
    { width: width * 0.62, align: "justify" }
  )

  const metaLeft = left + width * 0.66
  const metaWidth = width * 0.34
  const metaTop = headerTop
  const metaPadding = 10
  const metaHeight = 78

  doc.save()
  doc.lineWidth(0.75).strokeColor(COLOR_BORDER).fillColor(COLOR_FILL_LIGHT)
  doc.roundedRect(metaLeft, metaTop, metaWidth, metaHeight, 6).fillAndStroke(
    COLOR_FILL_LIGHT,
    COLOR_BORDER
  )
  doc.restore()

  const metaRows: Array<{ label: string; value: string }> = [
    { label: "Fecha de generación", value: input.generatedAt },
    { label: "Periodo", value: input.periodLabel },
    { label: "Total de registros", value: input.totalCount },
  ]

  let metaY = metaTop + metaPadding
  for (const row of metaRows) {
    doc.font("Helvetica-Bold").fontSize(7).fillColor(COLOR_MUTED)
    doc.text(row.label.toUpperCase(), metaLeft + metaPadding, metaY, {
      width: metaWidth - metaPadding * 2,
    })
    doc.font("Helvetica-Bold").fontSize(9).fillColor(COLOR_INK)
    doc.text(row.value, metaLeft + metaPadding, doc.y + 2, {
      width: metaWidth - metaPadding * 2,
    })
    metaY = doc.y + 6
  }

  doc.y = Math.max(doc.y, metaTop + metaHeight) + 14
  doc.save()
  doc.moveTo(left, doc.y).lineTo(left + width, doc.y).lineWidth(1.2).strokeColor(COLOR_BORDER)
  doc.restore()
  doc.y += 16
}

interface DrawSectionTitleOptions {
  /**
   * Extra vertical space (points) that should fit on the current page right
   * after the section title. Used to avoid leaving a section title alone at
   * the bottom of a page when the following table cannot fit.
   */
  reserveAfterTitle?: number
}

const SECTION_TITLE_SPACE = 36

function drawSectionTitle(
  doc: PdfDoc,
  title: string,
  options: DrawSectionTitleOptions = {}
): void {
  const { left, width } = contentMetrics(doc)
  const reserve = options.reserveAfterTitle ?? 0
  ensureSpace(doc, SECTION_TITLE_SPACE + reserve)
  doc.font("Helvetica-Bold").fontSize(12).fillColor(COLOR_INK)
  doc.text(title, left, doc.y, { width })
  const lineY = doc.y + 4
  doc.save()
  doc.moveTo(left, lineY).lineTo(left + width, lineY).lineWidth(1.5).strokeColor(COLOR_INK)
  doc.restore()
  doc.y = lineY + 12
}

function drawKpiCard(
  doc: PdfDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  help?: string
): void {
  doc.save()
  doc.lineWidth(0.6).strokeColor(COLOR_BORDER).fillColor("#FBFAF7")
  doc.roundedRect(x, y, w, h, 6).fillAndStroke("#FBFAF7", COLOR_BORDER)
  doc.restore()

  const pad = 8
  doc.font("Helvetica-Bold").fontSize(7).fillColor(COLOR_MUTED)
  doc.text(label.toUpperCase(), x + pad, y + pad, { width: w - pad * 2 })
  doc.font("Helvetica-Bold").fontSize(15).fillColor(COLOR_INK)
  doc.text(value, x + pad, doc.y + 3, { width: w - pad * 2 })
  if (help) {
    doc.font("Helvetica").fontSize(7.5).fillColor(COLOR_MUTED)
    doc.text(help, x + pad, doc.y + 2, { width: w - pad * 2 })
  }
}

function drawExecutiveSummary(
  doc: PdfDoc,
  metrics: {
    totalVacancies: string
    openVacancies: string
    totalClients: string
    totalCandidates: string
    vacanciesWithCandidates: string
    averageAiScore: string
    candidatesWithAiAnalysis: string
    totalInInterview: string
    totalFinalists: string
    totalHired: string
    vacanciesWithoutCandidates: string
  }
): void {
  drawSectionTitle(doc, "1. Resumen ejecutivo")

  const { left, width } = contentMetrics(doc)
  const gap = 8
  const cols = 4
  const cardW = (width - gap * (cols - 1)) / cols
  const cardH = 58
  const rowGap = 8

  const primary: Array<{ label: string; value: string; help?: string }> = [
    { label: "Vacantes", value: metrics.totalVacancies, help: `${metrics.openVacancies} abiertas` },
    { label: "Clientes", value: metrics.totalClients, help: "Con vacantes registradas" },
    {
      label: "Candidatos",
      value: metrics.totalCandidates,
      help: `${metrics.vacanciesWithCandidates} vacantes con candidatos`,
    },
    {
      label: "Score IA promedio",
      value: metrics.averageAiScore,
      help: `${metrics.candidatesWithAiAnalysis} con análisis IA`,
    },
  ]

  const secondary: Array<{ label: string; value: string }> = [
    { label: "En entrevista", value: metrics.totalInInterview },
    { label: "Finalistas", value: metrics.totalFinalists },
    { label: "Contratados", value: metrics.totalHired },
    { label: "Vacantes sin candidatos", value: metrics.vacanciesWithoutCandidates },
  ]

  ensureSpace(doc, cardH * 2 + rowGap + 8)
  let rowY = doc.y

  for (let i = 0; i < primary.length; i++) {
    const col = i % cols
    const x = left + col * (cardW + gap)
    drawKpiCard(doc, x, rowY, cardW, cardH, primary[i].label, primary[i].value, primary[i].help)
  }

  rowY += cardH + rowGap
  for (let i = 0; i < secondary.length; i++) {
    const col = i % cols
    const x = left + col * (cardW + gap)
    drawKpiCard(doc, x, rowY, cardW, cardH, secondary[i].label, secondary[i].value)
  }

  doc.y = rowY + cardH + 14
}

function drawInsightsSection(
  doc: PdfDoc,
  rows: VacancyProgressByClientRow[]
): void {
  drawSectionTitle(doc, "2. Hallazgos principales")

  const { left, width } = contentMetrics(doc)
  const insights = buildExecutiveInsights(rows)
    .filter((item) => !item.isEmpty || item.id === "zero-candidates")
    .slice(0, 4)

  const boxPadding = 12
  const lineHeight = 13
  const boxHeight = Math.max(48, insights.length * lineHeight + boxPadding * 2 + 4)
  ensureSpace(doc, boxHeight + 70)

  const boxTop = doc.y
  doc.save()
  doc.lineWidth(0.75).strokeColor(COLOR_BORDER).fillColor(COLOR_FILL_LIGHT)
  doc.roundedRect(left, boxTop, width, boxHeight, 6).fillAndStroke(COLOR_FILL_LIGHT, COLOR_BORDER)
  doc.restore()

  let bulletY = boxTop + boxPadding
  doc.font("Helvetica").fontSize(8.5).fillColor(COLOR_INK_SOFT)
  for (const item of insights) {
    doc.text(`• ${item.title}: ${item.description} (${item.metric})`, left + boxPadding, bulletY, {
      width: width - boxPadding * 2,
      align: "justify",
    })
    bulletY = doc.y + 4
  }

  if (insights.length === 0) {
    doc.text("No hay hallazgos destacados para los filtros actuales.", left + boxPadding, bulletY, {
      width: width - boxPadding * 2,
    })
  }

  doc.y = boxTop + boxHeight + 10

  const topProgress = pickInsight(rows, "max-progress")
  const topAiScore = pickInsight(rows, "best-match")
  const topCandidates = pickInsight(rows, "most-candidates")
  const topCards = [
    { title: "Vacante con mayor avance", ...topProgress },
    { title: "Mejor emparejamiento IA", ...topAiScore },
    { title: "Más candidatos", ...topCandidates },
  ]

  const gap = 8
  const cardW = (width - gap * 2) / 3
  const cardH = 52
  ensureSpace(doc, cardH + 8)
  const cardsTop = doc.y

  for (let i = 0; i < topCards.length; i++) {
    const x = left + i * (cardW + gap)
    const card = topCards[i]
    doc.save()
    doc.lineWidth(0.6).strokeColor(COLOR_BORDER).fillColor("#FBFAF7")
    doc.roundedRect(x, cardsTop, cardW, cardH, 6).fillAndStroke("#FBFAF7", COLOR_BORDER)
    doc.restore()

    doc.font("Helvetica-Bold").fontSize(7).fillColor(COLOR_MUTED)
    doc.text(card.title.toUpperCase(), x + 8, cardsTop + 8, { width: cardW - 16 })
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLOR_INK)
    doc.text(card.label, x + 8, doc.y + 4, { width: cardW - 16 })
    doc.font("Helvetica-Bold").fontSize(9).fillColor(COLOR_INK)
    doc.text(card.metric, x + 8, doc.y + 4, { width: cardW - 16 })
  }

  doc.y = cardsTop + cardH + 14
}

const TABLE_DEFAULT_FONT_SIZE = 7.5
const TABLE_DEFAULT_HEADER_FONT_SIZE = 7.5
const TABLE_DEFAULT_CELL_PADDING = 4
const TABLE_DEFAULT_MIN_ROW_HEIGHT = 16
const TABLE_MIN_HEADER_HEIGHT = 24

/**
 * Normalizes the configured column widths so the table always spans
 * `totalWidth`. Values are treated as relative weights, allowing callers to use
 * intuitive point-like numbers without worrying about exact totals.
 */
function normalizeColumnWidths(
  columns: PdfTableColumn[],
  totalWidth: number
): number[] {
  const sum = columns.reduce((acc, col) => acc + col.width, 0)
  if (sum <= 0) {
    const equal = totalWidth / Math.max(1, columns.length)
    return columns.map(() => equal)
  }
  return columns.map((col) => (col.width / sum) * totalWidth)
}

function measureHeaderHeight(
  doc: PdfDoc,
  columns: PdfTableColumn[],
  widths: number[],
  headerFontSize: number,
  cellPadding: number
): number {
  doc.font("Helvetica-Bold").fontSize(headerFontSize)
  const textHeights = columns.map((col, idx) =>
    doc.heightOfString(col.label, {
      width: widths[idx] - cellPadding * 2,
      lineGap: 1,
    })
  )
  const tallest = textHeights.length > 0 ? Math.max(...textHeights) : 0
  return Math.max(TABLE_MIN_HEADER_HEIGHT, Math.ceil(tallest + cellPadding * 2 + 2))
}

function measureRowHeight(
  doc: PdfDoc,
  values: string[],
  columns: PdfTableColumn[],
  widths: number[],
  fontSize: number,
  cellPadding: number,
  minRowHeight: number
): number {
  doc.font("Helvetica").fontSize(fontSize)
  const cellHeights = values.map((text, idx) =>
    doc.heightOfString(text, {
      width: widths[idx] - cellPadding * 2,
      align: columns[idx].align ?? "left",
      lineGap: 1,
    })
  )
  const tallest = cellHeights.length > 0 ? Math.max(...cellHeights) : 0
  return Math.max(minRowHeight, Math.ceil(tallest + cellPadding * 2))
}

function drawTableHeaderRow(
  doc: PdfDoc,
  left: number,
  widths: number[],
  columns: PdfTableColumn[],
  headerHeight: number,
  headerFontSize: number,
  cellPadding: number
): void {
  const totalWidth = widths.reduce((acc, w) => acc + w, 0)
  const headerTop = doc.y

  doc.save()
  doc.fillColor(COLOR_HEADER_BG)
  doc.rect(left, headerTop, totalWidth, headerHeight).fill()
  doc.restore()

  doc.font("Helvetica-Bold").fontSize(headerFontSize).fillColor(COLOR_HEADER_INK)

  let x = left
  columns.forEach((col, idx) => {
    const colWidth = widths[idx]
    const textWidth = colWidth - cellPadding * 2
    const textHeight = doc.heightOfString(col.label, {
      width: textWidth,
      lineGap: 1,
    })
    const textY = headerTop + Math.max(0, (headerHeight - textHeight) / 2)
    doc.text(col.label, x + cellPadding, textY, {
      width: textWidth,
      align: col.align ?? "left",
      lineGap: 1,
    })
    x += colWidth
  })

  doc.y = headerTop + headerHeight
  doc.fillColor(COLOR_INK)
}

function drawTableBodyRow(
  doc: PdfDoc,
  values: string[],
  left: number,
  widths: number[],
  columns: PdfTableColumn[],
  rowHeight: number,
  fontSize: number,
  cellPadding: number,
  stripe: boolean
): void {
  const totalWidth = widths.reduce((acc, w) => acc + w, 0)
  const rowTop = doc.y

  if (stripe) {
    doc.save()
    doc.fillColor(COLOR_FILL_LIGHT)
    doc.rect(left, rowTop, totalWidth, rowHeight).fill()
    doc.restore()
  }

  doc.save()
  doc.lineWidth(0.35).strokeColor("#EAE0D5")
  doc.rect(left, rowTop, totalWidth, rowHeight).stroke()
  doc.restore()

  doc.font("Helvetica").fontSize(fontSize).fillColor(COLOR_INK_SOFT)

  let x = left
  values.forEach((text, idx) => {
    doc.text(text, x + cellPadding, rowTop + cellPadding, {
      width: widths[idx] - cellPadding * 2,
      align: columns[idx].align ?? "left",
      lineGap: 1,
    })
    x += widths[idx]
  })

  doc.y = rowTop + rowHeight
}

/**
 * Estimates the minimum vertical space required to render the table header
 * plus the first `sampleRowCount` rows. Used by section helpers to decide if
 * the section title should move to a new page so the table never starts cut
 * off at the bottom of the previous page.
 */
function estimateTableMinHeight(
  doc: PdfDoc,
  options: AddPdfTableOptions,
  sampleRowCount = 2
): number {
  const fontSize = options.fontSize ?? TABLE_DEFAULT_FONT_SIZE
  const headerFontSize = options.headerFontSize ?? TABLE_DEFAULT_HEADER_FONT_SIZE
  const cellPadding = options.cellPadding ?? TABLE_DEFAULT_CELL_PADDING
  const minRowHeight = options.minRowHeight ?? TABLE_DEFAULT_MIN_ROW_HEIGHT

  const { width } = contentMetrics(doc)
  const widths = normalizeColumnWidths(options.columns, width)
  const headerHeight = measureHeaderHeight(
    doc,
    options.columns,
    widths,
    headerFontSize,
    cellPadding
  )

  const previewRows =
    options.rows.length === 0
      ? [
          [
            options.emptyMessage,
            ...Array(Math.max(0, options.columns.length - 1)).fill(""),
          ],
        ]
      : options.rows.slice(0, sampleRowCount)

  const rowsHeight = previewRows.reduce(
    (acc, values) =>
      acc +
      measureRowHeight(
        doc,
        values,
        options.columns,
        widths,
        fontSize,
        cellPadding,
        minRowHeight
      ),
    0
  )

  return headerHeight + rowsHeight + 8
}

/**
 * Renders a paginated table whose layout is fully self-managed:
 *  - column widths normalize to fit the content area
 *  - header height grows dynamically with `doc.heightOfString`
 *  - the header is never drawn alone at the bottom of a page
 *  - the header is repeated whenever the table continues on a new page
 *  - the bottom safe area defined by `FOOTER_RESERVE` is always respected
 */
function addPdfTable(doc: PdfDoc, options: AddPdfTableOptions): void {
  const fontSize = options.fontSize ?? TABLE_DEFAULT_FONT_SIZE
  const headerFontSize = options.headerFontSize ?? TABLE_DEFAULT_HEADER_FONT_SIZE
  const cellPadding = options.cellPadding ?? TABLE_DEFAULT_CELL_PADDING
  const minRowHeight = options.minRowHeight ?? TABLE_DEFAULT_MIN_ROW_HEIGHT

  const { left, width } = contentMetrics(doc)
  const widths = normalizeColumnWidths(options.columns, width)
  const headerHeight = measureHeaderHeight(
    doc,
    options.columns,
    widths,
    headerFontSize,
    cellPadding
  )

  const drawHeader = (): void =>
    drawTableHeaderRow(
      doc,
      left,
      widths,
      options.columns,
      headerHeight,
      headerFontSize,
      cellPadding
    )

  if (options.rows.length === 0) {
    const emptyValues: string[] = [
      options.emptyMessage,
      ...Array(Math.max(0, options.columns.length - 1)).fill(""),
    ]
    const emptyHeight = measureRowHeight(
      doc,
      emptyValues,
      options.columns,
      widths,
      fontSize,
      cellPadding,
      minRowHeight
    )
    ensureSpace(doc, headerHeight + emptyHeight)
    drawHeader()
    drawTableBodyRow(
      doc,
      emptyValues,
      left,
      widths,
      options.columns,
      emptyHeight,
      fontSize,
      cellPadding,
      false
    )
    return
  }

  const firstRowHeight = measureRowHeight(
    doc,
    options.rows[0],
    options.columns,
    widths,
    fontSize,
    cellPadding,
    minRowHeight
  )
  ensureSpace(doc, headerHeight + firstRowHeight)
  drawHeader()

  for (let i = 0; i < options.rows.length; i++) {
    const values = options.rows[i]
    const rowHeight = measureRowHeight(
      doc,
      values,
      options.columns,
      widths,
      fontSize,
      cellPadding,
      minRowHeight
    )

    if (doc.y + rowHeight > bottomContentLimit(doc)) {
      doc.addPage()
      drawHeader()
    }

    drawTableBodyRow(
      doc,
      values,
      left,
      widths,
      options.columns,
      rowHeight,
      fontSize,
      cellPadding,
      i % 2 === 1
    )
  }
}

function drawClientDistributionSection(
  doc: PdfDoc,
  aggregates: ClientAggregate[]
): void {
  const columns: PdfTableColumn[] = [
    { label: "Cliente", width: 220, align: "left" },
    { label: "Vacantes", width: 90, align: "center" },
    { label: "Candidatos", width: 100, align: "center" },
    { label: "Con análisis IA", width: 120, align: "center" },
    { label: "Contratados", width: 110, align: "center" },
  ]
  const tableRows = aggregates.map((c) => [
    c.clientLabel,
    formatInt(c.vacancies),
    formatInt(c.candidates),
    formatInt(c.withAi),
    formatInt(c.hired),
  ])
  const tableOptions: AddPdfTableOptions = {
    columns,
    rows: tableRows,
    emptyMessage: "Sin datos para los filtros aplicados.",
  }

  drawSectionTitle(doc, "3. Distribución por cliente", {
    reserveAfterTitle: estimateTableMinHeight(doc, tableOptions),
  })
  addPdfTable(doc, tableOptions)
  doc.moveDown(0.6)
}

function drawVacancyIndexSection(doc: PdfDoc, formatted: FormattedVacancyRow[]): void {
  const columns: PdfTableColumn[] = [
    { label: "Cliente", width: 130, align: "left" },
    { label: "Vacante", width: 165, align: "left" },
    { label: "Estado", width: 70, align: "center" },
    { label: "Apertura", width: 90, align: "center" },
    { label: "Avance", width: 75, align: "center" },
    { label: "Score IA", width: 75, align: "center" },
    { label: "Cand.", width: 55, align: "center" },
  ]
  const tableRows = formatted.map((f) => [
    f.clientLabel,
    f.vacancyTitleLabel,
    f.vacancyStatusLabel,
    f.openedAtLabel,
    f.progressPercentLabel,
    f.averagePreliminaryMatchScoreLabel,
    f.totalCandidatesLabel,
  ])
  const tableOptions: AddPdfTableOptions = {
    columns,
    rows: tableRows,
    emptyMessage: "Sin vacantes en el periodo.",
  }

  drawSectionTitle(doc, "4. Índice general de vacantes", {
    reserveAfterTitle: estimateTableMinHeight(doc, tableOptions),
  })
  addPdfTable(doc, tableOptions)
  doc.moveDown(0.6)
}

function drawProgressBar(
  doc: PdfDoc,
  left: number,
  width: number,
  percent: number,
  label: string
): void {
  const trackH = 6
  const top = doc.y
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(COLOR_INK_SOFT)
  doc.text("Avance del proceso", left, top, { width: width * 0.7, continued: false })
  doc.text(label, left, top, { width, align: "right", lineBreak: false })
  const trackY = top + 12
  doc.save()
  doc.fillColor(COLOR_PROGRESS_TRACK)
  doc.roundedRect(left, trackY, width, trackH, 3).fill()
  const fillW = Math.max(0, (width * percent) / 100)
  if (fillW > 0) {
    doc.fillColor(COLOR_INK)
    doc.roundedRect(left, trackY, fillW, trackH, 3).fill()
  }
  doc.restore()
  doc.y = trackY + trackH + 8
}

function drawVacancyDetailCard(doc: PdfDoc, formatted: FormattedVacancyRow): void {
  const { left, width } = contentMetrics(doc)
  const padding = 12
  const statusBadgeWidth = Math.min(width * 0.28, 150)
  const statusGap = 16
  const headerTextWidth = width - padding * 2 - statusBadgeWidth - statusGap

  const titleHeight = doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .heightOfString(formatted.vacancyTitleLabel, {
      width: headerTextWidth,
      lineGap: 2,
    })

  const clientHeight = doc
    .font("Helvetica")
    .fontSize(10)
    .heightOfString(formatted.clientLabel, {
      width: headerTextWidth,
      lineGap: 2,
    })

  const statusLabel = `Estado: ${formatted.vacancyStatusLabel}`
  const statusHeight = doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .heightOfString(statusLabel, {
      width: statusBadgeWidth,
      align: "right",
    })

  const titleClientBlockHeight = titleHeight + 8 + clientHeight
  const headerBlockHeight = Math.max(titleClientBlockHeight, statusHeight)

  const infoLabelHeight = doc
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .heightOfString("X")
  const infoValueHeight = doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .heightOfString("X")
  const infoRowHeight = infoLabelHeight + 4 + infoValueHeight

  const miniCardHeight = 36
  const aiCardHeight = 30
  const progressHeight = 26

  const pipelineLabelHeight = doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .heightOfString("PIPELINE POR ETAPA")

  const pipelineMaxLineWidth = width - padding * 2
  let pillsBlockHeight = 0
  if (formatted.stageEntries.length === 0) {
    pillsBlockHeight = doc
      .font("Helvetica")
      .fontSize(8)
      .heightOfString(`Sin etapas registradas ${EM_DASH}`, {
        width: pipelineMaxLineWidth,
      })
  } else {
    doc.font("Helvetica").fontSize(7)
    let curX = 0
    let pillLines = 1
    for (const stage of formatted.stageEntries) {
      const pillWidth = doc.widthOfString(`${stage.name} ${stage.count}`) + 18
      if (curX > 0 && curX + pillWidth > pipelineMaxLineWidth) {
        pillLines += 1
        curX = pillWidth + 6
      } else {
        curX += pillWidth + 6
      }
    }
    pillsBlockHeight = pillLines * 16
  }

  const cardHeight =
    padding +
    headerBlockHeight +
    16 +
    infoRowHeight +
    12 +
    miniCardHeight +
    10 +
    aiCardHeight +
    12 +
    progressHeight +
    8 +
    pipelineLabelHeight +
    6 +
    pillsBlockHeight +
    padding

  ensureSpace(doc, cardHeight + 10)

  const cardTop = doc.y
  doc.save()
  doc.lineWidth(0.75).strokeColor(COLOR_BORDER).fillColor("#FBFAF7")
  doc.roundedRect(left, cardTop, width, cardHeight, 8).stroke()
  doc.restore()

  const titleY = cardTop + padding
  doc.font("Helvetica-Bold").fontSize(13).fillColor(COLOR_INK)
  doc.text(formatted.vacancyTitleLabel, left + padding, titleY, {
    width: headerTextWidth,
    lineGap: 2,
  })

  const clientY = titleY + titleHeight + 8
  doc.font("Helvetica").fontSize(10).fillColor(COLOR_MUTED)
  doc.text(formatted.clientLabel, left + padding, clientY, {
    width: headerTextWidth,
    lineGap: 2,
  })

  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLOR_INK_SOFT)
  doc.text(statusLabel, left + width - padding - statusBadgeWidth, titleY, {
    width: statusBadgeWidth,
    align: "right",
  })

  let cursorY = cardTop + padding + headerBlockHeight + 16

  const infoCols = 4
  const infoW = (width - padding * 2) / infoCols
  const infoLabels = ["Apertura", "Cierre", "Candidatos", "Días para cierre"]
  const infoValues = [
    formatted.openedAtLabel,
    formatted.closedAtLabel,
    formatted.totalCandidatesLabel,
    formatted.averageDaysToFillLabel,
  ]
  for (let i = 0; i < infoCols; i++) {
    const x = left + padding + i * infoW
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor(COLOR_MUTED)
    doc.text(infoLabels[i].toUpperCase(), x, cursorY, {
      width: infoW - 4,
      lineBreak: false,
    })
    doc.font("Helvetica-Bold").fontSize(8).fillColor(COLOR_INK)
    doc.text(infoValues[i], x, cursorY + infoLabelHeight + 4, {
      width: infoW - 4,
      lineBreak: false,
    })
  }
  cursorY += infoRowHeight + 12

  const miniCols = 5
  const miniGap = 6
  const miniW = (width - padding * 2 - miniGap * (miniCols - 1)) / miniCols
  const miniMetrics = [
    { label: "Candidatos", value: formatted.totalCandidatesLabel },
    { label: "Entrevista", value: formatted.interviewLabel },
    { label: "Finalistas", value: formatted.finalistLabel },
    { label: "Contratados", value: formatted.hiredLabel },
    { label: "Score IA", value: formatted.averagePreliminaryMatchScoreLabel },
  ]
  for (let i = 0; i < miniMetrics.length; i++) {
    const x = left + padding + i * (miniW + miniGap)
    doc.save()
    doc.lineWidth(0.5).strokeColor(COLOR_BORDER)
    doc.roundedRect(x, cursorY, miniW, miniCardHeight, 5).stroke()
    doc.restore()
    doc.font("Helvetica-Bold").fontSize(6).fillColor(COLOR_MUTED)
    doc.text(miniMetrics[i].label.toUpperCase(), x + 4, cursorY + 6, {
      width: miniW - 8,
      align: "center",
      lineBreak: false,
    })
    doc.font("Helvetica-Bold").fontSize(11).fillColor(COLOR_INK)
    doc.text(miniMetrics[i].value, x + 4, cursorY + 18, {
      width: miniW - 8,
      align: "center",
      lineBreak: false,
    })
  }
  cursorY += miniCardHeight + 10

  const aiCols = 3
  const aiGap = 6
  const aiW = (width - padding * 2 - aiGap * 2) / aiCols
  const aiLabels = ["Score IA mínimo", "Score IA promedio", "Score IA máximo"]
  const aiValues = [
    formatted.minPreliminaryMatchScoreLabel,
    formatted.averagePreliminaryMatchScoreLabel,
    formatted.maxPreliminaryMatchScoreLabel,
  ]
  for (let i = 0; i < aiCols; i++) {
    const x = left + padding + i * (aiW + aiGap)
    doc.save()
    doc.fillColor(COLOR_FILL_LIGHT).strokeColor(COLOR_BORDER).lineWidth(0.5)
    doc
      .roundedRect(x, cursorY, aiW, aiCardHeight, 5)
      .fillAndStroke(COLOR_FILL_LIGHT, COLOR_BORDER)
    doc.restore()
    doc.font("Helvetica-Bold").fontSize(6).fillColor(COLOR_MUTED)
    doc.text(aiLabels[i].toUpperCase(), x + 4, cursorY + 5, {
      width: aiW - 8,
      lineBreak: false,
    })
    doc.font("Helvetica-Bold").fontSize(10).fillColor(COLOR_INK)
    doc.text(aiValues[i], x + 4, cursorY + 16, {
      width: aiW - 8,
      lineBreak: false,
    })
  }
  cursorY += aiCardHeight + 12

  doc.y = cursorY
  drawProgressBar(
    doc,
    left + padding,
    width - padding * 2,
    formatted.progressPercentSafe,
    formatted.progressPercentLabel
  )
  cursorY = doc.y + 8

  doc.font("Helvetica-Bold").fontSize(7).fillColor(COLOR_MUTED)
  doc.text("PIPELINE POR ETAPA", left + padding, cursorY, {
    width: width - padding * 2,
    lineBreak: false,
  })
  cursorY += pipelineLabelHeight + 6

  if (formatted.stageEntries.length === 0) {
    doc.font("Helvetica").fontSize(8).fillColor(COLOR_MUTED)
    doc.text(`Sin etapas registradas ${EM_DASH}`, left + padding, cursorY, {
      width: pipelineMaxLineWidth,
    })
  } else {
    const maxPillX = left + width - padding
    let pillX = left + padding
    let pillY = cursorY
    for (const stage of formatted.stageEntries) {
      const pillText = `${stage.name} ${stage.count}`
      doc.font("Helvetica").fontSize(7)
      const pillW = doc.widthOfString(pillText) + 18
      if (pillX > left + padding && pillX + pillW > maxPillX) {
        pillX = left + padding
        pillY += 16
      }
      doc.save()
      doc.lineWidth(0.5).strokeColor(COLOR_BORDER).fillColor("#FBFAF7")
      doc
        .roundedRect(pillX, pillY, pillW, 14, 7)
        .fillAndStroke("#FBFAF7", COLOR_BORDER)
      doc.restore()
      doc.font("Helvetica").fontSize(7).fillColor(COLOR_INK_SOFT)
      doc.text(pillText, pillX + 6, pillY + 3, { lineBreak: false })
      pillX += pillW + 6
    }
  }

  doc.y = cardTop + cardHeight + 10
}

function drawVacancyDetailsSection(doc: PdfDoc, formatted: FormattedVacancyRow[]): void {
  doc.addPage()
  drawSectionTitle(doc, "5. Detalle completo por vacante")

  if (formatted.length === 0) {
    doc.font("Helvetica").fontSize(10).fillColor(COLOR_MUTED)
    doc.text("No hay vacantes para mostrar con los filtros actuales.", {
      align: "left",
    })
    return
  }

  for (const row of formatted) {
    drawVacancyDetailCard(doc, row)
  }
}

function drawTechnicalTableSection(doc: PdfDoc, formatted: FormattedVacancyRow[]): void {
  doc.addPage()
  drawSectionTitle(doc, "6. Tabla técnica completa")

  const { left, width } = contentMetrics(doc)
  doc.font("Helvetica").fontSize(8).fillColor(COLOR_INK_SOFT)
  doc.text(
    "Esta tabla conserva los campos operativos principales para auditoría y revisión rápida. El detalle extendido de IDs, etapas, scores y métricas se encuentra en la sección anterior por cada vacante.",
    left,
    doc.y,
    { width, align: "justify" }
  )
  doc.moveDown(0.5)

  const columns: PdfTableColumn[] = [
    { label: "Cliente", width: 115, align: "left" },
    { label: "Vacante", width: 130, align: "left" },
    { label: "Estado", width: 58, align: "center" },
    { label: "Apertura", width: 76, align: "center" },
    { label: "Cierre", width: 62, align: "center" },
    { label: "Cand.", width: 42, align: "center" },
    { label: "Ent.", width: 38, align: "center" },
    { label: "Fin.", width: 38, align: "center" },
    { label: "Cont.", width: 40, align: "center" },
    { label: "Avance", width: 55, align: "center" },
    { label: "Score", width: 50, align: "center" },
  ]
  const tableRows = formatted.map((f) => [
    f.clientLabel,
    f.vacancyTitleLabel,
    f.vacancyStatusLabel,
    f.openedAtLabel,
    f.closedAtLabel,
    f.totalCandidatesLabel,
    f.interviewLabel,
    f.finalistLabel,
    f.hiredLabel,
    f.progressPercentLabel,
    f.averagePreliminaryMatchScoreLabel,
  ])
  addPdfTable(doc, {
    columns,
    rows: tableRows,
    emptyMessage: "Sin filas técnicas.",
    fontSize: 7,
    headerFontSize: 7,
  })
  doc.moveDown(0.6)
}

function resolveReportMetrics(
  rows: VacancyProgressByClientRow[],
  summary: VacancyProgressReportPdfKitSummary | null | undefined
): {
  generatedAt: string
  periodLabel: string
  totalCount: string
  totalVacancies: string
  openVacancies: string
  totalClients: string
  totalCandidates: string
  vacanciesWithCandidates: string
  vacanciesWithoutCandidates: string
  averageAiScore: string
  candidatesWithAiAnalysis: string
  totalInInterview: string
  totalFinalists: string
  totalHired: string
} {
  const totalCountRaw = summary?.totalCount ?? rows.length
  const totalCountNum = asNumber(totalCountRaw, rows.length)
  const kpis = computeAvanceVacantesDashboardKpis(rows, totalCountNum)

  const vacanciesWithCandidates = rows.filter(
    (r) => asNumber(r.totalCandidates) > 0
  ).length
  const vacanciesWithoutCandidates = rows.length - vacanciesWithCandidates
  const clientLabels = new Set(rows.map((r) => vacancyClientLabel(r)))

  const periodStart = String(summary?.periodStart ?? EM_DASH)
  const periodEnd = String(summary?.periodEnd ?? EM_DASH)

  const averageAiScore =
    kpis.avgPreliminaryMatchOnPage != null
      ? formatScore(kpis.avgPreliminaryMatchOnPage)
      : summary?.averagePreliminaryMatchScore != null
        ? formatScore(summary.averagePreliminaryMatchScore)
        : EM_DASH

  return {
    generatedAt: String(summary?.generatedAt ?? EM_DASH),
    periodLabel: resolvePeriodLabel(periodStart, periodEnd),
    totalCount: formatInt(totalCountRaw),
    totalVacancies: formatInt(summary?.totalVacancies ?? kpis.totalVacancies),
    openVacancies: formatInt(summary?.openVacancies ?? kpis.openCount),
    totalClients: formatInt(summary?.totalClients ?? clientLabels.size),
    totalCandidates: formatInt(summary?.totalCandidates ?? kpis.totalCandidates),
    vacanciesWithCandidates: formatInt(
      summary?.vacanciesWithCandidates ?? vacanciesWithCandidates
    ),
    vacanciesWithoutCandidates: formatInt(
      summary?.vacanciesWithoutCandidates ?? vacanciesWithoutCandidates
    ),
    averageAiScore,
    candidatesWithAiAnalysis: formatInt(
      summary?.candidatesWithPreliminaryAnalysis ?? kpis.sumPreliminaryAnalyzed
    ),
    totalInInterview: formatInt(summary?.candidatesInInterview ?? kpis.sumInterview),
    totalFinalists: formatInt(summary?.candidatesFinalist ?? kpis.sumFinalist),
    totalHired: formatInt(summary?.candidatesHired ?? kpis.sumHired),
  }
}

/**
 * Generates the full vacancy-progress report PDF (PDFKit v2) from `rows` and `summary`.
 * No Chromium, no HTML preview — mirrors the default template sections 1–6.
 */
export function buildVacancyProgressReportPdfKitBuffer(
  input: VacancyProgressReportPdfKitInput
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margin: PAGE_MARGIN,
      autoFirstPage: true,
      bufferPages: true,
    })

    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    try {
      const rows = Array.isArray(input.rows) ? input.rows : []
      const summary = input.summary ?? null
      const totalCount =
        summary?.totalCount != null ? Number(summary.totalCount) : rows.length

      const ctx = buildVacancyProgressReportTemplateContext({
        rows,
        totalCount: Number.isFinite(totalCount) ? totalCount : rows.length,
        generatedAt: summary?.generatedAt ?? EM_DASH,
        periodStart: summary?.periodStart ?? EM_DASH,
        periodEnd: summary?.periodEnd ?? EM_DASH,
        clientName: summary?.clientName ?? "Todos",
      })

      renderReportSchemaToPdfKit(doc, input.schema, ctx)

      applyBufferedPageFooters(doc)
      doc.end()
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)))
    }
  })
}
