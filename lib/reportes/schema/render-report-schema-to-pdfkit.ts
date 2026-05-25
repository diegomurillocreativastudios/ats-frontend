import type PDFDocument from "pdfkit"
import type {
  FindingsSection,
  HeroHeaderSection,
  KpiGridSection,
  PageBreakSection,
  ReportSchema,
  ReportSection,
  SectionTitleSection,
  TableSection,
  VacancyCardsSection,
} from "@/lib/reportes/schema/report-schema-types"
import {
  normalizeTemplateValue,
  resolvePath,
  resolveTemplateString,
} from "@/lib/reportes/schema/report-schema-bindings"
import {
  addPdfTable,
  contentMetrics,
  drawKpiCard,
  drawProgressBar,
  drawReportHeader,
  drawSectionTitle,
  ensureSpace,
  estimateTableMinHeight,
  resolveTableColumnWidth,
  type PdfDoc,
  type PdfTableColumn,
} from "@/lib/reportes/pdfkit/report-pdfkit-primitives"

function resolveBindingText(binding: string, ctx: Record<string, unknown>): string {
  if (binding.includes("{{")) return resolveTemplateString(binding, ctx)
  return normalizeTemplateValue(resolvePath(ctx, binding))
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 100) return 100
  return value
}

function renderHeroHeader(
  doc: PdfDoc,
  section: HeroHeaderSection,
  ctx: Record<string, unknown>
): void {
  const metaRows =
    section.meta?.map((row) => ({
      label: resolveTemplateString(row.label, ctx),
      value: resolveTemplateString(row.value, ctx),
    })) ?? []

  drawReportHeader(doc, {
    eyebrow: section.eyebrow ? resolveTemplateString(section.eyebrow, ctx) : undefined,
    title: resolveTemplateString(section.title, ctx),
    description: section.description ? resolveTemplateString(section.description, ctx) : undefined,
    meta: metaRows,
  })
}

function renderSectionTitle(
  doc: PdfDoc,
  section: SectionTitleSection,
  ctx: Record<string, unknown>
): void {
  drawSectionTitle(doc, resolveTemplateString(section.title, ctx))
  if (section.subtitle) {
    doc.font("Helvetica").fontSize(9).fillColor("#6b7280")
    doc.text(resolveTemplateString(section.subtitle, ctx), doc.x, doc.y + 2)
    doc.moveDown(0.6)
  }
}

function renderKpiGrid(
  doc: PdfDoc,
  section: KpiGridSection,
  ctx: Record<string, unknown>
): void {
  drawSectionTitle(doc, resolveTemplateString(section.title, ctx))

  const { left, width } = contentMetrics(doc)
  const gap = 8
  const columns = section.columns ?? 4
  const cardW = (width - gap * (columns - 1)) / columns
  const cardH = 58
  const rowGap = 8
  const totalRows = Math.ceil(section.items.length / columns)
  const totalHeight = totalRows * cardH + (totalRows - 1) * rowGap + 8

  ensureSpace(doc, totalHeight)

  let rowY = doc.y
  section.items.forEach((item, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)
    const x = left + col * (cardW + gap)
    const y = rowY + row * (cardH + rowGap)
    drawKpiCard(
      doc,
      x,
      y,
      cardW,
      cardH,
      resolveTemplateString(item.label, ctx),
      resolveTemplateString(item.value, ctx),
      item.caption ? resolveTemplateString(item.caption, ctx) : undefined
    )
  })

  doc.y = rowY + totalRows * (cardH + rowGap) + 10
}

function renderFindings(
  doc: PdfDoc,
  section: FindingsSection,
  ctx: Record<string, unknown>
): void {
  drawSectionTitle(doc, resolveTemplateString(section.title, ctx))

  const { left, width } = contentMetrics(doc)
  const items = section.items.map((item) => ({
    label: resolveTemplateString(item.label, ctx),
    value: resolveTemplateString(item.value, ctx),
  }))

  const bulletLines = items.map((item) => `• ${item.label}: ${item.value}`)
  const boxPadding = 12
  const lineHeight = 13
  const boxHeight = Math.max(48, bulletLines.length * lineHeight + boxPadding * 2 + 4)

  ensureSpace(doc, boxHeight + 10)

  const boxTop = doc.y
  doc.save()
  doc.lineWidth(0.75).strokeColor("#d1d5db").fillColor("#f9fafb")
  doc.roundedRect(left, boxTop, width, boxHeight, 6).fillAndStroke("#f9fafb", "#d1d5db")
  doc.restore()

  let bulletY = boxTop + boxPadding
  doc.font("Helvetica").fontSize(8.5).fillColor("#374151")
  if (bulletLines.length === 0) {
    doc.text("No hay hallazgos destacados para los filtros actuales.", left + boxPadding, bulletY, {
      width: width - boxPadding * 2,
      align: "justify",
    })
  } else {
    for (const line of bulletLines) {
      doc.text(line, left + boxPadding, bulletY, {
        width: width - boxPadding * 2,
        align: "justify",
      })
      bulletY = doc.y + 4
    }
  }

  doc.y = boxTop + boxHeight + 12
}

