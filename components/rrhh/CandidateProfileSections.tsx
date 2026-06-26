"use client"

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react"
import { useTranslations } from "next-intl"
import { ExternalLink, Link2, Phone } from "lucide-react"

const SPANISH_FALLBACKS: Record<string, string> = {
  "fields.sectors": "Sectores",
  "fields.desiredRole": "Rol deseado",
  "fields.minSalary": "Salario mínimo",
  "fields.educationLevel": "Nivel educativo",
  "fields.desiredCity": "Ciudad deseada",
  "fields.availability": "Disponibilidad",
  "fields.disability": "Discapacidad",
  "emptyStates.noWorkExperience": "Sin experiencia laboral registrada.",
  "emptyStates.noEducation": "Sin educación registrada.",
  "emptyStates.noReferences": "Sin referencias registradas.",
  "emptyStates.noRecognitions": "Sin reconocimientos registrados.",
  "fallbacks.dash": "—",
  "fallbacks.linkPlatform": "Enlace",
  "values.yes": "Sí",
  "values.no": "No",
}

type SectionLabelFn = (key: string) => string

const DEFAULT_PROFILE_NAMESPACE = "CandidatePortal.profile"

const SectionLabelsContext = createContext<SectionLabelFn | null>(null)
const ProfileNamespaceContext = createContext<string | null>(null)

export function CandidateProfileSectionsProvider({
  namespace,
  children,
}: {
  namespace: string
  children: ReactNode
}) {
  const t = useTranslations(namespace)
  const label = useCallback((key: string) => t(key), [t])
  return (
    <ProfileNamespaceContext.Provider value={namespace}>
      <SectionLabelsContext.Provider value={label}>{children}</SectionLabelsContext.Provider>
    </ProfileNamespaceContext.Provider>
  )
}

/**
 * Resuelve traducciones del formulario de edición compartido según el namespace
 * del `CandidateProfileSectionsProvider` activo. Sin provider usa
 * `CandidatePortal.profile` (Portal Candidato).
 */
export function useProfileEditTranslations() {
  const namespace = useContext(ProfileNamespaceContext) ?? DEFAULT_PROFILE_NAMESPACE
  return useTranslations(namespace)
}

function useSectionLabels(): SectionLabelFn {
  const ctx = useContext(SectionLabelsContext)
  return useCallback(
    (key: string) => {
      if (ctx) return ctx(key)
      return SPANISH_FALLBACKS[key] ?? key
    },
    [ctx],
  )
}

const emptyToDash = (value: unknown, dash = "—") =>
  value != null && String(value).trim() !== "" ? String(value).trim() : dash

/** API puede devolver un objeto o un string JSON (p. ej. JobPreferences). */
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

/**
 * API puede devolver un array de objetos o un array de strings JSON (cada ítem es un objeto serializado).
 */
const normalizeObjectArray = (raw: unknown) => {
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

export const SectionCard = ({
  title,
  icon: Icon,
  children,
  sectionId,
}: {
  title: string
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  children: ReactNode
  sectionId: string
}) => (
  <section
    className="rounded-xl border border-border bg-card p-5 md:p-6"
    aria-labelledby={sectionId}
  >
    <h2
      id={sectionId}
      className="mb-4 flex items-center gap-2 font-sans text-sm font-semibold text-foreground"
    >
      {Icon && <Icon className="h-4 w-4 shrink-0 text-vo-purple" aria-hidden />}
      {title}
    </h2>
    {children}
  </section>
)

export const InfoGrid = ({
  items,
}: {
  items: Array<{ label: string; value: unknown }>
}) => {
  const label = useSectionLabels()
  const dash = label("fallbacks.dash")
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {items.map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-1">
          <dt className="font-sans text-xs font-medium text-muted-foreground">
            {label}
          </dt>
          <dd className="font-sans text-sm text-foreground">{emptyToDash(value, dash)}</dd>
        </div>
      ))}
    </dl>
  )
}

interface JobPreferencesBlockProps {
  prefs: unknown
  fallbackMinSalary?: number | null
  fallbackAvailability?: string | null
  fallbackHasDisability?: boolean | null
}

