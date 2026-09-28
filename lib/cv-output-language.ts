import { isLocale, type Locale } from "@/i18n/routing"

export type CvOutputLanguage = "ES" | "EN" | "IT" | "FR" | "DE"

export type CvOutputLanguageErrorKind = "invalid" | "mismatch"

export const DEFAULT_CV_OUTPUT_LANGUAGE: CvOutputLanguage = "ES"

export const CV_OUTPUT_LANGUAGE_FIELD = "outputLanguage"

const CV_OUTPUT_LANGUAGE_MISMATCH_CODE = "CV_OUTPUT_LANGUAGE_MISMATCH"

const OUTPUT_LANGUAGE_BY_LOCALE: Record<Locale, CvOutputLanguage> = {
  es: "ES",
  en: "EN",
  it: "IT",
  fr: "FR",
  de: "DE",
}

/** Backend only accepts ES, EN, IT, FR, DE (German is DE, never GR). */
export function toCvOutputLanguage(locale: unknown): CvOutputLanguage {
  const normalized = typeof locale === "string" ? locale.trim().toLowerCase() : ""
  return isLocale(normalized)
    ? OUTPUT_LANGUAGE_BY_LOCALE[normalized]
    : DEFAULT_CV_OUTPUT_LANGUAGE
}

/**
 * Accepts either an `apiClient` error (with `status` / `body`) or a raw
 * response body. Some endpoints omit `code` on 400, so `errors.outputLanguage`
 * is the reliable signal.
 */
export function getCvOutputLanguageErrorKind(
  errOrBody: unknown
): CvOutputLanguageErrorKind | null {
  const body = getErrorBody(errOrBody)
  if (!body) return null

  const code = typeof body.code === "string" ? body.code.trim() : ""
  if (code === CV_OUTPUT_LANGUAGE_MISMATCH_CODE) return "mismatch"

  return hasOutputLanguageFieldError(body) ? "invalid" : null
}

/** Removes `outputLanguage` from a field-error map so it never renders as a form field. */
export function omitCvOutputLanguageFieldError<T extends Record<string, string>>(
  fieldErrors: T
): T {
  const out = { ...fieldErrors }
  for (const key of Object.keys(out)) {
    if (key.toLowerCase() === CV_OUTPUT_LANGUAGE_FIELD.toLowerCase()) {
      delete out[key]
    }
  }
  return out
}

function getErrorBody(errOrBody: unknown): Record<string, unknown> | null {
  const record = toRecord(errOrBody)
  if (!record) return null
  if ("body" in record) {
    const nested = toRecord(record.body)
    if (nested) return nested
  }
  return record
}

function hasOutputLanguageFieldError(body: Record<string, unknown>): boolean {
  const errors = toRecord(body.errors ?? body.Errors)
  if (!errors) return false
  return Object.keys(errors).some(
    (key) => key.toLowerCase() === CV_OUTPUT_LANGUAGE_FIELD.toLowerCase()
  )
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}
