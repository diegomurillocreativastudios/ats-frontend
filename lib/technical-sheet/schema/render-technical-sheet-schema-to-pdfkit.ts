import type PDFDocument from "pdfkit"
import {
  asRecordArray,
  mergeRowContext,
  resolveSheetBinding,
  resolveSheetPath,
  resolveSheetTemplateString,
} from "@/lib/technical-sheet/schema/technical-sheet-schema-bindings"
import type {
  BulletListSection,
  FactsSection,
  ParagraphSection,
  RepeatCardsSection,
  TechnicalSheetSchema,
  TechnicalSheetSection,
} from "@/lib/technical-sheet/schema/technical-sheet-schema-types"

type PdfDoc = InstanceType<typeof PDFDocument>

function contentMetrics(doc: PdfDoc): { left: number; right: number; width: number } {
  const left = doc.page.margins.left
  const right = doc.page.width - doc.page.margins.right
  return { left, right, width: right - left }
}

function sectionHeading(doc: PdfDoc, title: string) {
  const { width, left, right } = contentMetrics(doc)
  doc.moveDown(0.85)
  doc.fontSize(11).font("Helvetica-Bold").fillColor("#000000").text(title.toUpperCase(), {
    width,
    align: "left",
  })
  doc.moveDown(0.22)
  doc.strokeColor("#000000").lineWidth(0.85).moveTo(left, doc.y).lineTo(right, doc.y).stroke()
  doc.moveDown(0.55)
  doc.fillColor("#000000").font("Helvetica").fontSize(10)
}

function paragraph(doc: PdfDoc, text: string) {
  const { width } = contentMetrics(doc)
  doc.fontSize(10).font("Helvetica").fillColor("#000000").text(text, {
    width,
    align: "left",
    lineGap: 4,
  })
  doc.moveDown(0.45)
}

function labeledLine(doc: PdfDoc, label: string, value: string) {
  const { width } = contentMetrics(doc)
  const resolved = value.trim() !== "" ? value : "—"
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#000000").text(`${label}:`, {
    width,
    align: "left",
  })
  doc.moveDown(0.07)
  doc.font("Helvetica").fontSize(10).fillColor("#000000").text(resolved, {
    width,
    align: "left",
    lineGap: 3,
  })
  doc.moveDown(0.28)
}

function bulletList(doc: PdfDoc, items: string[]) {
  const { width } = contentMetrics(doc)
  for (const item of items) {
    doc.fontSize(10).font("Helvetica").fillColor("#000000").text(`• ${item}`, {
      width: width - 14,
      indent: 14,
      align: "left",
      lineGap: 5,
    })
    doc.moveDown(0.28)
  }
  doc.moveDown(0.12)
}

function renderRepeatCards(
  doc: PdfDoc,
  section: RepeatCardsSection,
  ctx: Record<string, unknown>
) {
  const rows = asRecordArray(resolveSheetPath(ctx, section.rowsBinding))
  if (rows.length === 0) return

  sectionHeading(doc, resolveSheetTemplateString(section.title, ctx))
  for (const item of rows) {
    const rowCtx = mergeRowContext(ctx, item)
    for (const field of section.fields) {
      labeledLine(
        doc,
        resolveSheetTemplateString(field.label, rowCtx),
        resolveSheetBinding(field.binding, rowCtx)
      )
    }
    if (section.bullets) {
      const itemTemplate = section.bullets.item?.trim() || "{{.}}"
      const bulletRows = asRecordArray(resolveSheetPath(rowCtx, section.bullets.rowsBinding))
      const items = bulletRows
        .map((bullet) =>
          resolveSheetBinding(itemTemplate, mergeRowContext(rowCtx, bullet), "").trim()
        )
        .filter((text) => text !== "")
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#000000")
        .text(`${resolveSheetTemplateString(section.bullets.title, rowCtx)}:`, {
          width: contentMetrics(doc).width,
        })
      doc.moveDown(0.18)
      if (items.length > 0) bulletList(doc, items)
      else paragraph(doc, "—")
    }
    doc.moveDown(0.5)
  }
}

function renderBulletListSection(
  doc: PdfDoc,
  section: BulletListSection,
  ctx: Record<string, unknown>
) {
  const rows = asRecordArray(resolveSheetPath(ctx, section.rowsBinding))
  const items = rows
    .map((item) => resolveSheetBinding(section.item, mergeRowContext(ctx, item), "").trim())
    .filter((text) => text !== "")
  if (items.length === 0) return
  sectionHeading(doc, resolveSheetTemplateString(section.title, ctx))
  bulletList(doc, items)
}

function renderFacts(doc: PdfDoc, section: FactsSection, ctx: Record<string, unknown>) {
  sectionHeading(doc, resolveSheetTemplateString(section.title, ctx))
  for (const item of section.items) {
    labeledLine(
      doc,
      resolveSheetTemplateString(item.label, ctx),
      resolveSheetBinding(item.value, ctx)
    )
  }
}

function renderParagraph(
  doc: PdfDoc,
  section: ParagraphSection,
  ctx: Record<string, unknown>
) {
  const text = resolveSheetBinding(section.text, ctx, "").trim()
  if (text === "") return
  sectionHeading(doc, resolveSheetTemplateString(section.title, ctx))
  paragraph(doc, text)
}

function renderSection(
  doc: PdfDoc,
  section: TechnicalSheetSection,
  ctx: Record<string, unknown>
) {
  switch (section.type) {
    case "repeatCards":
      renderRepeatCards(doc, section, ctx)
      return
    case "bulletList":
      renderBulletListSection(doc, section, ctx)
      return
    case "facts":
      renderFacts(doc, section, ctx)
      return
    case "paragraph":
      renderParagraph(doc, section, ctx)
      return
    default:
      return
  }
}

export function renderTechnicalSheetSchemaToPdfKit(
  doc: PdfDoc,
  schema: TechnicalSheetSchema,
  ctx: Record<string, unknown>
): void {
  if (schema.sections.length === 0) return
  for (const section of schema.sections) {
    renderSection(doc, section, ctx)
  }
}
