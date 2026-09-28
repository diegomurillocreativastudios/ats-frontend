import type { TechnicalSheetPayload } from "@/lib/api/technical-sheet"
import { buildTechnicalSheetPdfKitBuffer } from "@/lib/technical-sheet/build-technical-sheet-pdfkit"
import { resolveTechnicalSheetSchema } from "@/lib/technical-sheet/schema/technical-sheet-schema"
import type { TechnicalSheetSchema } from "@/lib/technical-sheet/schema/technical-sheet-schema-types"
import type { TemplateListItem } from "@/lib/templates/technical-sheet-template"
import { findTechnicalSheetDocumentTemplate } from "@/lib/templates/technical-sheet-template"
import type { TechnicalSheetCompanyBrand } from "@/lib/technical-sheet/vacancy-company-brand"
import { technicalSheetMessages as m } from "@/lib/messages/technical-sheet"
import { logServerError } from "@/lib/security/safe-server-log"

export interface RenderTechnicalSheetPdfInput {
  payload: TechnicalSheetPayload
  templates: TemplateListItem[]
  candidateProfileId: string
  vacancyTitleFallback: string | null
  /** Vacancy sheets only: company mark next to ApplicanTree. */
  companyBrand?: TechnicalSheetCompanyBrand | null
  /**
   * `chromium` (default): mismo HTML que la vista previa.
   * `pdfkit`: rollback de emergencia (texto programático).
   */
  engine?: "pdfkit" | "chromium"
  preferPdfKit?: boolean
}

export interface RenderTechnicalSheetPdfResult {
  buffer: Buffer
  /** Motor que produjo el buffer (puede ser PDFKit tras fallback). */
  engine: "pdfkit" | "chromium"
  /** Si Chromium falló y se usó PDFKit como respaldo. */
  fallbackFrom?: "chromium"
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
  if (input.preferPdfKit === true) return "pdfkit"
  return "chromium"
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
    companyBrand: input.companyBrand ?? null,
  })
}

/**
 * Chromium path only — dynamic imports keep puppeteer/@sparticuz/chromium/jsdom
 * out of the default PDFKit serverless cold start on Vercel.
 * Always renders schema HTML from authoritative payload (FE-SEC-015).
 */
async function renderFromSchemaChromium(input: RenderTechnicalSheetPdfInput): Promise<Buffer> {
  const [
    { resolveVisibleLogoDataUriForPdf },
    { buildVisibleLogoUrlForTechnicalSheet },
    { renderTechnicalSheetSchemaToHtml },
    { renderPaginatedTechnicalSheetPdfFromInterpolated },
    { buildTechnicalSheetTemplateContext },
    { assertTechnicalSheetPdfHtmlSize },
  ] = await Promise.all([
    import("@/lib/technical-sheet/resolve-visible-logo-data-uri"),
    import("@/lib/technical-sheet/server-public-app-url"),
    import("@/lib/technical-sheet/schema/render-technical-sheet-schema-to-html"),
    import("@/lib/technical-sheet/technical-sheet-pdf-render-paginated"),
    import("@/lib/technical-sheet/technical-sheet-template-context"),
    import("@/lib/technical-sheet/validate-technical-sheet-preview-html"),
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
  const companyBrand = input.companyBrand ?? null
  return renderPaginatedTechnicalSheetPdfFromInterpolated(
    innerHtml,
    header,
    String(ctx.logoUrl ?? ""),
    {
      companyBrand: companyBrand
        ? {
            name: companyBrand.name,
            logoDataUri: companyBrand.logoDataUri,
          }
        : null,
    }
  )
}

export async function renderTechnicalSheetPdfBuffer(
  input: RenderTechnicalSheetPdfInput
): Promise<RenderTechnicalSheetPdfResult> {
  const engine = resolveEngine(input)

  if (engine === "pdfkit") {
    return { buffer: await renderFromSchemaPdfKit(input), engine: "pdfkit" }
  }

  try {
    return { buffer: await renderFromSchemaChromium(input), engine: "chromium" }
  } catch (err) {
    // Domain errors (missing template, oversized HTML) must not silently fall back.
    if (err instanceof TechnicalSheetPdfError) throw err
    const withStatus = err as Error & { status?: number }
    if (typeof withStatus.status === "number" && withStatus.status >= 400 && withStatus.status < 600) {
      throw err
    }

    logServerError("technical-sheet-pdf-chromium-fallback", err)
    return {
      buffer: await renderFromSchemaPdfKit(input),
      engine: "pdfkit",
      fallbackFrom: "chromium",
    }
  }
}

export function buildTechnicalSheetPdfFilename(candidateProfileId: string): string {
  const cid = String(candidateProfileId ?? "").trim()
  return `ficha-tecnica-${cid.slice(0, 8)}.pdf`
}
