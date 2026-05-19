import type { TechnicalSheetPayload } from "@/lib/api/technical-sheet"
import { buildTechnicalSheetPdfKitBuffer } from "@/lib/technical-sheet/build-technical-sheet-pdfkit"
import { renderHtmlToPdfBuffer } from "@/lib/technical-sheet/html-to-pdf-chromium"
import { renderPaginatedTechnicalSheetPdfFromInterpolated } from "@/lib/technical-sheet/technical-sheet-pdf-render-paginated"
import { buildVisibleLogoUrlForTechnicalSheet } from "@/lib/technical-sheet/server-public-app-url"
import { tryLoadVisibleLogoDataUriForTechnicalSheetPdf } from "@/lib/technical-sheet/technical-sheet-pdf-logo"
import {
  buildTechnicalSheetTemplateContext,
  renderTechnicalSheetHtml,
} from "@/lib/technical-sheet/template-interpolate"
import { isValidTechnicalSheetPreviewHtml } from "@/lib/technical-sheet/validate-technical-sheet-preview-html"
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
  preferPdfKit?: boolean
}

export class TechnicalSheetPdfError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function renderTechnicalSheetPdfBuffer(
  input: RenderTechnicalSheetPdfInput
): Promise<Buffer> {
  if (input.preferPdfKit) {
    return buildTechnicalSheetPdfKitBuffer(input.payload)
  }

  const previewHtml = input.previewHtml?.trim() ?? ""
  if (previewHtml !== "" && isValidTechnicalSheetPreviewHtml(previewHtml)) {
    return renderHtmlToPdfBuffer(ensureTechnicalSheetPdfDocument(previewHtml))
  }

  const picked = findTechnicalSheetDocumentTemplate(input.templates)
  const rawTemplate = picked?.contentTemplate?.trim() ?? ""
  if (!picked || rawTemplate === "") {
    throw new TechnicalSheetPdfError(m.errorNoTechnicalSheetTemplate, 400)
  }

  const logoDataUri = tryLoadVisibleLogoDataUriForTechnicalSheetPdf()
  const logoFallbackUrl = buildVisibleLogoUrlForTechnicalSheet()
  const logoUrl = logoDataUri ?? (logoFallbackUrl.trim() !== "" ? logoFallbackUrl : null)
  const ctx = buildTechnicalSheetTemplateContext(input.payload, {
    vacancyTitleFallback: input.vacancyTitleFallback,
    logoUrl,
  })
  const innerHtml = renderTechnicalSheetHtml(rawTemplate, ctx)
  const headerRecord = ctx.header as Record<string, unknown> | undefined
  const header = {
    fullName: String(headerRecord?.fullName ?? ""),
    address: String(headerRecord?.address ?? ""),
    englishLevel: String(headerRecord?.englishLevel ?? ""),
  }

  try {
    return await renderPaginatedTechnicalSheetPdfFromInterpolated(
      innerHtml,
      header,
      String(ctx.logoUrl ?? "")
    )
  } catch (chromiumErr) {
    const onVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV)
    const disablePdfKitFallback =
      process.env.TECHNICAL_SHEET_PDF_DISABLE_VERCEL_PDFKIT_FALLBACK === "1"
    if (!onVercel || disablePdfKitFallback) throw chromiumErr
    console.error(
      "[technical-sheet-pdf] Chromium PDF failed on Vercel; using PDFKit fallback",
      chromiumErr instanceof Error ? chromiumErr.stack ?? chromiumErr.message : chromiumErr
    )
    return buildTechnicalSheetPdfKitBuffer(input.payload)
  }
}

export function buildTechnicalSheetPdfFilename(candidateProfileId: string): string {
  const cid = String(candidateProfileId ?? "").trim()
  return `ficha-tecnica-${cid.slice(0, 8)}.pdf`
}
