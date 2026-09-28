import { buildSafeLogoDataUri } from "@/lib/safe-logo-data-uri"
import { unwrapVacancyDetailPayload } from "@/lib/vacancies/normalize-vacancy-detail-from-api"

/** Company mark shown next to ApplicanTree on vacancy technical sheets. */
export interface TechnicalSheetCompanyBrand {
  /** Display name of the vacancy's company. Empty when unknown. */
  name: string
  /** Safe raster data URI, or null when missing / SVG / invalid. */
  logoDataUri: string | null
}

function readCompanyName(vacancy: Record<string, unknown>): string {
  const keys = [
    "companyName",
    "company_name",
    "CompanyName",
    "company",
    "Company",
    "clientName",
    "client_name",
  ] as const
  for (const key of keys) {
    const value = vacancy[key]
    if (typeof value === "string" && value.trim() !== "") return value.trim()
    if (value != null && typeof value === "object" && !Array.isArray(value)) {
      const nested = value as Record<string, unknown>
      const nestedName = nested.name ?? nested.Name ?? nested.companyName
      if (typeof nestedName === "string" && nestedName.trim() !== "") {
        return nestedName.trim()
      }
    }
  }
  return ""
}

function readLogoDataUri(vacancy: Record<string, unknown>): string | null {
  const hasLogo = Boolean(vacancy.hasLogo ?? vacancy.has_logo)
  if (!hasLogo) return null
  const logo = vacancy.logo ?? vacancy.Logo
  if (logo == null || typeof logo !== "object" || Array.isArray(logo)) return null
  const logoRecord = logo as Record<string, unknown>
  return buildSafeLogoDataUri({
    base64: String(logoRecord.base64 ?? "").trim() || null,
    contentType:
      String(logoRecord.contentType ?? logoRecord.content_type ?? "").trim() || null,
  })
}

/**
 * Reads company name + safe logo from a recruiter vacancy detail payload.
 * Returns null when there is nothing useful to show (no name and no logo).
 */
export function readTechnicalSheetCompanyBrandFromVacancy(
  raw: unknown
): TechnicalSheetCompanyBrand | null {
  const vacancy = unwrapVacancyDetailPayload(raw)
  if (!vacancy) return null

  const name = readCompanyName(vacancy)
  const logoDataUri = readLogoDataUri(vacancy)
  if (!name && !logoDataUri) return null

  return { name, logoDataUri }
}