function buildTableColumns(
  section: TableSection,
  ctx: Record<string, unknown>
): PdfTableColumn[] {
  return section.columns.map((col) => ({
    label: resolveTemplateString(col.header, ctx),
    width: resolveTableColumnWidth(col.width, 1),
    align: col.align,
  }))
}

function renderTable(
  doc: PdfDoc,
  section: TableSection,
  ctx: Record<string, unknown>
): void {
  const rowsRaw = resolvePath(ctx, section.rowsBinding)
  const rows = Array.isArray(rowsRaw) ? rowsRaw : []
  const columns = buildTableColumns(section, ctx)
  const tableRows = rows.map((row) =>
    section.columns.map((col) => resolveBindingText(col.binding, row as Record<string, unknown>))
  )
  const tableOptions = {
    columns,
    rows: tableRows,
    emptyMessage: section.emptyText ?? "Sin datos para los filtros aplicados.",
  }

  drawSectionTitle(doc, resolveTemplateString(section.title, ctx), {
    reserveAfterTitle: estimateTableMinHeight(doc, tableOptions),
  })
  addPdfTable(doc, tableOptions)
  doc.moveDown(0.6)
}

function renderVacancyCards(
  doc: PdfDoc,
  section: VacancyCardsSection,
  ctx: Record<string, unknown>
): void {
  drawSectionTitle(doc, resolveTemplateString(section.title, ctx))
  const rowsRaw = resolvePath(ctx, section.rowsBinding)
  const rows = Array.isArray(rowsRaw) ? rowsRaw : []
  const { left, width } = contentMetrics(doc)
  const padding = 12
  const cardWidth = width

  if (rows.length === 0) {
    doc.font("Helvetica").fontSize(9).fillColor("#6b7280")
    doc.text("No hay vacantes para mostrar con los filtros actuales.", left, doc.y)
    doc.moveDown(0.8)
    return
  }

  for (const row of rows) {
    const rowCtx = row as Record<string, unknown>
    const title = resolveBindingText(section.card.titleBinding, rowCtx)
    const subtitle = section.card.subtitleBinding
      ? resolveBindingText(section.card.subtitleBinding, rowCtx)
      : ""
    const status = section.card.statusBinding
      ? resolveBindingText(section.card.statusBinding, rowCtx)
      : ""
    const metrics = (section.card.metrics ?? []).map((metric) => ({
      label: resolveTemplateString(metric.label, rowCtx),
      value: resolveBindingText(metric.binding, rowCtx),
    }))
    const progressLabel = section.card.progress?.label
      ? resolveTemplateString(section.card.progress.label, rowCtx)
      : "Avance del proceso"
    const progressValue = section.card.progress?.valueBinding
      ? resolveBindingText(section.card.progress.valueBinding, rowCtx)
      : ""
    const percentRaw = section.card.progress?.percentBinding
      ? resolvePath(rowCtx, section.card.progress.percentBinding)
      : 0
    const progressPercent = clampPercent(Number(percentRaw ?? 0))
    const pipeline = section.card.pipeline

    const pipelineRowsRaw = pipeline?.rowsBinding
      ? resolvePath(rowCtx, pipeline.rowsBinding)
      : []
    const pipelineRows = Array.isArray(pipelineRowsRaw) ? pipelineRowsRaw : []
    const hasPipelineData = pipeline?.hasDataBinding
      ? Boolean(resolvePath(rowCtx, pipeline.hasDataBinding))
      : pipelineRows.length > 0

    const additionalDetailText = section.card.additionalDetail?.text
      ? resolveTemplateString(section.card.additionalDetail.text, rowCtx)
      : ""

    const baseHeight = 86 + metrics.length * 12 + (progressLabel ? 28 : 0)
    const pipelineHeight = hasPipelineData
      ? Math.max(24, pipelineRows.length * 12 + 16)
      : 22
    const extraHeight = additionalDetailText ? 26 : 0
    const cardHeight = baseHeight + pipelineHeight + extraHeight + padding * 2

    ensureSpace(doc, cardHeight + 6)

    const cardTop = doc.y
    doc.save()
    doc.lineWidth(0.7).strokeColor("#d1d5db").fillColor("#ffffff")
    doc.roundedRect(left, cardTop, cardWidth, cardHeight, 8).fillAndStroke("#ffffff", "#d1d5db")
    doc.restore()

    let cursorY = cardTop + padding

    doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827")
    doc.text(title, left + padding, cursorY, { width: cardWidth - padding * 2 })
    cursorY = doc.y + 4

    if (subtitle) {
      doc.font("Helvetica").fontSize(9).fillColor("#6b7280")
      doc.text(subtitle, left + padding, cursorY, { width: cardWidth - padding * 2 })
      cursorY = doc.y + 6
    }

    if (status) {
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#111827")
      doc.text(`Estado: ${status}`, left + padding, cursorY, {
        width: cardWidth - padding * 2,
      })
      cursorY = doc.y + 8
    }

    metrics.forEach((metric) => {
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#6b7280")
      doc.text(metric.label.toUpperCase(), left + padding, cursorY, {
        width: cardWidth - padding * 2,
      })
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#111827")
      doc.text(metric.value, left + padding, cursorY + 10, {
        width: cardWidth - padding * 2,
      })
      cursorY = doc.y + 6
    })

    if (section.card.progress) {
      doc.y = cursorY
      drawProgressBar(
        doc,
        left + padding,
        cardWidth - padding * 2,
        Number.isFinite(progressPercent) ? progressPercent : 0,
        progressValue || progressLabel
      )
      cursorY = doc.y + 6
    }

    if (pipeline) {
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#6b7280")
      doc.text(
        (pipeline.title ? resolveTemplateString(pipeline.title, rowCtx) : "PIPELINE POR ETAPA").toUpperCase(),
        left + padding,
        cursorY,
        { width: cardWidth - padding * 2 }
      )
      cursorY = doc.y + 6

      doc.font("Helvetica").fontSize(8).fillColor("#374151")
      if (!hasPipelineData || pipelineRows.length === 0) {
        doc.text(
          pipeline.emptyText ? resolveTemplateString(pipeline.emptyText, rowCtx) : "Sin etapas registradas —",
          left + padding,
          cursorY,
          { width: cardWidth - padding * 2 }
        )
        cursorY = doc.y + 6
      } else {
        for (const entry of pipelineRows) {
          const entryCtx = entry as Record<string, unknown>
          const label = pipeline.labelBinding
            ? resolveBindingText(pipeline.labelBinding, entryCtx)
            : ""
          const value = pipeline.valueBinding
            ? resolveBindingText(pipeline.valueBinding, entryCtx)
            : ""
          doc.text(`${label}: ${value}`, left + padding, cursorY, {
            width: cardWidth - padding * 2,
          })
          cursorY = doc.y + 4
        }
      }
    }

    if (additionalDetailText) {
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#6b7280")
      doc.text(
        section.card.additionalDetail?.title
          ? resolveTemplateString(section.card.additionalDetail.title, rowCtx)
          : "DETALLE ADICIONAL",
        left + padding,
        cursorY,
        { width: cardWidth - padding * 2 }
      )
      doc.font("Helvetica").fontSize(8).fillColor("#374151")
      doc.text(additionalDetailText, left + padding, cursorY + 10, {
        width: cardWidth - padding * 2,
      })
      cursorY = doc.y + 8
    }

    doc.y = cardTop + cardHeight + 12
  }
}

function renderPageBreak(doc: PdfDoc, _section: PageBreakSection): void {
  doc.addPage()
}

function renderSection(doc: PdfDoc, section: ReportSection, ctx: Record<string, unknown>): void {
  switch (section.type) {
    case "sectionTitle":
      renderSectionTitle(doc, section, ctx)
      return
    case "heroHeader":
      renderHeroHeader(doc, section, ctx)
      return
    case "kpiGrid":
      renderKpiGrid(doc, section, ctx)
      return
    case "findings":
      renderFindings(doc, section, ctx)
      return
    case "table":
      renderTable(doc, section, ctx)
      return
    case "vacancyCards":
      renderVacancyCards(doc, section, ctx)
      return
    case "pageBreak":
      renderPageBreak(doc, section)
      return
    default:
      return
  }
}

export function renderReportSchemaToPdfKit(
  doc: PDFDocument,
  schema: ReportSchema,
  ctx: Record<string, unknown>
): void {
  const pdfDoc = doc as PdfDoc
  for (const section of schema.sections) {
    renderSection(pdfDoc, section, ctx)
  }
}
