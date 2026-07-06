import type { ProfileChangeHighlight } from "@/lib/candidate-profile-version"

export type ProfileColumnVariant = "original" | "adapted"

export type ProfileSectionId =
  | "hero"
  | "contact"
  | "personal"
  | "prefs"
  | "work"
  | "edu"
  | "lang"
  | "skills"
  | "links"
  | "refs"
  | "recog"

export function formatMatchScore(score: number | null | undefined): string | null {
  if (score == null || Number.isNaN(score)) return null
  const percent = score <= 1 ? Math.round(score * 100) : Math.round(score)
  return `${percent}%`
}

export function resolveHighlightedSections(highlights: ProfileChangeHighlight[]): Set<ProfileSectionId> {
  const sections = new Set<ProfileSectionId>()
  for (const item of highlights) {
    const field = item.field.toLowerCase()
    if (
      field.includes("headline") ||
      field.includes("titular") ||
      field.includes("summary") ||
      field.includes("resumen")
    ) {
      sections.add("hero")
    }
    if (field.includes("email") || field.includes("phone") || field.includes("teléfono") || field.includes("contacto")) {
      sections.add("contact")
    }
    if (
      field.includes("country") ||
      field.includes("país") ||
      field.includes("birth") ||
      field.includes("nacimiento")
    ) {
      sections.add("personal")
    }
    if (
      field.includes("job") ||
      field.includes("preference") ||
      field.includes("preferencia") ||
      field.includes("salary") ||
      field.includes("salario") ||
      field.includes("sector")
    ) {
      sections.add("prefs")
    }
    if (field.includes("work") || field.includes("experiencia") || field.includes("experience")) {
      sections.add("work")
    }
    if (field.includes("education") || field.includes("educación") || field.includes("formación")) {
      sections.add("edu")
    }
    if (field.includes("language") || field.includes("idioma")) {
      sections.add("lang")
    }
    if (field.includes("skill") || field.includes("habilidad") || field.includes("competencia")) {
      sections.add("skills")
    }
    if (field.includes("social") || field.includes("link") || field.includes("video")) {
      sections.add("links")
    }
    if (field.includes("reference") || field.includes("referencia")) {
      sections.add("refs")
    }
    if (field.includes("recognition") || field.includes("reconocimiento") || field.includes("logro")) {
      sections.add("recog")
    }
  }
  return sections
}

export const normalizeObjectArray = (raw: unknown) => {
  if (!Array.isArray(raw)) return []
  const out: Record<string, unknown>[] = []
  for (const item of raw) {
    if (item == null) continue
    if (typeof item === "object" && !Array.isArray(item)) {
      out.push(item as Record<string, unknown>)
      continue
    }
    if (typeof item === "string") {
      const trimmed = item.trim()
      if (!trimmed) continue
      try {
        const parsed = JSON.parse(trimmed)
        if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
          out.push(parsed as Record<string, unknown>)
        }
      } catch {
        /* skip invalid */
      }
    }
  }
  return out
}

export const parseJsonObjectIfString = (value: unknown) => {
  if (value == null) return null
  if (typeof value === "object" && !Array.isArray(value)) return value
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed
      }
    } catch {
      return null
    }
  }
  return null
}

export const normalizeSkillsList = (skills: unknown): string[] => {
  if (!Array.isArray(skills)) return []
  return skills
    .map((s) => (typeof s === "string" ? s.trim() : String(s ?? "")))
    .filter(Boolean)
}