export const JobPreferencesBlock = ({
  prefs,
  fallbackMinSalary,
  fallbackAvailability,
  fallbackHasDisability,
}: JobPreferencesBlockProps) => {
  const label = useSectionLabels()
  const dash = label("fallbacks.dash")
  const yesLabel = label("values.yes")
  const noLabel = label("values.no")
  const parsed = parseJsonObjectIfString(prefs) as Record<string, unknown> | null
  const sectors = Array.isArray(parsed?.Sectors) ? parsed.Sectors : []
  const sectorsText = sectors.length > 0 ? sectors.join(", ") : null

  const minSalary =
    parsed?.MinSalary ?? parsed?.minSalary ?? fallbackMinSalary ?? null
  const disabilityRaw = parsed?.Disability ?? parsed?.disability
  const disabilityDisplay =
    disabilityRaw === true
      ? yesLabel
      : disabilityRaw === false
        ? noLabel
        : fallbackHasDisability === true
          ? yesLabel
          : fallbackHasDisability === false
            ? noLabel
            : null

  const items = [
    { label: label("fields.desiredRole"), value: parsed?.DesiredRole ?? parsed?.desiredRole },
    { label: label("fields.minSalary"), value: minSalary },
    {
      label: label("fields.educationLevel"),
      value: parsed?.EducationLevel ?? parsed?.educationLevel,
    },
    { label: label("fields.desiredCity"), value: parsed?.DesiredCity ?? parsed?.desiredCity },
    {
      label: label("fields.availability"),
      value: parsed?.Availability ?? parsed?.availability ?? fallbackAvailability,
    },
    { label: label("fields.disability"), value: disabilityDisplay },
  ]

  const hasAnyObjective =
    Boolean(sectorsText) ||
    items.some((row) => row.value != null && String(row.value).trim() !== "")

  if (!hasAnyObjective) {
    return <p className="font-sans text-sm text-muted-foreground">{dash}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1 font-sans text-xs font-medium text-muted-foreground">
          {label("fields.sectors")}
        </p>
        <p className="font-sans text-sm text-foreground">
          {sectorsText ?? dash}
        </p>
      </div>
      <InfoGrid items={items} />
    </div>
  )
}

