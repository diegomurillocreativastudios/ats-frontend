import { sanitizeTemplateHtml } from "@/lib/html/sanitize-template-html"
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function getTechnicalSheetSchemaPreviewCss(): string {
  return `
    html { box-sizing: border-box; }
    *, *::before, *::after { box-sizing: inherit; }

    main.technical-sheet-source {
      font-family: Arial, Helvetica, sans-serif;
      margin: 0;
      padding: 0;
      background: #f5f5f5;
    }

    article.ts-article {
      margin: 0;
      padding: 0;
      font-size: 13.5px;
      line-height: 1.42;
      color: #111827;
    }

    article.ts-article > section {
      margin-bottom: 28px;
    }

    article.ts-article > section > h2 {
      margin: 0 0 12px;
      font-size: 15px;
      line-height: 1;
      font-weight: 800;
      text-transform: uppercase;
      text-decoration: underline;
    }
  `
}

function renderRepeatCards(
  section: RepeatCardsSection,
  ctx: Record<string, unknown>
): string {
  const rows = asRecordArray(resolveSheetPath(ctx, section.rowsBinding))
  if (rows.length === 0) return ""

  const cards = rows
    .map((item) => {
      const rowCtx = mergeRowContext(ctx, item)
      const fields = section.fields
        .map((field) => {
          const label = escapeHtml(resolveSheetTemplateString(field.label, rowCtx))
          const value = escapeHtml(resolveSheetBinding(field.binding, rowCtx))
          return `<p style="margin: 0 0 2px;"><strong>${label}:</strong> ${value}</p>`
        })
        .join("")

      let bulletsHtml = ""
      if (section.bullets) {
        const itemTemplate = section.bullets.item?.trim() || "{{.}}"
        const bulletRows = asRecordArray(resolveSheetPath(rowCtx, section.bullets.rowsBinding))
        const items = bulletRows
          .map((bullet) => {
            const text = resolveSheetBinding(itemTemplate, mergeRowContext(rowCtx, bullet), "")
            return text.trim() !== ""
              ? `<li style="margin: 4px 0; padding-left: 3px; text-align: justify;">${escapeHtml(text)}</li>`
              : ""
          })
          .join("")
        if (items) {
          const title = escapeHtml(resolveSheetTemplateString(section.bullets.title, rowCtx))
          bulletsHtml = `<p style="margin: 16px 0 4px; font-weight: 800;">${title}:</p><ul style="margin: 0; padding-left: 32px;">${items}</ul>`
        }
      }

      return `<div style="margin-bottom: 24px;">${fields}${bulletsHtml}</div>`
    })
    .join("")

  const title = escapeHtml(resolveSheetTemplateString(section.title, ctx))
  return `<section><h2>${title}</h2>${cards}</section>`
}

function renderBulletList(
  section: BulletListSection,
  ctx: Record<string, unknown>
): string {
  const rows = asRecordArray(resolveSheetPath(ctx, section.rowsBinding))
  if (rows.length === 0) return ""

  const items = rows
    .map((item) => {
      const text = resolveSheetBinding(section.item, mergeRowContext(ctx, item), "")
      return text.trim() !== ""
        ? `<li style="margin: 4px 0; padding-left: 3px;">${escapeHtml(text)}</li>`
        : ""
    })
    .join("")

  if (!items) return ""
  const title = escapeHtml(resolveSheetTemplateString(section.title, ctx))
  return `<section><h2>${title}</h2><ul style="margin: 0; padding-left: 32px;">${items}</ul></section>`
}

function renderFacts(section: FactsSection, ctx: Record<string, unknown>): string {
  const rows = section.items
    .map((item) => {
      const label = escapeHtml(resolveSheetTemplateString(item.label, ctx))
      const value = escapeHtml(resolveSheetBinding(item.value, ctx))
      return `<p style="margin: 0 0 4px;"><strong>${label}:</strong> ${value}</p>`
    })
    .join("")
  const title = escapeHtml(resolveSheetTemplateString(section.title, ctx))
  return `<section><h2>${title}</h2><div>${rows}</div></section>`
}

function renderParagraph(
  section: ParagraphSection,
  ctx: Record<string, unknown>
): string {
  const text = resolveSheetBinding(section.text, ctx, "")
  if (text.trim() === "") return ""
  const title = escapeHtml(resolveSheetTemplateString(section.title, ctx))
  return `<section><h2>${title}</h2><p style="margin: 0; text-align: justify;">${escapeHtml(text)}</p></section>`
}

function renderSection(
  section: TechnicalSheetSection,
  ctx: Record<string, unknown>
): string {
  switch (section.type) {
    case "repeatCards":
      return renderRepeatCards(section, ctx)
    case "bulletList":
      return renderBulletList(section, ctx)
    case "facts":
      return renderFacts(section, ctx)
    case "paragraph":
      return renderParagraph(section, ctx)
    default:
      return ""
  }
}

/**
 * Renders a technical-sheet schema to sanitized HTML for iframe preview.
 * All bound values are escaped; author HTML is never interpolated.
 */
export function renderTechnicalSheetSchemaToHtml(
  schema: TechnicalSheetSchema,
  ctx: Record<string, unknown>
): string {
  const body = schema.sections.map((section) => renderSection(section, ctx)).join("")
  const html = `<style>${getTechnicalSheetSchemaPreviewCss()}</style><main class="technical-sheet-source"><article class="ts-article">${body}</article></main>`
  return sanitizeTemplateHtml(html)
}
