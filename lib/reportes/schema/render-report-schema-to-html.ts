import type {
  FindingsSection,
  HeroHeaderSection,
  KpiGridSection,
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

export function getReportPreviewBaseCss(): string {
  return `
    @page {
      size: Letter portrait;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #f3f4f6;
      font-family: Arial, Helvetica, sans-serif;
      color: #1f2937;
    }

    .report-preview-shell {
      width: 100%;
      padding: 24px;
      background: #f3f4f6;
    }

    .report-page {
      width: 8.5in;
      min-height: 11in;
      margin: 0 auto 24px auto;
      padding: 0.64in;
      background: #FBFAF7;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.16);
      page-break-after: always;
    }

    .report-page:last-child {
      page-break-after: auto;
    }

    .report-hero {
      display: grid;
      grid-template-columns: 1fr 245px;
      gap: 36px;
      padding-bottom: 28px;
      border-bottom: 2px solid #EAE0D5;
    }

    .eyebrow {
      margin: 0 0 8px 0;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 3px;
      color: #5A5B5E;
    }

    h1 {
      margin: 0;
      font-size: 31px;
      line-height: 1.05;
      color: #202124;
    }

    .hero-description {
      margin: 18px 0 0 0;
      font-size: 13px;
      line-height: 1.6;
      color: #4b5563;
      text-align: justify;
    }

    .report-meta-card {
      padding: 18px;
      border: 1px solid #EAE0D5;
      border-radius: 8px;
      background: #FBFAF7;
    }

    .report-meta-card div + div {
      margin-top: 16px;
    }

    .report-meta-card span,
    .metric-card span {
      display: block;
      margin-bottom: 6px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.8px;
      color: #5A5B5E;
    }

    .report-meta-card strong {
      display: block;
      font-size: 14px;
      color: #202124;
    }

    .report-section {
      margin-top: 24px;
    }

    .report-section h2 {
      margin: 0 0 12px 0;
      padding-bottom: 9px;
      border-bottom: 4px solid #202124;
      font-size: 21px;
      line-height: 1.2;
      color: #202124;
    }

    .section-description {
      margin: 0 0 14px 0;
      font-size: 12px;
      line-height: 1.55;
      color: #4b5563;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }

    .metric-card {
      min-height: 84px;
      padding: 14px;
      border: 1px solid #EAE0D5;
      border-radius: 8px;
      background: #fbfbfc;
    }

    .metric-card strong {
      display: block;
      margin-bottom: 4px;
      font-size: 25px;
      line-height: 1;
      color: #202124;
    }

    .metric-card small {
      font-size: 11px;
      color: #5A5B5E;
    }

    .findings-box {
      padding: 16px 18px;
      border: 1px solid #EAE0D5;
      border-radius: 8px;
      background: #FBFAF7;
    }

    .findings-box ul {
      margin: 0;
      padding-left: 18px;
    }

    .findings-box li {
      margin: 8px 0;
      font-size: 12px;
      line-height: 1.45;
      color: #3D3E41;
    }

    .report-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 11px;
    }

    .report-table th {
      padding: 10px 9px;
      background: #202124;
      border: 1px solid #3D3E41;
      color: #ffffff;
      font-weight: 800;
      text-align: left;
    }

    .report-table td {
      padding: 10px 9px;
      border: 1px solid #EAE0D5;
      color: #3D3E41;
      vertical-align: top;
      line-height: 1.35;
      word-break: break-word;
    }

    .report-table tbody tr:nth-child(even) td {
      background: #f8fafc;
    }

    .report-table.compact {
      font-size: 10.5px;
    }

    .report-table.compact th,
    .report-table.compact td {
      padding: 8px;
    }

    .report-table.technical {
      font-size: 9.2px;
    }

    .report-table.technical th,
    .report-table.technical td {
      padding: 7px 5px;
    }

    .numeric {
      text-align: center;
    }

    .align-right {
      text-align: right;
    }

    .align-center {
      text-align: center;
    }

    .vacancy-list {
      display: grid;
      gap: 16px;
    }

    .vacancy-card {
      padding: 16px;
      border: 1px solid #EAE0D5;
      border-radius: 10px;
      background: #FBFAF7;
      page-break-inside: avoid;
    }

    .vacancy-card-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #EAE0D5;
    }

    .vacancy-card h3 {
      margin: 0;
      font-size: 18px;
      color: #202124;
    }

    .client-name {
      margin: 4px 0 0 0;
      font-size: 12px;
      color: #5A5B5E;
    }

    .status-pill {
      align-self: flex-start;
      padding: 5px 10px;
      border-radius: 999px;
      background: #eef2ff;
      color: #3730a3;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .vacancy-metrics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-top: 14px;
    }

    .vacancy-metric {
      padding: 10px;
      border-radius: 7px;
      background: #FBFAF7;
      border: 1px solid #EAE0D5;
    }

    .vacancy-metric span {
      display: block;
      margin-bottom: 4px;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 1.2px;
      color: #5A5B5E;
    }

    .vacancy-metric strong {
      font-size: 14px;
      color: #202124;
    }

    .progress-block {
      margin-top: 14px;
    }

    .progress-label {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 11px;
      color: #3D3E41;
    }

    .progress-track {
      height: 8px;
      border-radius: 999px;
      background: #EAE0D5;
      overflow: hidden;
    }

    .progress-bar {
      height: 100%;
      border-radius: 999px;
      background: #202124;
    }

    .pipeline-box {
      margin-top: 14px;
      padding: 12px;
      border-radius: 8px;
      background: #FBFAF7;
      border: 1px solid #EAE0D5;
    }

    .pipeline-box.subtle {
      background: #FBFAF7;
    }

    .pipeline-box h4 {
      margin: 0 0 8px 0;
      font-size: 10px;
      letter-spacing: 1.4px;
      color: #5A5B5E;
    }

    .pipeline-box p {
      margin: 0;
      font-size: 11px;
      color: #3D3E41;
    }

    .stage-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .stage-list span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 8px;
      border-radius: 999px;
      background: #FBFAF7;
      border: 1px solid #EAE0D5;
      font-size: 11px;
      color: #3D3E41;
    }

    .stage-list strong {
      color: #202124;
    }
  `
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function resolveBindingText(
  binding: string,
  ctx: Record<string, unknown>
): string {
  if (binding.includes("{{")) {
    return resolveTemplateString(binding, ctx)
  }
  return normalizeTemplateValue(resolvePath(ctx, binding))
}

function renderSectionTitle(
  section: SectionTitleSection,
  ctx: Record<string, unknown>
): string {
  const title = escapeHtml(resolveTemplateString(section.title, ctx))
  const subtitle = section.subtitle
    ? `<p class="section-description">${escapeHtml(
        resolveTemplateString(section.subtitle, ctx)
      )}</p>`
    : ""
  return `<section class="report-section"><h2>${title}</h2>${subtitle}</section>`
}

function renderHeroHeader(
  section: HeroHeaderSection,
  ctx: Record<string, unknown>
): string {
  const eyebrow = section.eyebrow
    ? `<p class="eyebrow">${escapeHtml(resolveTemplateString(section.eyebrow, ctx))}</p>`
    : ""
  const title = escapeHtml(resolveTemplateString(section.title, ctx))
  const description = section.description
    ? `<p class="hero-description">${escapeHtml(
        resolveTemplateString(section.description, ctx)
      )}</p>`
    : ""
  const metaRows =
    section.meta?.map((item) => {
      const label = escapeHtml(resolveTemplateString(item.label, ctx))
      const value = escapeHtml(resolveTemplateString(item.value, ctx))
      return `<div><span>${label}</span><strong>${value}</strong></div>`
    }) ?? []
  const metaHtml =
    metaRows.length > 0 ? `<aside class="report-meta-card">${metaRows.join("")}</aside>` : ""

  return `<section class="report-hero report-section"><div>${eyebrow}<h1>${title}</h1>${description}</div>${metaHtml}</section>`
}

function renderKpiGrid(section: KpiGridSection, ctx: Record<string, unknown>): string {
  const title = escapeHtml(resolveTemplateString(section.title, ctx))
  const columns = section.columns ?? 4
  const gridStyle = `style="grid-template-columns: repeat(${columns}, minmax(0, 1fr));"`
  const items = section.items
    .map((item) => {
      const label = escapeHtml(resolveTemplateString(item.label, ctx))
      const value = escapeHtml(resolveTemplateString(item.value, ctx))
      const caption = item.caption
        ? `<small>${escapeHtml(
            resolveTemplateString(item.caption, ctx)
          )}</small>`
        : ""
      return `<article class="metric-card"><span>${label}</span><strong>${value}</strong>${caption}</article>`
    })
    .join("")
  return `<section class="report-section"><h2>${title}</h2><div class="metric-grid" ${gridStyle}>${items}</div></section>`
}

function renderFindings(section: FindingsSection, ctx: Record<string, unknown>): string {
  const title = escapeHtml(resolveTemplateString(section.title, ctx))
  const items = section.items
    .map((item) => {
      const label = escapeHtml(resolveTemplateString(item.label, ctx))
      const value = escapeHtml(resolveTemplateString(item.value, ctx))
      return `<li><strong>${label}:</strong> ${value}</li>`
    })
    .join("")
  return `<section class="report-section"><h2>${title}</h2><div class="findings-box"><ul>${items}</ul></div></section>`
}

function renderTable(section: TableSection, ctx: Record<string, unknown>): string {
  const title = escapeHtml(resolveTemplateString(section.title, ctx))
  const rows = resolvePath(ctx, section.rowsBinding)
  const normalizedRows = Array.isArray(rows) ? rows : []
  const headers = section.columns
    .map((col) => {
      const widthStyle = col.width ? ` style="width:${escapeHtml(col.width)}"` : ""
      return `<th${widthStyle}>${escapeHtml(resolveTemplateString(col.header, ctx))}</th>`
    })
    .join("")
  const bodyRows =
    normalizedRows.length > 0
      ? normalizedRows
          .map((row) => {
            const cells = section.columns
              .map((col) => {
                const value = resolveBindingText(col.binding, row as Record<string, unknown>)
                const alignClass =
                  col.align && col.align !== "left" ? ` class="align-${col.align}"` : ""
                return `<td${alignClass}>${escapeHtml(value)}</td>`
              })
              .join("")
            return `<tr>${cells}</tr>`
          })
          .join("")
      : `<tr><td colspan="${section.columns.length}">${
          section.emptyText ? escapeHtml(section.emptyText) : "Sin datos."
        }</td></tr>`
  return `<section class="report-section"><h2>${title}</h2><table class="report-table"><thead><tr>${headers}</tr></thead><tbody>${bodyRows}</tbody></table></section>`
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 100) return 100
  return value
}

function renderVacancyCards(
  section: VacancyCardsSection,
  ctx: Record<string, unknown>
): string {
  const title = escapeHtml(resolveTemplateString(section.title, ctx))
  const rows = resolvePath(ctx, section.rowsBinding)
  const normalizedRows = Array.isArray(rows) ? rows : []
  const cards =
    normalizedRows.length > 0
      ? normalizedRows
          .map((row) => {
            const rowCtx = row as Record<string, unknown>
            const card = section.card
            const titleValue = escapeHtml(resolveBindingText(card.titleBinding, rowCtx))
            const subtitleValue = card.subtitleBinding
              ? `<p class="client-name">${escapeHtml(
                  resolveBindingText(card.subtitleBinding, rowCtx)
                )}</p>`
              : ""
            const statusValue = card.statusBinding
              ? `<span class="status-pill">${escapeHtml(
                  resolveBindingText(card.statusBinding, rowCtx)
                )}</span>`
              : ""

            const metrics = (card.metrics ?? [])
              .map((metric) => {
                const label = escapeHtml(resolveTemplateString(metric.label, rowCtx))
                const value = escapeHtml(resolveBindingText(metric.binding, rowCtx))
                return `<div class="vacancy-metric"><span>${label}</span><strong>${value}</strong></div>`
              })
              .join("")

            const progressBlock = card.progress
              ? (() => {
                  const label = escapeHtml(
                    resolveTemplateString(card.progress?.label ?? "Avance del proceso", rowCtx)
                  )
                  const value = card.progress?.valueBinding
                    ? escapeHtml(resolveBindingText(card.progress.valueBinding, rowCtx))
                    : ""
                  const percentRaw = card.progress?.percentBinding
                    ? resolvePath(rowCtx, card.progress.percentBinding)
                    : undefined
                  const percent = clampPercent(Number(percentRaw ?? 0))
                  return `<div class="progress-block"><div class="progress-label"><span>${label}</span><span>${value}</span></div><div class="progress-track"><div class="progress-bar" style="width:${percent}%"></div></div></div>`
                })()
              : ""

            const pipelineBlock = card.pipeline
              ? (() => {
                  const pipeline = card.pipeline
                  const titleText = pipeline.title
                    ? escapeHtml(resolveTemplateString(pipeline.title, rowCtx))
                    : "Pipeline por etapa"
                  const hasData = pipeline.hasDataBinding
                    ? Boolean(resolvePath(rowCtx, pipeline.hasDataBinding))
                    : true
                  const pipelineRowsRaw = pipeline.rowsBinding
                    ? resolvePath(rowCtx, pipeline.rowsBinding)
                    : []
                  const pipelineRows = Array.isArray(pipelineRowsRaw) ? pipelineRowsRaw : []
                  const rowsHtml =
                    hasData && pipelineRows.length > 0
                      ? `<div class="stage-list">${pipelineRows
                          .map((entry) => {
                            const entryCtx = entry as Record<string, unknown>
                            const label = pipeline.labelBinding
                              ? escapeHtml(resolveBindingText(pipeline.labelBinding, entryCtx))
                              : ""
                            const value = pipeline.valueBinding
                              ? escapeHtml(resolveBindingText(pipeline.valueBinding, entryCtx))
                              : ""
                            const content = label
                              ? `<strong>${label}</strong>${value ? ` ${value}` : ""}`
                              : value
                            return `<span>${content}</span>`
                          })
                          .join("")}</div>`
                      : `<p>${
                          pipeline.emptyText
                            ? escapeHtml(pipeline.emptyText)
                            : "Sin etapas registradas —"
                        }</p>`
                  return `<div class="pipeline-box"><h4>${titleText}</h4>${rowsHtml}</div>`
                })()
              : ""

            const additionalDetail = card.additionalDetail?.text
              ? `<div class="pipeline-box subtle"><h4>${
                  card.additionalDetail.title
                    ? escapeHtml(resolveTemplateString(card.additionalDetail.title, rowCtx))
                    : "Detalle adicional"
                }</h4><p>${escapeHtml(
                  resolveTemplateString(card.additionalDetail.text, rowCtx)
                )}</p></div>`
              : ""

            return `<article class="vacancy-card"><header class="vacancy-card-header"><div><h3>${titleValue}</h3>${subtitleValue}</div>${statusValue}</header><div class="vacancy-metrics">${metrics}</div>${progressBlock}${pipelineBlock}${additionalDetail}</article>`
          })
          .join("")
      : `<p class="muted">No hay vacantes para mostrar con los filtros actuales.</p>`

  const list = normalizedRows.length > 0 ? `<div class="vacancy-list">${cards}</div>` : cards
  return `<section class="report-section"><h2>${title}</h2>${list}</section>`
}

function renderSection(section: ReportSection, ctx: Record<string, unknown>): string {
  switch (section.type) {
    case "sectionTitle":
      return renderSectionTitle(section, ctx)
    case "heroHeader":
      return renderHeroHeader(section, ctx)
    case "kpiGrid":
      return renderKpiGrid(section, ctx)
    case "findings":
      return renderFindings(section, ctx)
    case "table":
      return renderTable(section, ctx)
    case "vacancyCards":
      return renderVacancyCards(section, ctx)
    case "pageBreak":
      return ""
    default:
      return ""
  }
}

function renderSectionsWithPages(
  sections: ReportSection[],
  ctx: Record<string, unknown>
): string {
  const pages: string[][] = [[]]
  let currentPageIndex = 0

  for (const section of sections) {
    if (section.type === "pageBreak") {
      pages.push([])
      currentPageIndex += 1
      continue
    }
    pages[currentPageIndex].push(renderSection(section, ctx))
  }

  const nonEmptyPages = pages.filter((page) => page.length > 0)
  const resolvedPages = nonEmptyPages.length > 0 ? nonEmptyPages : [[]]

  return resolvedPages
    .map(
      (pageSections) =>
        `<article class="report-page">${pageSections.join("")}</article>`
    )
    .join("")
}

export function renderReportSchemaToHtml(
  schema: ReportSchema,
  ctx: Record<string, unknown>
): string {
  const bodyHtml = renderSectionsWithPages(schema.sections, ctx)
  return `<style>${getReportPreviewBaseCss()}</style><main class="report-preview-shell">${bodyHtml}</main>`
}
