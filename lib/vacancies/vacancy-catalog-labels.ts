/**
 * Labels for known catalog sentinel values from the API (e.g. `Uncategorized`).
 * Keys are relative to `useTranslations("RecruiterPortal.vacancies")`.
 */
const CATALOG_FALLBACK_KEYS: Record<string, string> = {
  uncategorized: "catalogFallbacks.uncategorized",
}

export function getVacancyJobCategoryLabel(
  jobCategory: string | null | undefined,
  t: (key: string) => string
): string {
  if (!jobCategory) return ""
  const trimmed = jobCategory.trim()
  if (!trimmed) return ""
  const key = CATALOG_FALLBACK_KEYS[trimmed.toLowerCase()]
  return key ? t(key) : trimmed
}
