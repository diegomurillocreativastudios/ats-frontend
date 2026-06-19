import PDFDocument from "pdfkit"

export type PdfDoc = InstanceType<typeof PDFDocument>

const PAGE_MARGIN = 48
const MARGIN = {
  top: PAGE_MARGIN,
  bottom: PAGE_MARGIN,
  left: PAGE_MARGIN,
  right: PAGE_MARGIN,
}

const FOOTER_DEBUG_MARKER_PREFIX = "PDFKit v2 · "
const FOOTER_RESERVE = 28

const COLOR_INK = "#202124"
const COLOR_INK_SOFT = "#3D3E41"
const COLOR_MUTED = "#5A5B5E"
const COLOR_BORDER = "#EAE0D5"
const COLOR_HEADER_BG = "#202124"
const COLOR_HEADER_INK = "#ffffff"
const COLOR_FILL_LIGHT = "#FBFAF7"
const COLOR_PROGRESS_TRACK = "#EAE0D5"

interface ContentMetrics {
  left: number
  right: number
  width: number
  bottom: number
}

export interface ReportHeaderMetaItem {
  label: string
  value: string
}

export interface ReportHeaderInput {
  eyebrow?: string
  title: string
  description?: string
  meta?: ReportHeaderMetaItem[]
}

export interface PdfTableColumn {
  label: string
  /** Relative weight (in points). Widths are normalized to fit the content area. */
  width: number
  align?: "left" | "center" | "right"
}

export interface AddPdfTableOptions {
  columns: PdfTableColumn[]
  rows: string[][]
  emptyMessage: string
  fontSize?: number
  headerFontSize?: number
  cellPadding?: number
  minRowHeight?: number
}

export interface DrawSectionTitleOptions {
  /**
   * Extra vertical space (points) that should fit on the current page right
   * after the section title.
   */
  reserveAfterTitle?: number
}

export interface PageFooterOptions {
  pageNumber: number
  totalPages: number
  templateVersion: string
  showDebugMarker: boolean
}

