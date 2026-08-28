/**
 * Normalizes recruiter vacancy detail payloads so UI can rely on camelCase arrays.
 */
export function unwrapVacancyDetailPayload(
  data: unknown
): Record<string, unknown> | null {
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return null
  }
  const root = data as Record<string, unknown>
  const nested = root.vacancy ?? root.data ?? root.result
  if (nested != null && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, unknown>
  }
  return root
}

function readApplicantsArray(root: Record<string, unknown>): unknown[] {
  if (Array.isArray(root.applicants)) return root.applicants
  if (Array.isArray(root.Applicants)) return root.Applicants
  return []
}

function readAiMatchSuggestionsArray(root: Record<string, unknown>): unknown[] {
  if (Array.isArray(root.aiMatchSuggestions)) return root.aiMatchSuggestions
  if (Array.isArray(root.AiMatchSuggestions)) return root.AiMatchSuggestions
  if (Array.isArray(root.matches)) return root.matches
  if (Array.isArray(root.Matches)) return root.Matches
  return []
}

function readOptionalText(
  root: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = root[key]
    if (value == null) continue
    const text = String(value).trim()
    if (text !== "") return text
  }
  return undefined
}

export function normalizeVacancyDetailFromApi(
  data: unknown
): Record<string, unknown> | null {
  const root = unwrapVacancyDetailPayload(data)
  if (!root) return null

  const advantages = readOptionalText(root, [
    "advantages",
    "Advantages",
    "perks",
    "Perks",
    "benefitsText",
    "benefits_text",
    "BenefitsText",
    "ventajas",
    "Ventajas",
  ])

  return {
    ...root,
    applicants: readApplicantsArray(root),
    aiMatchSuggestions: readAiMatchSuggestionsArray(root),
    ...(advantages != null ? { advantages } : {}),
  }
}
