import type { CandidateProfile } from "@/lib/candidate-profile"
import type { ProfileChangeHighlight } from "@/lib/candidate-profile-version"
import {
  computeAtsComplianceSummary,
  type AtsComplianceChecklistItem,
  type AtsComplianceStatus,
} from "@/lib/ats-compliance-checklist"
const normalizeObjectArray = (raw: unknown) => {
  if (!Array.isArray(raw)) return []
  const out: Record<string, unknown>[] = []
  for (const item of raw) {
    if (item == null) continue
    if (typeof item === "object" && !Array.isArray(item)) {
      out.push(item as Record<string, unknown>)
    }
  }
  return out
}

const normalizeSkillsList = (skills: unknown): string[] => {
  if (!Array.isArray(skills)) return []
  return skills
    .map((s) => (typeof s === "string" ? s.trim() : String(s ?? "")))
    .filter(Boolean)
}

const parseJsonObjectIfString = (value: unknown) => {
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

export type ProfileComparisonVariant = "current" | "adapted"

export type AtsCriteriaResult = "current" | "adapted" | "tie" | "pending"

export interface ProfileCategoryScore {
  id: string
  labelKey: string
  value: number
}

export interface ComparisonCriterionRow {
  id: string
  labelKey: string
  currentValue: number
  adaptedValue: number
  result: AtsCriteriaResult
}

export interface ChecklistSummary {
  met: number
  total: number
  pending: number
  pendingLabel: string | null
}

export interface AdaptationInsight {
  id: string
  titleKey: string
  value: string
}

const NET_KEYWORDS = [".net", "c#", "asp.net", "aspnet", "entity framework", "entityframework"]
const FRONTEND_KEYWORDS = ["react", "next.js", "nextjs", "frontend", "tailwind", "javascript", "typescript", "vue", "angular"]
const CLOUD_KEYWORDS = ["aws", "gcp", "azure", "docker", "ci/cd", "devops", "cloud", "kubernetes", "vercel", "terraform"]
const ENGLISH_LEVELS = ["advanced", "avanzado", "fluent", "native", "b2", "c1", "c2", "proficient", "intermediate", "intermedio"]

const str = (value: unknown) => (value == null ? "" : String(value).trim())

const statusToPercent = (status: AtsComplianceStatus): number => {
  switch (status) {
    case "Met":
      return 95
    case "Partial":
      return 68
    case "Missing":
      return 38
    case "NotApplicable":
      return 0
    default:
      return 50
  }
}

const clampScore = (value: number) => Math.min(100, Math.max(0, Math.round(value)))

const collectProfileText = (profile: CandidateProfile): string => {
  const skills = normalizeSkillsList(profile.skills).join(" ")
  const work = normalizeObjectArray(profile.workExperience ?? [])
    .map((job) => `${str(job.Role ?? job.role)} ${str(job.Description ?? job.description)}`)
    .join(" ")
  return `${profile.headline} ${profile.summary} ${skills} ${work}`.toLowerCase()
}

const keywordDensityScore = (text: string, keywords: string[]): number => {
  if (!text.trim()) return 35
  const matches = keywords.filter((keyword) => text.includes(keyword)).length
  if (matches === 0) return 40
  const ratio = matches / keywords.length
  return clampScore(45 + ratio * 55)
}

const getChecklistScore = (
  checklist: AtsComplianceChecklistItem[],
  id: string,
  fallback: number
): number => {
  const item = checklist.find((entry) => entry.id === id)
  if (!item || item.status === "NotApplicable") return fallback
  return statusToPercent(item.status)
}

const getLanguageScore = (profile: CandidateProfile, checklist: AtsComplianceChecklistItem[]): number => {
  const checklistScore = getChecklistScore(checklist, "language", 0)
  const languages = normalizeObjectArray(profile.languages ?? [])
  const hasEnglish = languages.some((lang) => {
    const name = str(lang.Language ?? lang.language ?? lang.Name ?? lang.name).toLowerCase()
    const level = str(lang.Level ?? lang.level).toLowerCase()
    return name.includes("ingl") || name.includes("english")
      ? ENGLISH_LEVELS.some((entry) => level.includes(entry)) || level.length > 0
      : false
  })
  const profileScore = hasEnglish ? 90 : 55
  if (checklistScore > 0) return clampScore((checklistScore + profileScore) / 2)
  return profileScore
}

const getTitleMatchScore = (
  profile: CandidateProfile,
  checklist: AtsComplianceChecklistItem[],
  variant: ProfileComparisonVariant,
  changeHighlights: ProfileChangeHighlight[]
): number => {
  const checklistScore = getChecklistScore(checklist, "title_match", 0)
  const headlineChanged = changeHighlights.some((item) =>
    item.field.toLowerCase().includes("headline")
  )
  if (variant === "adapted") {
    if (checklistScore > 0) return checklistScore
    return headlineChanged ? 92 : 75
  }
  if (headlineChanged) return 55
  if (checklistScore > 0) return clampScore(checklistScore - 35)
  return profile.headline.trim() ? 70 : 45
}

export function formatCandidateName(profile: CandidateProfile): string {
  const first = str(profile.firstName)
  const last = str(profile.lastName)
  const combined = [first, last].filter(Boolean).join(" ")
  if (!combined) return "—"
  const lower = combined.toLowerCase()
  return lower.replace(/\b\w/g, (char) => char.toUpperCase())
}

export function getCandidateInitials(profile: CandidateProfile): string {
  const first = str(profile.firstName).charAt(0)
  const last = str(profile.lastName).charAt(0)
  const initials = `${first}${last}`.toUpperCase()
  return initials || "?"
}

export function formatDateRange(start: unknown, end: unknown): string {
  const startDate = str(start)
  const endDate = str(end)
  if (!startDate && !endDate) return ""
  const formatPart = (value: string) => {
    if (/^\d{4}-\d{2}/.test(value)) return value.slice(0, 7).replace("-", " ")
    return value
  }
  const formattedStart = startDate ? formatPart(startDate) : ""
  const formattedEnd = endDate ? formatPart(endDate) : "Presente"
  return [formattedStart, formattedEnd].filter(Boolean).join(" - ")
}

export function mapAtsStatus(status: AtsComplianceStatus): "met" | "partial" | "missing" | "na" {
  switch (status) {
    case "Met":
      return "met"
    case "Partial":
      return "partial"
    case "Missing":
      return "missing"
    case "NotApplicable":
      return "na"
    default:
      return "na"
  }
}

export function getChecklistSummary(checklist: AtsComplianceChecklistItem[]): ChecklistSummary {
  const { met, total } = computeAtsComplianceSummary(checklist)
  const pendingItems = checklist.filter(
    (item) => item.status === "Missing" || item.status === "Partial"
  )
  const realGap = pendingItems.find((item) => item.gapType === "RealGap" && item.status === "Missing")
  return {
    met,
    total,
    pending: pendingItems.length,
    pendingLabel: realGap?.label ?? pendingItems[0]?.label ?? null,
  }
}

export function computeAtsScoreFromChecklist(checklist: AtsComplianceChecklistItem[]): number {
  const applicable = checklist.filter((item) => item.status !== "NotApplicable")
  if (applicable.length === 0) return 78
  const total = applicable.reduce((acc, item) => acc + statusToPercent(item.status), 0)
  return clampScore(total / applicable.length)
}

export function getProfileScoreEstimate(
  variant: ProfileComparisonVariant,
  estimatedMatchScore: number | null,
  checklist: AtsComplianceChecklistItem[],
  changeHighlights: ProfileChangeHighlight[]
): number {
  const adaptedBase =
    estimatedMatchScore != null
      ? estimatedMatchScore <= 1
        ? Math.round(estimatedMatchScore * 100)
        : Math.round(estimatedMatchScore)
      : computeAtsScoreFromChecklist(checklist)

  if (variant === "adapted") return adaptedBase

  const significantChanges = changeHighlights.filter((item) => {
    const field = item.field.toLowerCase()
    return (
      field.includes("headline") ||
      field.includes("summary") ||
      field.includes("work") ||
      field.includes("job") ||
      field.includes("experience")
    )
  }).length

  const emptySummaryPenalty = changeHighlights.some((item) => {
    const field = item.field.toLowerCase()
    return field.includes("summary") && !item.before.trim()
  })
    ? 8
    : 0

  const penalty = Math.min(38, significantChanges * 6 + emptySummaryPenalty)
  return clampScore(adaptedBase - penalty)
}

export function getCategoryScores(
  profile: CandidateProfile,
  checklist: AtsComplianceChecklistItem[],
  variant: ProfileComparisonVariant,
  changeHighlights: ProfileChangeHighlight[]
): ProfileCategoryScore[] {
  const text = collectProfileText(profile)
  const keywordsScore = getChecklistScore(
    checklist,
    "vacancy_keywords",
    keywordDensityScore(text, [...NET_KEYWORDS, ...FRONTEND_KEYWORDS, "api", "sql"])
  )

  return [
    {
      id: "title_match",
      labelKey: "categories.titleMatch",
      value: getTitleMatchScore(profile, checklist, variant, changeHighlights),
    },
    {
      id: "dotnet_skills",
      labelKey: "categories.dotnetSkills",
      value:
        variant === "adapted"
          ? clampScore(keywordDensityScore(text, NET_KEYWORDS) + 8)
          : keywordDensityScore(text, NET_KEYWORDS),
    },
    {
      id: "frontend",
      labelKey: "categories.frontend",
      value: keywordDensityScore(text, FRONTEND_KEYWORDS),
    },
    {
      id: "cloud_devops",
      labelKey: "categories.cloudDevops",
      value: keywordDensityScore(text, CLOUD_KEYWORDS),
    },
    {
      id: "english",
      labelKey: "categories.english",
      value: getLanguageScore(profile, checklist),
    },
    {
      id: "ats_keywords",
      labelKey: "categories.atsKeywords",
      value: variant === "adapted" ? keywordsScore : clampScore(keywordsScore - 22),
    },
  ]
}

export function getTopSkillsForProfile(
  profile: CandidateProfile,
  variant: ProfileComparisonVariant,
  limit = 12
): string[] {
  const skills = normalizeSkillsList(profile.skills)
  if (skills.length === 0) return []

  const priorityPatterns =
    variant === "adapted"
      ? [/c#/i, /\.net/i, /asp\.net/i, /entity framework/i, /react/i, /sql/i, /api/i, /aws/i, /gcp/i, /docker/i, /git/i]
      : [/react/i, /next/i, /tailwind/i, /\.net/i, /python/i, /sql/i, /aws/i, /gcp/i, /docker/i, /postgres/i]

  const prioritized: string[] = []
  const remaining: string[] = []

  for (const skill of skills) {
    const matches = priorityPatterns.some((pattern) => pattern.test(skill))
    if (matches) prioritized.push(skill)
    else remaining.push(skill)
  }

  return [...prioritized, ...remaining].slice(0, limit)
}

export function getExperienceStartYear(profile: CandidateProfile): string | null {
  const jobs = normalizeObjectArray(profile.workExperience ?? [])
  const years = jobs
    .map((job) => str(job.StartDate ?? job.startDate))
    .filter(Boolean)
    .map((date) => date.slice(0, 4))
    .filter((year) => /^\d{4}$/.test(year))
    .sort()

  return years[0] ?? null
}

export function getYearsOfExperienceLabel(profile: CandidateProfile): string | null {
  const startYear = getExperienceStartYear(profile)
  if (!startYear) return null
  const currentYear = new Date().getFullYear()
  const years = Math.max(1, currentYear - Number(startYear))
  return `${years}+`
}

export function getPrimaryLanguageLevel(profile: CandidateProfile, languageName: string): string | null {
  const languages = normalizeObjectArray(profile.languages ?? [])
  const match = languages.find((lang) => {
    const name = str(lang.Language ?? lang.language ?? lang.Name ?? lang.name).toLowerCase()
    return name.includes(languageName.toLowerCase())
  })
  if (!match) return null
  return str(match.Level ?? match.level) || null
}

export function resolveVacancyDisplayTitle(
  vacancyTitle: string | null | undefined,
  adaptedProfile: CandidateProfile,
  changeHighlights: ProfileChangeHighlight[]
): string | null {
  if (vacancyTitle?.trim()) return vacancyTitle.trim()

  const prefs = parseJsonObjectIfString(adaptedProfile.jobPreferences)
  if (prefs && typeof prefs === "object") {
    const desired = str((prefs as Record<string, unknown>).DesiredRole ?? (prefs as Record<string, unknown>).desiredRole)
    if (desired) return desired
  }

  const headlineChange = changeHighlights.find((item) =>
    item.field.toLowerCase().includes("headline")
  )
  if (headlineChange?.reason) {
    const match = headlineChange.reason.match(/vacante[^.]*?([A-Z][^.]+)/i)
    if (match?.[1]) return match[1].trim()
  }

  return adaptedProfile.headline.trim() || null
}

export function buildComparisonCriteria(
  currentProfile: CandidateProfile,
  adaptedProfile: CandidateProfile,
  checklist: AtsComplianceChecklistItem[],
  changeHighlights: ProfileChangeHighlight[]
): ComparisonCriterionRow[] {
  const currentCategories = getCategoryScores(currentProfile, checklist, "current", changeHighlights)
  const adaptedCategories = getCategoryScores(adaptedProfile, checklist, "adapted", changeHighlights)

  const byId = (scores: ProfileCategoryScore[], id: string) =>
    scores.find((entry) => entry.id === id)?.value ?? 50

  const rows: ComparisonCriterionRow[] = [
    {
      id: "title_match",
      labelKey: "criteria.titleMatch",
      currentValue: byId(currentCategories, "title_match"),
      adaptedValue: byId(adaptedCategories, "title_match"),
      result: "pending",
    },
    {
      id: "vacancy_keywords",
      labelKey: "criteria.vacancyKeywords",
      currentValue: byId(currentCategories, "ats_keywords"),
      adaptedValue: byId(adaptedCategories, "ats_keywords"),
      result: "pending",
    },
    {
      id: "required_skills",
      labelKey: "criteria.requiredSkills",
      currentValue: byId(currentCategories, "dotnet_skills"),
      adaptedValue: byId(adaptedCategories, "dotnet_skills"),
      result: "pending",
    },
    {
      id: "language",
      labelKey: "criteria.language",
      currentValue: byId(currentCategories, "english"),
      adaptedValue: byId(adaptedCategories, "english"),
      result: "pending",
    },
    {
      id: "recent_experience",
      labelKey: "criteria.recentExperience",
      currentValue: getChecklistScore(checklist, "recent_experience", byId(currentCategories, "cloud_devops")),
      adaptedValue: getChecklistScore(checklist, "recent_experience", byId(adaptedCategories, "cloud_devops")),
      result: "pending",
    },
    {
      id: "measurable_achievements",
      labelKey: "criteria.measurableAchievements",
      currentValue: getChecklistScore(checklist, "measurable_achievements", 35),
      adaptedValue: clampScore(getChecklistScore(checklist, "measurable_achievements", 40) + 5),
      result: "pending",
    },
  ]

  return rows.map((row) => {
    if (row.id === "measurable_achievements") {
      const item = checklist.find((entry) => entry.id === "measurable_achievements")
      if (item?.status === "Missing" || item?.status === "Partial") {
        return { ...row, result: "pending" as const }
      }
    }
    const diff = row.adaptedValue - row.currentValue
    if (Math.abs(diff) <= 3) return { ...row, result: "tie" as const }
    return { ...row, result: diff > 0 ? ("adapted" as const) : ("current" as const) }
  })
}

export function deriveStrengths(
  profile: CandidateProfile,
  variant: ProfileComparisonVariant,
  categoryScores: ProfileCategoryScore[]
): string[] {
  const strengths: string[] = []
  const skillsCount = normalizeSkillsList(profile.skills).length

  if (skillsCount >= 10) strengths.push("strengths.completeTechnicalProfile")
  if ((categoryScores.find((c) => c.id === "frontend")?.value ?? 0) >= 85) {
    strengths.push("strengths.strongFrontend")
  }
  if ((categoryScores.find((c) => c.id === "cloud_devops")?.value ?? 0) >= 80) {
    strengths.push("strengths.cloudDevops")
  }
  if ((categoryScores.find((c) => c.id === "english")?.value ?? 0) >= 85) {
    strengths.push("strengths.englishLevel")
  }
  if (variant === "adapted" && profile.summary.trim()) {
    strengths.push("strengths.clearSummary")
  }
  if (variant === "adapted" && profile.headline.trim()) {
    strengths.push("strengths.alignedHeadline")
  }
  if (variant === "adapted") {
    strengths.push("strengths.integratedKeywords")
  }

  return [...new Set(strengths)].slice(0, 4)
}

export function deriveOpportunities(
  profile: CandidateProfile,
  variant: ProfileComparisonVariant,
  checklist: AtsComplianceChecklistItem[],
  changeHighlights: ProfileChangeHighlight[]
): string[] {
  const opportunities: string[] = []

  if (variant === "current") {
    const headlineChanged = changeHighlights.some((item) =>
      item.field.toLowerCase().includes("headline")
    )
    if (headlineChanged) opportunities.push("opportunities.misalignedHeadline")
    if (!profile.summary.trim()) opportunities.push("opportunities.emptySummary")
    if (changeHighlights.length >= 2) opportunities.push("opportunities.unfocusedKeywords")
  }

  const measurable = checklist.find((item) => item.id === "measurable_achievements")
  if (measurable && (measurable.status === "Missing" || measurable.status === "Partial")) {
    opportunities.push(
      variant === "current" ? "opportunities.noMeasurableAchievements" : "opportunities.addImpactMetrics"
    )
  }

  if (variant === "adapted" && measurable?.status === "Missing") {
    opportunities.push("opportunities.quantifyResults")
  }

  return [...new Set(opportunities)].slice(0, 4)
}

export function buildAdaptationInsights(
  vacancyTitle: string | null,
  changeHighlights: ProfileChangeHighlight[],
  checklist: AtsComplianceChecklistItem[],
  adaptationSummary: string | null
): AdaptationInsight[] {
  const summary = getChecklistSummary(checklist)
  const headlineChange = changeHighlights.find((item) =>
    item.field.toLowerCase().includes("headline")
  )
  const summaryChange = changeHighlights.find((item) =>
    item.field.toLowerCase().includes("summary")
  )

  const keywordTokens = changeHighlights
    .flatMap((item) => item.after.split(/[,;]/))
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && token.length < 40)
    .slice(0, 5)
    .join(", ")

  const insights: AdaptationInsight[] = []

  if (vacancyTitle) {
    insights.push({ id: "vacancy", titleKey: "insights.targetVacancy", value: vacancyTitle })
  }

  if (headlineChange?.after) {
    insights.push({
      id: "headline",
      titleKey: "insights.topImprovement",
      value: headlineChange.after,
    })
  }

  if (summaryChange?.after) {
    insights.push({
      id: "summary",
      titleKey: "insights.professionalSummary",
      value: summaryChange.after.slice(0, 120) + (summaryChange.after.length > 120 ? "…" : ""),
    })
  }

  if (keywordTokens) {
    insights.push({ id: "keywords", titleKey: "insights.integratedKeywords", value: keywordTokens })
  }

  if (summary.total > 0) {
    insights.push({
      id: "checklist",
      titleKey: "insights.atsChecklist",
      value: `${summary.met}/${summary.total}`,
    })
  }

  if (summary.pendingLabel) {
    insights.push({
      id: "pending",
      titleKey: "insights.pending",
      value: summary.pendingLabel,
    })
  }

  if (insights.length === 0 && adaptationSummary) {
    insights.push({
      id: "summary-fallback",
      titleKey: "insights.professionalSummary",
      value: adaptationSummary.slice(0, 140) + (adaptationSummary.length > 140 ? "…" : ""),
    })
  }

  return insights
}

export function buildAdaptationConclusion(
  adaptationSummary: string | null,
  checklist: AtsComplianceChecklistItem[]
): string {
  if (adaptationSummary?.trim()) {
    const pending = checklist.find(
      (item) => item.gapType === "RealGap" && item.status === "Missing"
    )
    if (pending?.suggestedAction?.trim()) {
      return `${adaptationSummary.trim()} ${pending.suggestedAction.trim()}`
    }
    if (pending?.note?.trim()) {
      return `${adaptationSummary.trim()} ${pending.note.trim()}`
    }
    return adaptationSummary.trim()
  }

  const summary = getChecklistSummary(checklist)
  if (summary.pendingLabel) {
    return `La versión adaptada mejora el encaje con la vacante. El gap principal pendiente es: ${summary.pendingLabel}.`
  }

  return "La versión adaptada mejora el encaje con la vacante según los criterios ATS evaluados."
}

export function formatChangeFieldName(field: string): string {
  const normalized = field.trim()
  if (!normalized) return "Campo"
  if (/^headline$/i.test(normalized)) return "Headline"
  if (/^summary$/i.test(normalized)) return "Summary"
  if (/jobpreferences/i.test(normalized)) return "JobPreferences"
  const workMatch = normalized.match(/workexperience\[(\d+)\]/i)
  if (workMatch) return `WorkExperience[${workMatch[1]}]`
  return normalized
}

export function isEmptyChangeValue(value: string, field: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  const lower = trimmed.toLowerCase()
  if (lower === "no presente" || lower === "not present") return true
  if (/jobpreferences/i.test(field) && (lower === "null" || lower === "undefined")) return true
  return false
}

export function formatChangeDisplayValue(
  value: string,
  field: string,
  emptySummaryLabel: string,
  notDefinedLabel: string
): string {
  if (isEmptyChangeValue(value, field)) {
    if (/summary/i.test(field)) return emptySummaryLabel
    if (/jobpreferences/i.test(field)) return notDefinedLabel
    return "—"
  }
  return value.trim()
}

export function getCompactExperienceItems(profile: CandidateProfile, limit = 3) {
  return normalizeObjectArray(profile.workExperience ?? [])
    .slice(0, limit)
    .map((job) => ({
      role: str(job.Role ?? job.role),
      company: str(job.Company ?? job.company),
      period: formatDateRange(job.StartDate ?? job.startDate, job.EndDate ?? job.endDate),
      description: str(job.Description ?? job.description),
    }))
}