export interface PdfVacancyDetailRow {
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

const SECTION_TITLE_SPACE = 36
const TABLE_DEFAULT_FONT_SIZE = 7.5
const TABLE_DEFAULT_HEADER_FONT_SIZE = 7.5
const TABLE_DEFAULT_CELL_PADDING = 4
const TABLE_DEFAULT_MIN_ROW_HEIGHT = 16
const TABLE_MIN_HEADER_HEIGHT = 24

export function contentMetrics(doc: PdfDoc): ContentMetrics {
  const left = doc.page.margins.left
  const right = doc.page.width - doc.page.margins.right
  const bottom = doc.page.height - doc.page.margins.bottom
  return { left, right, width: right - left, bottom }
}

function bottomContentLimit(doc: PdfDoc): number {
  return doc.page.height - doc.page.margins.bottom - FOOTER_RESERVE
}

export function ensureSpace(doc: PdfDoc, neededHeight: number): void {
  if (doc.y + neededHeight > bottomContentLimit(doc)) {
    doc.addPage()
  }
}

export function addPageFooter(doc: PdfDoc, options: PageFooterOptions): void {
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

/** Applies footers to every buffered page (call before `doc.end()`). */
export function applyBufferedPageFooters(
  doc: PdfDoc,
  templateVersion: string
): void {
  const range = doc.bufferedPageRange()
  const totalPages = range.count
  const showDebugMarker = process.env.NODE_ENV !== "production"

  for (let pageIndex = range.start; pageIndex < range.start + totalPages; pageIndex++) {
    doc.switchToPage(pageIndex)
    addPageFooter(doc, {
      pageNumber: pageIndex - range.start + 1,
      totalPages,
      templateVersion,
      showDebugMarker,
    })
  }
}

export function drawReportHeader(doc: PdfDoc, input: ReportHeaderInput): void {
  const { left, width } = contentMetrics(doc)
  const headerTop = doc.y
  const eyebrow = input.eyebrow?.trim() || "REPORTE DE RECLUTAMIENTO"
  const title = input.title?.trim() || "Reporte"
  const description = input.description?.trim() || ""
  const metaRows = input.meta ?? []

  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(COLOR_MUTED)
  doc.text(eyebrow.toUpperCase(), left, headerTop, { width: width * 0.62 })

  doc.font("Helvetica-Bold").fontSize(20).fillColor(COLOR_INK)
  doc.text(title, left, doc.y + 4, { width: width * 0.62 })

  if (description) {
    doc.font("Helvetica").fontSize(9).fillColor(COLOR_INK_SOFT)
    doc.text(description, left, doc.y + 6, {
      width: width * 0.62,
      align: "justify",
    })
  }

  if (metaRows.length > 0) {
    const metaLeft = left + width * 0.66
    const metaWidth = width * 0.34
    const metaPadding = 10
    const metaRowHeight = 18
    const metaHeight = Math.max(60, metaPadding * 2 + metaRows.length * metaRowHeight)

    doc.save()
    doc.lineWidth(0.75).strokeColor(COLOR_BORDER).fillColor(COLOR_FILL_LIGHT)
    doc.roundedRect(metaLeft, headerTop, metaWidth, metaHeight, 6).fillAndStroke(
      COLOR_FILL_LIGHT,
      COLOR_BORDER
    )
    doc.restore()

    let metaY = headerTop + metaPadding
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
  }

  doc.y = Math.max(doc.y, headerTop + 60) + 14
  doc.save()
  doc.moveTo(left, doc.y).lineTo(left + width, doc.y).lineWidth(1.2).strokeColor(COLOR_BORDER)
  doc.restore()
  doc.y += 16
}

export function drawSectionTitle(
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

export function drawKpiCard(
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

function normalizeColumnWidths(columns: PdfTableColumn[], totalWidth: number): number[] {
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

export function estimateTableMinHeight(
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

export function addPdfTable(doc: PdfDoc, options: AddPdfTableOptions): void {
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

export function drawProgressBar(
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

export function drawVacancyDetailCard(doc: PdfDoc, formatted: PdfVacancyDetailRow): void {
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
    .fontSize(8.5)
    .heightOfString(statusLabel, {
      width: statusBadgeWidth,
      align: "right",
    })

  const headerHeight = Math.max(titleHeight + clientHeight + 6, statusHeight)

  const infoItems = [
    { label: "Apertura", value: formatted.openedAtLabel },
    { label: "Cierre", value: formatted.closedAtLabel },
    { label: "Candidatos", value: formatted.totalCandidatesLabel },
    { label: "Días para cierre", value: formatted.averageDaysToFillLabel },
  ]

  const metrics = [
    { label: "Candidatos", value: formatted.totalCandidatesLabel },
    { label: "Entrevista", value: formatted.interviewLabel },
    { label: "Finalistas", value: formatted.finalistLabel },
    { label: "Contratados", value: formatted.hiredLabel },
    { label: "Score IA", value: formatted.averagePreliminaryMatchScoreLabel },
  ]

  const totalHeight =
    padding * 2 +
    headerHeight +
    96 +
    54 +
    30 +
    (formatted.stageEntries.length > 0 ? 36 + formatted.stageEntries.length * 12 : 32)

  ensureSpace(doc, totalHeight)

  doc.save()
  doc.lineWidth(0.7).strokeColor(COLOR_BORDER).fillColor("#FBFAF7")
  doc.roundedRect(left, doc.y, width, totalHeight, 8).fillAndStroke("#FBFAF7", COLOR_BORDER)
  doc.restore()

  let cursorY = doc.y + padding

  doc.font("Helvetica-Bold").fontSize(13).fillColor(COLOR_INK)
  doc.text(formatted.vacancyTitleLabel, left + padding, cursorY, {
    width: headerTextWidth,
    lineGap: 2,
  })
  const titleY = doc.y

  doc.font("Helvetica").fontSize(10).fillColor(COLOR_INK_SOFT)
  doc.text(formatted.clientLabel, left + padding, titleY + 4, {
    width: headerTextWidth,
    lineGap: 2,
  })

  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLOR_INK)
  doc.text(statusLabel, left + width - padding - statusBadgeWidth, cursorY, {
    width: statusBadgeWidth,
    align: "right",
  })

  cursorY += headerHeight + 12

  const infoWidth = width - padding * 2
  const infoCol = infoWidth / 4
  doc.save()
  doc.lineWidth(0.5).strokeColor("#EAE0D5")
  doc.rect(left + padding, cursorY, infoWidth, 34).stroke()
  doc.restore()

  infoItems.forEach((item, idx) => {
    const x = left + padding + infoCol * idx
    doc.font("Helvetica-Bold").fontSize(7).fillColor(COLOR_MUTED)
    doc.text(item.label.toUpperCase(), x + 6, cursorY + 6, { width: infoCol - 12 })
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLOR_INK)
    doc.text(item.value, x + 6, cursorY + 18, { width: infoCol - 12 })
  })

  cursorY += 44

  const metricWidth = infoWidth / 5
  doc.save()
  doc.lineWidth(0.5).strokeColor("#EAE0D5")
  doc.rect(left + padding, cursorY, infoWidth, 34).stroke()
  doc.restore()

  metrics.forEach((metric, idx) => {
    const x = left + padding + metricWidth * idx
    doc.font("Helvetica-Bold").fontSize(7).fillColor(COLOR_MUTED)
    doc.text(metric.label.toUpperCase(), x + 6, cursorY + 6, { width: metricWidth - 12 })
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLOR_INK)
    doc.text(metric.value, x + 6, cursorY + 18, { width: metricWidth - 12 })
  })

  cursorY += 44

  doc.font("Helvetica-Bold").fontSize(7).fillColor(COLOR_MUTED)
  doc.text("Score IA mínimo", left + padding, cursorY, { width: infoWidth / 3 })
  doc.text("Score IA promedio", left + padding + infoWidth / 3, cursorY, {
    width: infoWidth / 3,
  })
  doc.text("Score IA máximo", left + padding + (infoWidth / 3) * 2, cursorY, {
    width: infoWidth / 3,
  })

  cursorY += 12

  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(COLOR_INK)
  doc.text(formatted.minPreliminaryMatchScoreLabel, left + padding, cursorY, {
    width: infoWidth / 3,
  })
  doc.text(formatted.averagePreliminaryMatchScoreLabel, left + padding + infoWidth / 3, cursorY, {
    width: infoWidth / 3,
  })
  doc.text(
    formatted.maxPreliminaryMatchScoreLabel,
    left + padding + (infoWidth / 3) * 2,
    cursorY,
    {
      width: infoWidth / 3,
    }
  )

  cursorY += 24

  doc.y = cursorY
  drawProgressBar(
    doc,
    left + padding,
    infoWidth,
    formatted.progressPercentSafe,
    formatted.progressPercentLabel
  )

  cursorY = doc.y

  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLOR_MUTED)
  doc.text("PIPELINE POR ETAPA", left + padding, cursorY, { width: infoWidth })
  cursorY += 12

  doc.font("Helvetica").fontSize(8).fillColor(COLOR_INK_SOFT)
  if (formatted.stageEntries.length === 0) {
    doc.text("Sin etapas registradas —", left + padding, cursorY, { width: infoWidth })
    cursorY += 16
  } else {
    for (const stage of formatted.stageEntries) {
      doc.text(`${stage.name}: ${stage.count}`, left + padding, cursorY, { width: infoWidth })
      cursorY += 12
    }
  }

  doc.y = cursorY + padding
}

export function resolveTableColumnWidth(rawWidth: string | undefined, fallback = 1): number {
  if (!rawWidth) return fallback
  const trimmed = rawWidth.trim()
  if (trimmed.endsWith("fr")) {
    const num = Number(trimmed.replace("fr", "").trim())
    return Number.isFinite(num) && num > 0 ? num : fallback
  }
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
