export const MAX_VACANCY_TEXT_LENGTH = 50_000

export type VacancyInputTab = "file" | "text" | "platform"

export interface VacancyFileSource {
  kind: "file"
  file: File
}

export interface VacancyTextSource {
  kind: "text"
  text: string
}

export interface VacancyPlatformSource {
  kind: "platform"
  vacancyId: string
  vacancyTitle: string
}

export type VacancySourceInput =
  | VacancyFileSource
  | VacancyTextSource
  | VacancyPlatformSource

export type VacancySourceValidationError =
  | "none"
  | "multiple"
  | "empty_text"
  | "text_too_long"
  | "missing_vacancy"

/**
 * Valida que exista exactamente una fuente de vacante activa para procesar.
 */
export function resolveExclusiveVacancySource(input: {
  file: File | null
  text: string
  vacancyId: string | null
}): { source: VacancySourceInput | null; error: VacancySourceValidationError } {
  const trimmedText = input.text.trim()
  const hasFile = input.file != null
  const hasText = trimmedText.length > 0
  const hasVacancy = Boolean(input.vacancyId?.trim())

  const count = [hasFile, hasText, hasVacancy].filter(Boolean).length
  if (count === 0) return { source: null, error: "none" }
  if (count > 1) return { source: null, error: "multiple" }

  if (hasFile && input.file) {
    return { source: { kind: "file", file: input.file }, error: "none" }
  }

  if (hasText) {
    if (trimmedText.length > MAX_VACANCY_TEXT_LENGTH) {
      return { source: null, error: "text_too_long" }
    }
    return { source: { kind: "text", text: trimmedText }, error: "none" }
  }

  if (hasVacancy && input.vacancyId) {
    return {
      source: {
        kind: "platform",
        vacancyId: input.vacancyId.trim(),
        vacancyTitle: "",
      },
      error: "none",
    }
  }

  return { source: null, error: "missing_vacancy" }
}

export function tabHasDraftContent(
  tab: VacancyInputTab,
  input: { file: File | null; text: string; vacancyId: string | null }
): boolean {
  if (tab === "file") return input.file != null
  if (tab === "text") return input.text.trim().length > 0
  return Boolean(input.vacancyId?.trim())
}
