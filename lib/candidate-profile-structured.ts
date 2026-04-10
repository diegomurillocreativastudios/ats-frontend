/**
 * Normalización de arrays/objetos del perfil (misma lógica que CandidateProfileSections).
 */

export const parseJsonObjectIfString = (value: unknown): Record<string, unknown> | null => {
  if (value == null) return null
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return null
    }
  }
  return null
}

export const normalizeObjectArray = (raw: unknown): Record<string, unknown>[] => {
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
        /* skip */
      }
    }
  }
  return out
}

export const str = (v: unknown) => (v == null ? "" : String(v))

export interface WorkExperienceRow {
  company: string
  role: string
  startDate: string
  endDate: string
  description: string
}

export const workRowFromObj = (o: Record<string, unknown>): WorkExperienceRow => ({
  company: str(o.Company ?? o.company),
  role: str(o.Role ?? o.role),
  startDate: str(o.StartDate ?? o.startDate),
  endDate: str(o.EndDate ?? o.endDate),
  description: str(o.Description ?? o.description),
})

export const workRowToApi = (r: WorkExperienceRow) => ({
  Company: r.company.trim(),
  Role: r.role.trim(),
  StartDate: r.startDate.trim(),
  EndDate: r.endDate.trim(),
  Description: r.description.trim(),
})

export interface EducationRow {
  institution: string
  degree: string
  startDate: string
  endDate: string
}

export const eduRowFromObj = (o: Record<string, unknown>): EducationRow => ({
  institution: str(o.Institution ?? o.institution),
  degree: str(o.Degree ?? o.degree),
  startDate: str(o.StartDate ?? o.startDate),
  endDate: str(o.EndDate ?? o.endDate),
})

export const eduRowToApi = (r: EducationRow) => ({
  Institution: r.institution.trim(),
  Degree: r.degree.trim(),
  StartDate: r.startDate.trim(),
  EndDate: r.endDate.trim(),
})

export interface LanguageRow {
  language: string
  level: string
}

export const langRowFromObj = (o: Record<string, unknown>): LanguageRow => ({
  language: str(o.Language ?? o.language),
  level: str(o.Level ?? o.level),
})

export const langRowToApi = (r: LanguageRow) => ({
  Language: r.language.trim(),
  Level: r.level.trim(),
})

export interface SocialRow {
  platform: string
  url: string
}

export const socialRowFromObj = (o: Record<string, unknown>): SocialRow => ({
  platform: str(o.Platform ?? o.platform),
  url: str(o.Url ?? o.url),
})

export const socialRowToApi = (r: SocialRow) => ({
  Platform: r.platform.trim(),
  Url: r.url.trim(),
})

export interface ReferenceRow {
  name: string
  position: string
  company: string
  contact: string
}

export const refRowFromObj = (o: Record<string, unknown>): ReferenceRow => ({
  name: str(o.Name ?? o.name),
  position: str(o.Position ?? o.position),
  company: str(o.Company ?? o.company),
  contact: str(o.Contact ?? o.contact),
})

export const refRowToApi = (r: ReferenceRow) => ({
  Name: r.name.trim(),
  Position: r.position.trim(),
  Company: r.company.trim(),
  Contact: r.contact.trim(),
})

export const parseSkillsToLines = (raw: unknown): string => {
  if (raw == null) return ""
  if (Array.isArray(raw)) {
    return raw
      .map((x) => (typeof x === "string" ? x.trim() : String(x ?? "")))
      .filter(Boolean)
      .join("\n")
  }
  if (typeof raw === "string") return raw
  return ""
}

export const linesToSkillsArray = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)

export const parseRecognitionsToLines = (raw: unknown): string => {
  if (!Array.isArray(raw)) return ""
  return raw
    .map((x) => (typeof x === "string" ? x : JSON.stringify(x)))
    .join("\n")
}

export const linesToRecognitionsArray = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)

export const emptyWorkRow = (): WorkExperienceRow => ({
  company: "",
  role: "",
  startDate: "",
  endDate: "",
  description: "",
})

export const emptyEduRow = (): EducationRow => ({
  institution: "",
  degree: "",
  startDate: "",
  endDate: "",
})

export const emptyLangRow = (): LanguageRow => ({ language: "", level: "" })
export const emptySocialRow = (): SocialRow => ({ platform: "", url: "" })
export const emptyRefRow = (): ReferenceRow => ({
  name: "",
  position: "",
  company: "",
  contact: "",
})