export const WorkExperienceList = ({ items }: { items?: unknown }) => {
  const label = useSectionLabels()
  const dash = label("fallbacks.dash")
  const list = normalizeObjectArray(items ?? [])
  if (list.length === 0) {
    return (
      <p className="font-sans text-sm text-muted-foreground">
        {label("emptyStates.noWorkExperience")}
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-5" role="list">
      {list.map((job, index) => {
        const company = String(job.Company ?? job.company ?? "")
        const role = String(job.Role ?? job.role ?? "")
        const start = String(job.StartDate ?? job.startDate ?? "")
        const end = String(job.EndDate ?? job.endDate ?? "")
        const desc = String(job.Description ?? job.description ?? "")
        const period = [start, end].filter(Boolean).join(" — ")
        return (
          <li
            key={`${company}-${role}-${index}`}
            className="border-l-2 border-vo-purple/40 pl-4"
          >
            <div className="flex flex-col gap-1">
              <p className="font-sans text-sm font-semibold text-foreground">
                {emptyToDash(role, dash)}
              </p>
              <p className="font-sans text-sm text-vo-purple">{emptyToDash(company, dash)}</p>
              <p className="font-sans text-xs text-muted-foreground">{emptyToDash(period, dash)}</p>
            </div>
            {desc ? (
              <p className="mt-2 font-sans text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {desc}
              </p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

export const EducationList = ({ items }: { items?: unknown }) => {
  const label = useSectionLabels()
  const dash = label("fallbacks.dash")
  const list = normalizeObjectArray(items ?? [])
  if (list.length === 0) {
    return (
      <p className="font-sans text-sm text-muted-foreground">
        {label("emptyStates.noEducation")}
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-4" role="list">
      {list.map((edu, index) => {
        const institution = String(edu.Institution ?? edu.institution ?? "")
        const degree = String(edu.Degree ?? edu.degree ?? "")
        const start = String(edu.StartDate ?? edu.startDate ?? "")
        const end = String(edu.EndDate ?? edu.endDate ?? "")
        const period = [start, end].filter(Boolean).join(" — ")
        return (
          <li
            key={`${institution}-${degree}-${index}`}
            className="rounded-lg border border-border bg-muted/30 p-4"
          >
            <p className="font-sans text-sm font-semibold text-foreground">
              {emptyToDash(degree, dash)}
            </p>
            <p className="mt-0.5 font-sans text-sm text-muted-foreground">
              {emptyToDash(institution, dash)}
            </p>
            {period ? (
              <p className="mt-2 font-sans text-xs text-muted-foreground">{period}</p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

export const LanguagesList = ({ items }: { items?: unknown }) => {
  const label = useSectionLabels()
  const dash = label("fallbacks.dash")
  const list = normalizeObjectArray(items ?? [])
  if (list.length === 0) {
    return (
      <p className="font-sans text-sm text-muted-foreground">{dash}</p>
    )
  }
  return (
    <ul className="flex flex-wrap gap-2" role="list">
      {list.map((lang, index) => {
        const name = String(lang.Language ?? lang.language ?? "")
        const level = String(lang.Level ?? lang.level ?? "")
        const label = [name, level].filter(Boolean).join(" — ")
        return (
          <li
            key={`${name}-${index}`}
            className="rounded-full bg-vo-purple/10 px-3 py-1.5 font-sans text-xs font-medium text-vo-purple"
          >
            {label || dash}
          </li>
        )
      })}
    </ul>
  )
}

export const SkillsCloud = ({ skills }: { skills?: unknown }) => {
  const label = useSectionLabels()
  const dash = label("fallbacks.dash")
  if (!Array.isArray(skills) || skills.length === 0) {
    return <p className="font-sans text-sm text-muted-foreground">{dash}</p>
  }
  const flat = skills
    .map((s) => (typeof s === "string" ? s.trim() : String(s ?? "")))
    .filter(Boolean)
  return (
    <ul className="flex flex-wrap gap-2" role="list">
      {flat.map((skill, index) => (
        <li
          key={`${skill.slice(0, 40)}-${index}`}
          className="max-w-full rounded-lg bg-muted px-2.5 py-1.5 font-sans text-xs text-foreground whitespace-pre-wrap"
        >
          {skill}
        </li>
      ))}
    </ul>
  )
}

const normalizeUrl = (url: unknown) => {
  if (!url || typeof url !== "string") return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export const SocialLinksList = ({ links }: { links?: unknown }) => {
  const label = useSectionLabels()
  const dash = label("fallbacks.dash")
  const linkPlatformFallback = label("fallbacks.linkPlatform")
  if (!Array.isArray(links) || links.length === 0) {
    return <p className="font-sans text-sm text-muted-foreground">{dash}</p>
  }
  return (
    <ul className="flex flex-col gap-2" role="list">
      {links.map((link, index) => {
        const item = link as Record<string, unknown>
        const platform = String(item.Platform ?? item.platform ?? linkPlatformFallback)
        const rawUrl = item.Url ?? item.url ?? ""
        const href = normalizeUrl(rawUrl)
        return (
          <li key={`${platform}-${index}`}>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-sans text-sm text-vo-purple underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-2 rounded"
              >
                <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{platform}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              </a>
            ) : (
              <span className="font-sans text-sm text-foreground">
                {platform}: {emptyToDash(rawUrl, dash)}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export const ReferencesList = ({ items }: { items?: unknown }) => {
  const label = useSectionLabels()
  const dash = label("fallbacks.dash")
  const list = normalizeObjectArray(items ?? [])
  if (list.length === 0) {
    return (
      <p className="font-sans text-sm text-muted-foreground">
        {label("emptyStates.noReferences")}
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-3" role="list">
      {list.map((ref, index) => {
        const name = String(ref.Name ?? ref.name ?? "")
        const position = String(ref.Position ?? ref.position ?? "")
        const company = String(ref.Company ?? ref.company ?? "")
        const contact = String(ref.Contact ?? ref.contact ?? "")
        return (
          <li
            key={`${name}-${index}`}
            className="flex flex-col gap-1 rounded-lg border border-border p-4"
          >
            <p className="font-sans text-sm font-semibold text-foreground">
              {emptyToDash(name, dash)}
            </p>
            <p className="font-sans text-sm text-muted-foreground">
              {emptyToDash(position, dash)}
              {company && company !== dash ? ` · ${company}` : ""}
            </p>
            {contact ? (
              <p className="mt-1 flex items-center gap-1.5 font-sans text-sm text-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                {contact}
              </p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

export const RecognitionsList = ({ items }: { items?: unknown }) => {
  const label = useSectionLabels()
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <p className="font-sans text-sm text-muted-foreground">
        {label("emptyStates.noRecognitions")}
      </p>
    )
  }
  return (
    <ul className="list-inside list-disc space-y-1 font-sans text-sm text-foreground" role="list">
      {items.map((r, i) => (
        <li key={i}>{typeof r === "string" ? r : JSON.stringify(r)}</li>
      ))}
    </ul>
  )
}

export { emptyToDash }
