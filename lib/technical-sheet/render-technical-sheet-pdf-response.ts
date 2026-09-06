import type { TechnicalSheetPayload } from "@/lib/api/technical-sheet"
import { buildTechnicalSheetPdfKitBuffer } from "@/lib/technical-sheet/build-technical-sheet-pdfkit"
import { resolveTechnicalSheetSchema } from "@/lib/technical-sheet/schema/technical-sheet-schema"
import type { TechnicalSheetSchema } from "@/lib/technical-sheet/schema/technical-sheet-schema-types"
import { buildTechnicalSheetTemplateContext } from "@/lib/technical-sheet/template-interpolate"
import {
  assertTechnicalSheetPdfHtmlSize,
  isValidTechnicalSheetPreviewHtml,
} from "@/lib/technical-sheet/validate-technical-sheet-preview-html"
import { ensureTechnicalSheetPdfDocument } from "@/lib/technical-sheet/wrap-technical-sheet-html-for-pdf"
import type { TemplateListItem } from "@/lib/templates/technical-sheet-template"
import { findTechnicalSheetDocumentTemplate } from "@/lib/templates/technical-sheet-template"
import { technicalSheetMessages as m } from "@/lib/messages/technical-sheet"

export interface RenderTechnicalSheetPdfInput {
  payload: TechnicalSheetPayload
  templates: TemplateListItem[]
  candidateProfileId: string
  vacancyTitleFallback: string | null
  previewHtml?: string | null
  /**
   * `pdfkit` (default, schema-driven like reports).
   * `chromium` is an emergency rollback that prints schema HTML, not author markup.
   */
  engine?: "pdfkit" | "chromium"
  preferPdfKit?: boolean
}

export class TechnicalSheetPdfError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function resolveEngine(input: RenderTechnicalSheetPdfInput): "pdfkit" | "chromium" {
  if (input.engine === "chromium" || input.engine === "pdfkit") return input.engine
  if (input.preferPdfKit === false) return "chromium"
  return "pdfkit"
}

function resolveSheetSchema(input: RenderTechnicalSheetPdfInput): TechnicalSheetSchema {
  const picked = findTechnicalSheetDocumentTemplate(input.templates)
  const rawTemplate = picked?.contentTemplate?.trim() ?? ""
  if (!picked || rawTemplate === "") {
    throw new TechnicalSheetPdfError(m.errorNoTechnicalSheetTemplate, 400)
  }
  return resolveTechnicalSheetSchema(rawTemplate).schema
}

async function renderFromSchemaPdfKit(input: RenderTechnicalSheetPdfInput): Promise<Buffer> {
  const schema = resolveSheetSchema(input)
  return buildTechnicalSheetPdfKitBuffer(input.payload, {
    schema,
    vacancyTitleFallback: input.vacancyTitleFallback,
  })
}

/**
 * Chromium path only — dynamic imports keep puppeteer/@sparticuz/chromium/jsdom
 * out of the default PDFKit serverless cold start on Vercel.
 */
async function renderFromSchemaChromium(input: RenderTechnicalSheetPdfInput): Promise<Buffer> {
  const [
    { resolveVisibleLogoDataUriForPdf },
    { buildVisibleLogoUrlForTechnicalSheet },
    { renderTechnicalSheetSchemaToHtml },
    { renderPaginatedTechnicalSheetPdfFromInterpolated },
  ] = await Promise.all([
    import("@/lib/technical-sheet/resolve-visible-logo-data-uri"),
    import("@/lib/technical-sheet/server-public-app-url"),
    import("@/lib/technical-sheet/schema/render-technical-sheet-schema-to-html"),
    import("@/lib/technical-sheet/technical-sheet-pdf-render-paginated"),
  ])

  const schema = resolveSheetSchema(input)
  const logoDataUri = await resolveVisibleLogoDataUriForPdf()
  const logoFallbackUrl = buildVisibleLogoUrlForTechnicalSheet()
  const logoUrl = logoDataUri ?? (logoFallbackUrl.trim() !== "" ? logoFallbackUrl : null)
  const ctx = buildTechnicalSheetTemplateContext(input.payload, {
    vacancyTitleFallback: input.vacancyTitleFallback,
    logoUrl,
  })
  const innerHtml = renderTechnicalSheetSchemaToHtml(schema, ctx)
  assertTechnicalSheetPdfHtmlSize(innerHtml)
  const headerRecord = ctx.header as Record<string, unknown> | undefined
  const header = {
    fullName: String(headerRecord?.fullName ?? ""),
    address: String(headerRecord?.address ?? ""),
    englishLevel: String(headerRecord?.englishLevel ?? ""),
  }
  return renderPaginatedTechnicalSheetPdfFromInterpolated(
    innerHtml,
    header,
    String(ctx.logoUrl ?? "")
  )
}

async function renderFromPreviewHtml(previewHtml: string): Promise<Buffer> {
  const [
    { sanitizeTechnicalSheetPreviewHtml },
    { inlineVisibleLogoInPreviewHtml },
    { renderHtmlToPdfBuffer },
  ] = await Promise.all([
    import("@/lib/technical-sheet/sanitize-technical-sheet-preview-html"),
    import("@/lib/technical-sheet/inline-preview-html-images-for-pdf"),
    import("@/lib/technical-sheet/html-to-pdf-chromium"),
  ])

  const sanitized = sanitizeTechnicalSheetPreviewHtml(previewHtml)
  assertTechnicalSheetPdfHtmlSize(sanitized)
  const withInlineLogo = await inlineVisibleLogoInPreviewHtml(sanitized)
  const documentHtml = ensureTechnicalSheetPdfDocument(withInlineLogo)
  assertTechnicalSheetPdfHtmlSize(documentHtml)
  return renderHtmlToPdfBuffer(documentHtml, { mediaType: "screen" })
}

export async function renderTechnicalSheetPdfBuffer(
  input: RenderTechnicalSheetPdfInput
): Promise<Buffer> {
  const engine = resolveEngine(input)

  if (engine === "pdfkit") {
    return renderFromSchemaPdfKit(input)
  }

  const previewHtml = input.previewHtml?.trim() ?? ""
  const sanitizedPreview =
    previewHtml !== ""
      ? (await import("@/lib/technical-sheet/sanitize-technical-sheet-preview-html"))
          .sanitizeTechnicalSheetPreviewHtml(previewHtml)
      : ""
  const hasValidPreview =
    sanitizedPreview !== "" && isValidTechnicalSheetPreviewHtml(sanitizedPreview)

  if (hasValidPreview) {
    return renderFromPreviewHtml(previewHtml)
  }

  if (previewHtml !== "") {
    console.warn(
      "[technical-sheet-pdf] Preview HTML rejected after sanitize; using schema Chromium pipeline"
    )
  }

  return renderFromSchemaChromium(input)
}

export function buildTechnicalSheetPdfFilename(candidateProfileId: string): string {
  const cid = String(candidateProfileId ?? "").trim()
  return `ficha-tecnica-${cid.slice(0, 8)}.pdf`
}
