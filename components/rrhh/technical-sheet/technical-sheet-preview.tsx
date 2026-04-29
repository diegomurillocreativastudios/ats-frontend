"use client"

import { useId, useMemo, useState } from "react"
import {
  BarChart2,
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  MessageCircle,
  User,
} from "lucide-react"
import { technicalSheetMessages as m } from "@/lib/messages/technical-sheet"
import type { TechnicalSheetPayload } from "@/lib/api/technical-sheet"

interface TechnicalSheetPreviewProps {
  payload: TechnicalSheetPayload
}

const pickObject = (
  p: TechnicalSheetPayload,
  keys: (keyof TechnicalSheetPayload)[]
): Record<string, unknown> | null => {
  for (const k of keys) {
    const v = p[k]
    if (v != null && typeof v === "object" && !Array.isArray(v)) {
      return v as Record<string, unknown>
    }
  }
  return null
}

const SPANISH_LABELS: Record<string, string> = {
  candidateProfileId: "ID de perfil",
  firstName: "Nombre",
  lastName: "Apellido",
  email: "Correo",
  phoneNumber: "Teléfono",
  country: "País",
  birthCity: "Ciudad de nacimiento",
  headline: "Título o headline",
  summary: "Resumen",
  cvStoragePath: "Ruta del CV",
  availability: "Disponibilidad",
  minSalary: "Expectativa salarial mínima",
  jobPreferences: "Preferencias laborales",
  vacancyId: "ID de vacante",
  title: "Puesto / título",
  description: "Descripción",
  companyName: "Empresa",
  jobCategoryName: "Categoría",
  departmentDisplayName: "Departamento",
  modalityDisplayName: "Modalidad",
  countryCode: "País (código)",
  requirements: "Requisitos",
  weights: "Ponderaciones (IA)",
  applicationId: "ID de postulación",
  appliedAt: "Fecha de postulación",
  stageName: "Etapa",
  statusName: "Estado de postulación",
  matchScore: "Puntaje de match",
  applicationSource: "Origen",
  matchExecutionId: "ID de análisis",
  createdAt: "Creado el",
  totalScore: "Puntaje total",
  componentScores: "Puntuaciones parciales",
  qualitativeReasoningPositive: "Fortalezas (IA)",
  qualitativeReasoningNegative: "Aspectos a considerar (IA)",
  matchedAttributes: "Atributos coincidentes",
  matchedAttributePaths: "Rutas de atributos",
  interviewId: "ID de entrevista",
  scheduledAtUtc: m.interviewWhen,
  durationMinutes: m.interviewDuration,
  interviewTypeCode: "Tipo (código)",
  interviewTypeDisplayName: "Tipo de entrevista",
  interviewStatusCode: "Estado (código)",
  interviewStatusDisplayName: "Estado",
  interviewerName: "Entrevistador",
  notes: "Notas",
  resumeMarkdown: "Curriculum (texto completo)",
}

const humanizeKey = (key: string): string => {
  if (SPANISH_LABELS[key]) return SPANISH_LABELS[key]
  const k = key.replace(/additionalProp.*/i, "").replace(/^x[-_]/i, "")
  const spaced = k
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
  if (!spaced) return key
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

const describeValuePlain = (v: unknown): string => {
  if (v == null) return "—"
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v)
  if (Array.isArray(v)) return v.map(describeValuePlain).join(", ")
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .filter(([k]) => !k.toLowerCase().startsWith("additional"))
      .map(([k, x]) => `${humanizeKey(k)}: ${describeValuePlain(x)}`)
      .join(" · ")
  }
  return String(v)
}

const formatIsoDisplay = (iso: string | undefined | null): string => {
  if (iso == null || String(iso).trim() === "") return "—"
  const d = new Date(String(iso))
  if (Number.isNaN(d.getTime())) return String(iso)
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d)
}

const tryParseJsonString = (s: string): unknown | null => {
  const t = s.trim()
  if (!t.startsWith("{") && !t.startsWith("[")) return null
  try {
    return JSON.parse(t) as unknown
  } catch {
    return null
  }
}

const asRecord = (v: unknown): Record<string, unknown> | null => {
  if (v != null && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>
  if (typeof v === "string") {
    const p = tryParseJsonString(v)
    if (p != null && typeof p === "object" && !Array.isArray(p)) return p as Record<string, unknown>
  }
  return null
}

const pickFromRecord = (o: Record<string, unknown>, keys: string[]): string | null => {
  for (const k of keys) {
    const v = o[k] ?? o[k.charAt(0).toUpperCase() + k.slice(1)]
    if (v != null && String(v).trim() !== "") return String(v)
  }
  return null
}

const orderEntries = (
  data: Record<string, unknown>,
  preferred: string[]
): [string, unknown][] => {
  const keys = new Set(Object.keys(data))
  const out: [string, unknown][] = []
  for (const k of preferred) {
    if (keys.has(k) && !k.toLowerCase().startsWith("additionalprop")) {
      out.push([k, data[k]])
      keys.delete(k)
    }
  }
  const rest = [...keys]
    .filter((k) => !k.toLowerCase().startsWith("additionalprop"))
    .sort((a, b) => a.localeCompare(b, "es"))
  for (const k of rest) {
    out.push([k, data[k]])
  }
  return out
}

const looksLikeUnitScore = (v: number, fieldKey: string): boolean => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) return false
  const k = fieldKey.toLowerCase()
  return /score|match|weight|rate|similar|semantic|prob|confidence|ratio|percent|pct|vector|aggregate/.test(
    k
  )
}

const formatScalar = (
  v: unknown,
  fieldKey: string
): { kind: "text" | "percent" | "bool"; text: string } => {
  if (v == null) return { kind: "text", text: "—" }
  if (typeof v === "boolean") return { kind: "bool", text: v ? "Sí" : "No" }
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    return { kind: "text", text: formatIsoDisplay(v) }
  }
  if (typeof v === "number" && looksLikeUnitScore(v, fieldKey)) {
    return { kind: "percent", text: `${(v * 100).toFixed(1)}%` }
  }
  if (typeof v === "string" || typeof v === "number")
    return { kind: "text", text: String(v) }
  if (v instanceof Date) return { kind: "text", text: v.toISOString() }
  if (typeof v === "object" && v !== null) {
    return { kind: "text", text: describeValuePlain(v) }
  }
  return { kind: "text", text: "—" }
}

const formatScore01 = (v: number) => `${(v * 100).toFixed(1)}%`

const TEXT_COLLAPSE_AT = 320

const ExpandableBlock = ({
  content,
  isMultilineHeavy,
}: {
  content: string
  isMultilineHeavy: boolean
}) => {
  const [open, setOpen] = useState(false)
  const needsToggle =
    content.length > TEXT_COLLAPSE_AT || (isMultilineHeavy && content.split("\n").length > 5)

  if (!needsToggle) {
    return (
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
        {content}
      </p>
    )
  }
  return (
    <div>
      <p
        className={
          open
            ? "whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground"
            : "line-clamp-5 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground"
        }
      >
        {content}
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 inline-flex items-center gap-0.5 font-sans text-xs font-medium text-vo-purple hover:underline focus:outline-none focus:ring-2 focus:ring-vo-purple focus:ring-offset-1 rounded"
      >
        {open ? (
          <>
            Ver menos
            <ChevronUp className="h-3.5 w-3.5" aria-hidden />
          </>
        ) : (
          <>
            Ver más
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </>
        )}
      </button>
    </div>
  )
}

const ValuePill = ({ formatted }: { formatted: ReturnType<typeof formatScalar> }) => {
  if (formatted.kind === "bool") {
    return (
      <span
        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
          formatted.text === "Sí"
            ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {formatted.text}
      </span>
    )
  }
  if (formatted.kind === "percent") {
    return (
      <span className="inline-flex min-w-14 items-baseline gap-0.5 rounded-md bg-vo-purple/10 px-2.5 py-1 font-sans text-sm font-semibold tabular-nums text-vo-purple">
        {formatted.text}
      </span>
    )
  }
  return <ExpandableBlock content={formatted.text} isMultilineHeavy={false} />
}

const DataFieldRow = ({
  fieldKey,
  value,
  rowId,
  labelOverride,
}: {
  fieldKey: string
  value: unknown
  rowId: string
  labelOverride?: string
}) => {
  const label = labelOverride ?? humanizeKey(fieldKey)
  if (fieldKey === "appliedAt" && typeof value === "string") {
    return (
      <div
        className="grid grid-cols-1 gap-2 border-b border-border/50 py-2.5 last:border-0 sm:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] sm:items-start sm:gap-4"
        id={rowId}
      >
        <dt className="font-sans text-xs font-medium text-muted-foreground sm:pt-0.5">{label}</dt>
        <dd className="min-w-0 text-sm text-foreground">{formatIsoDisplay(value)}</dd>
      </div>
    )
  }
  const isPlainLongString =
    typeof value === "string" &&
    (value.length > TEXT_COLLAPSE_AT || value.split("\n").length > 5)
  if (isPlainLongString) {
    return (
      <div
        className="rounded-lg border border-border/70 bg-card/50 px-3.5 py-3 shadow-sm"
        id={rowId}
      >
        <div className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-1.5">
          <ExpandableBlock content={value} isMultilineHeavy={value.includes("\n")} />
        </div>
      </div>
    )
  }
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    const o = value as Record<string, unknown>
    const keys = Object.keys(o).filter((k) => !k.toLowerCase().startsWith("additional"))
    if (keys.length === 0) {
      return (
        <div
          className="grid grid-cols-1 gap-2 border-b border-border/50 py-2.5 last:border-0 sm:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]"
          id={rowId}
        >
          <dt className="font-sans text-xs font-medium text-muted-foreground">{label}</dt>
          <dd className="text-sm text-muted-foreground">—</dd>
        </div>
      )
    }
    return (
      <div className="rounded-lg border border-border/70 bg-card/50 px-3.5 py-3 shadow-sm" id={rowId}>
        <div className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto" role="list">
          {keys.map((k) => (
            <li
              key={k}
              className="flex flex-col gap-0.5 rounded-md border border-border/40 bg-background/60 px-2.5 py-1.5 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-2"
            >
              <span className="shrink-0 text-xs font-medium text-muted-foreground">
                {humanizeKey(k)}
              </span>
              <span className="min-w-0 break-words text-foreground/95">
                {o[k] == null
                  ? "—"
                  : typeof o[k] === "object"
                    ? describeValuePlain(o[k])
                    : String(o[k] as string | number | boolean)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  if (Array.isArray(value) && !fieldKey.toLowerCase().includes("skill")) {
    if (value.length === 0) {
      return (
        <div
          className="grid grid-cols-1 gap-2 border-b border-border/50 py-2.5 sm:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]"
          id={rowId}
        >
          <dt className="font-sans text-xs font-medium text-muted-foreground">{label}</dt>
          <dd className="text-sm text-muted-foreground">—</dd>
        </div>
      )
    }
    return (
      <div className="rounded-lg border border-border/70 bg-card/50 px-3.5 py-3 shadow-sm" id={rowId}>
        <div className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <ol
          className="mt-2 list-decimal space-y-1.5 pl-4 text-sm text-foreground/95"
          role="list"
        >
          {value.map((v, i) => (
            <li key={i} className="pl-0.5">
              {describeValuePlain(v)}
            </li>
          ))}
        </ol>
      </div>
    )
  }
  const formatted = formatScalar(value, fieldKey)
  return (
    <div
      className="grid grid-cols-1 gap-2 border-b border-border/50 py-2.5 last:border-0 sm:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] sm:items-start sm:gap-4"
      id={rowId}
    >
      <dt className="font-sans text-xs font-medium text-muted-foreground sm:pt-0.5">{label}</dt>
      <dd className="min-w-0 text-sm text-foreground">
        <ValuePill formatted={formatted} />
      </dd>
    </div>
  )
}

const SkillsCloud = ({ skills }: { skills: string[] }) => (
  <div className="flex flex-wrap gap-1.5" role="list" aria-label={m.skills}>
    {skills.map((s) => (
      <span
        key={s}
        role="listitem"
        className="inline-flex rounded-full border border-border/80 bg-background px-2.5 py-0.5 text-xs font-medium text-foreground"
      >
        {s}
      </span>
    ))}
  </div>
)

const JsonArrayCards = ({ items, variant }: { items: unknown[]; variant: "work" | "edu" | "lang" }) => (
  <ul className="flex flex-col gap-3" role="list">
    {items.map((raw, i) => {
      const rec = asRecord(raw)
      if (!rec) {
        return (
          <li
            key={i}
            className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-sm text-foreground/80"
          >
            <span className="text-xs text-muted-foreground">Dato no estructurado. </span>
            {typeof raw === "string" ? (
              <ExpandableBlock
                content={raw}
                isMultilineHeavy={raw.length > 120 || raw.includes("\n")}
              />
            ) : (
              String(raw)
            )}
          </li>
        )
      }
      if (variant === "work") {
        const company = pickFromRecord(rec, ["Company", "company", "employer"])
        const role = pickFromRecord(rec, ["Role", "role", "position", "title"])
        const from = pickFromRecord(rec, ["StartDate", "startDate", "from"])
        const to = pickFromRecord(rec, ["EndDate", "endDate", "to"])
        const desc = pickFromRecord(rec, ["Description", "description", "summary"])
        return (
          <li
            key={i}
            className="rounded-xl border border-border/70 bg-card/80 px-4 py-3 shadow-sm"
          >
            {company ? (
              <p className="font-sans text-sm font-semibold text-foreground">{company}</p>
            ) : null}
            {role ? (
              <p className="mt-0.5 font-sans text-sm text-vo-purple/90 dark:text-vo-purple/80">
                {role}
              </p>
            ) : null}
            {(from || to) && (
              <p className="mt-1.5 flex items-center gap-1.5 font-sans text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {[from, to].filter(Boolean).join(" – ")}
              </p>
            )}
            {desc ? (
              <div className="mt-2 border-t border-border/40 pt-2">
                <p className="text-[0.7rem] font-medium uppercase text-muted-foreground">
                  {m.description}
                </p>
                <div className="mt-1">
                  <ExpandableBlock content={desc} isMultilineHeavy={desc.length > 180} />
                </div>
              </div>
            ) : null}
          </li>
        )
      }
      if (variant === "edu") {
        const inst = pickFromRecord(rec, ["Institution", "institution", "school"])
        const deg = pickFromRecord(rec, ["Degree", "degree", "title"])
        const from = pickFromRecord(rec, ["StartDate", "startDate"])
        const to = pickFromRecord(rec, ["EndDate", "endDate"])
        return (
          <li
            key={i}
            className="rounded-xl border border-border/70 bg-card/80 px-4 py-3 shadow-sm"
          >
            {inst ? <p className="font-sans text-sm font-semibold text-foreground">{inst}</p> : null}
            {deg ? <p className="mt-0.5 text-sm text-foreground/90">{deg}</p> : null}
            {(from || to) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {[from, to].filter(Boolean).join(" – ")}
              </p>
            )}
          </li>
        )
      }
      const lang = pickFromRecord(rec, ["Language", "language", "name"])
      const level = pickFromRecord(rec, ["Level", "level", "proficiency"])
      return (
        <li
          key={i}
          className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-card/80 px-3 py-2"
        >
          <span className="text-sm font-medium text-foreground">{lang ?? "—"}</span>
          {level ? <span className="text-xs text-muted-foreground">{level}</span> : null}
        </li>
      )
    })}
  </ul>
)

const sectionStyles: Record<string, { icon: typeof User; bar: string; iconWrap: string }> = {
  personal: { icon: User, bar: "from-vo-purple/80 to-fuchsia-500/40", iconWrap: "bg-vo-purple/15 text-vo-purple" },
  vacancy: { icon: Briefcase, bar: "from-sky-500/70 to-cyan-400/30", iconWrap: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  application: {
    icon: ClipboardList,
    bar: "from-amber-500/50 to-orange-300/20",
    iconWrap: "bg-amber-500/10 text-amber-800 dark:text-amber-200",
  },
  match: {
    icon: BarChart2,
    bar: "from-emerald-500/50 to-teal-400/25",
    iconWrap: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  },
  interviews: {
    icon: MessageCircle,
    bar: "from-indigo-500/50 to-violet-400/30",
    iconWrap: "bg-indigo-500/10 text-indigo-800 dark:text-indigo-200",
  },
}

const CANDIDATE_CORE_ORDER = [
  "firstName",
  "lastName",
  "email",
  "phoneNumber",
  "country",
  "birthCity",
  "headline",
  "candidateProfileId",
  "cvStoragePath",
  "availability",
  "minSalary",
  "jobPreferences",
]

const CANDIDATE_BLOB_KEYS = new Set([
  "workExperience",
  "education",
  "languages",
  "skills",
  "summary",
  "resumeMarkdown",
])

const VACANCY_ORDER = [
  "title",
  "companyName",
  "jobCategoryName",
  "departmentDisplayName",
  "modalityDisplayName",
  "countryCode",
  "vacancyId",
  "description",
  "requirements",
  "weights",
]

const APPLICATION_ORDER = [
  "applicationId",
  "appliedAt",
  "stageName",
  "statusName",
  "matchScore",
  "applicationSource",
]

function CandidateSectionBlock({
  id,
  data,
}: {
  id: string
  data: Record<string, unknown>
}) {
  const summary = data.summary
  const resume = data.resumeMarkdown
  const work = Array.isArray(data.workExperience) ? data.workExperience : []
  const education = Array.isArray(data.education) ? data.education : []
  const langs = Array.isArray(data.languages) ? data.languages : []
  const skills = Array.isArray(data.skills)
    ? data.skills.map((s) => String(s)).filter((s) => s.trim() !== "")
    : []

  const baseData = { ...data }
  for (const k of CANDIDATE_BLOB_KEYS) {
    delete baseData[k as keyof typeof baseData]
  }
  const restEntries = orderEntries(baseData, CANDIDATE_CORE_ORDER).filter(
    ([, v]) => v != null && v !== ""
  )

  const meta = sectionStyles.personal
  const Icon = meta.icon

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card to-card/40 shadow-sm ring-1 ring-border/30"
      aria-labelledby={`${id}-title`}
    >
      <div className={`h-1 w-full bg-gradient-to-r ${meta.bar}`} aria-hidden />
      <div className="flex items-start gap-3 border-b border-border/50 bg-muted/20 px-4 py-3.5">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.iconWrap}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <h3 id={`${id}-title`} className="pt-0.5 font-sans text-base font-semibold tracking-tight text-foreground">
          {m.sectionPersonal}
        </h3>
      </div>
      <div className="px-4 py-1 pb-3">
        <dl>
          {restEntries.map(([key, val], idx) => (
            <DataFieldRow
              key={`${key}-${idx}`}
              fieldKey={key}
              value={val}
              rowId={`${id}-r-${key}`}
            />
          ))}
        </dl>

        {typeof summary === "string" && summary.trim() !== "" && (
          <div className="mt-4 rounded-xl border border-vo-purple/20 bg-vo-purple/[0.04] p-3.5">
            <p className="text-[0.7rem] font-medium uppercase tracking-wide text-vo-purple/90">
              {m.summary}
            </p>
            <div className="mt-2">
              <ExpandableBlock
                content={summary}
                isMultilineHeavy={summary.includes("\n") || summary.length > 200}
              />
            </div>
          </div>
        )}

        {work.length > 0 && (
          <div className="mt-5">
            <h4 className="mb-2.5 font-sans text-sm font-semibold text-foreground">{m.workExperience}</h4>
            <JsonArrayCards items={work} variant="work" />
          </div>
        )}

        {education.length > 0 && (
          <div className="mt-5">
            <h4 className="mb-2.5 font-sans text-sm font-semibold text-foreground">{m.education}</h4>
            <JsonArrayCards items={education} variant="edu" />
          </div>
        )}

        {langs.length > 0 && (
          <div className="mt-5">
            <h4 className="mb-2.5 font-sans text-sm font-semibold text-foreground">{m.languages}</h4>
            <JsonArrayCards items={langs} variant="lang" />
          </div>
        )}

        {skills.length > 0 && (
          <div className="mt-5">
            <h4 className="mb-2.5 font-sans text-sm font-semibold text-foreground">{m.skills}</h4>
            <SkillsCloud skills={skills} />
          </div>
        )}

        {typeof resume === "string" && resume.trim() !== "" && (
          <div className="mt-5 rounded-xl border border-border/80 bg-muted/15 p-3.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {m.resumeMarkdown}
            </p>
            <div className="mt-2 max-h-72 overflow-hidden rounded-md border border-border/60">
              <ExpandableBlock
                content={resume}
                isMultilineHeavy
              />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function VacancySectionBlock({ id, data }: { id: string; data: Record<string, unknown> }) {
  const desc = data.description
  const reqs = data.requirements
  const weights = data.weights
  const rest = { ...data }
  delete rest.description
  delete rest.requirements
  delete rest.weights
  const entries = orderEntries(rest, VACANCY_ORDER)
  const meta = sectionStyles.vacancy
  const Icon = meta.icon

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card to-card/40 shadow-sm ring-1 ring-border/30"
      aria-labelledby={`${id}-title`}
    >
      <div className={`h-1 w-full bg-gradient-to-r ${meta.bar}`} aria-hidden />
      <div className="flex items-start gap-3 border-b border-border/50 bg-muted/20 px-4 py-3.5">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.iconWrap}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <h3 id={`${id}-title`} className="pt-0.5 font-sans text-base font-semibold tracking-tight text-foreground">
          {m.sectionVacancy}
        </h3>
      </div>
      <div className="px-4 py-1 pb-3">
        <dl>
          {entries.map(([key, val], idx) => (
            <DataFieldRow key={`${key}-${idx}`} fieldKey={key} value={val} rowId={`${id}-${key}`} />
          ))}
        </dl>
        {typeof desc === "string" && desc.trim() !== "" && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {humanizeKey("description")}
            </p>
            <div className="mt-1.5">
              <ExpandableBlock
                content={desc}
                isMultilineHeavy={desc.includes("\n") || desc.length > 200}
              />
            </div>
          </div>
        )}
        {reqs != null && typeof reqs === "object" && !Array.isArray(reqs) && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {humanizeKey("requirements")}
            </p>
            {Object.keys(reqs as object).length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">{m.noStructuredRequirements}</p>
            ) : (
              <ul className="mt-2 space-y-1.5" role="list">
                {Object.entries(reqs as Record<string, unknown>)
                  .filter(([k]) => !k.startsWith("additional"))
                  .map(([k, v]) => (
                    <li
                      key={k}
                      className="flex flex-col gap-0.5 rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm sm:flex-row sm:justify-between"
                    >
                      <span className="font-medium text-foreground/90">{humanizeKey(k)}</span>
                      <span className="text-muted-foreground">{String(v)}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
        {weights != null && typeof weights === "object" && !Array.isArray(weights) && (
          <div className="mt-4 rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {humanizeKey("weights")}
            </p>
            {(() => {
              const w = weights as { semantic?: number; attributes?: Record<string, number> }
              return (
                <ul className="mt-2 space-y-1 text-sm">
                  {typeof w.semantic === "number" ? (
                    <li className="flex justify-between gap-2">
                      <span>Semántica (IA)</span>
                      <span className="font-mono text-vo-purple tabular-nums">
                        {formatScore01(w.semantic)}
                      </span>
                    </li>
                  ) : null}
                  {w.attributes && typeof w.attributes === "object" ? (
                    <li>
                      <span className="text-xs text-muted-foreground">Atributos ponderados</span>
                      <ul className="mt-1 space-y-0.5 pl-2">
                        {Object.entries(w.attributes)
                          .filter(([k]) => !k.startsWith("additional"))
                          .map(([k, v]) => (
                            <li
                              key={k}
                              className="flex justify-between gap-2 text-xs"
                            >
                              <span>{humanizeKey(k)}</span>
                              <span className="tabular-nums text-muted-foreground">
                                {typeof v === "number" ? v.toFixed(2) : String(v)}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </li>
                  ) : null}
                </ul>
              )
            })()}
          </div>
        )}
      </div>
    </section>
  )
}

function ApplicationSectionBlock({ id, data }: { id: string; data: Record<string, unknown> }) {
  const entries = orderEntries(data, APPLICATION_ORDER)
  const meta = sectionStyles.application
  const Icon = meta.icon
  return (
    <section
      className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card to-card/40 shadow-sm ring-1 ring-border/30"
      aria-labelledby={`${id}-title`}
    >
      <div className={`h-1 w-full bg-gradient-to-r ${meta.bar}`} aria-hidden />
      <div className="flex items-start gap-3 border-b border-border/50 bg-muted/20 px-4 py-3.5">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.iconWrap}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <h3 id={`${id}-title`} className="pt-0.5 font-sans text-base font-semibold tracking-tight text-foreground">
          {m.sectionApplication}
        </h3>
      </div>
      <dl className="px-4 py-1 pb-3">
        {entries.map(([key, val], idx) => (
          <DataFieldRow
            key={`${key}-${idx}`}
            fieldKey={key}
            value={val}
            rowId={`${id}-${key}`}
          />
        ))}
      </dl>
    </section>
  )
}

function MatchSectionBlock({ id, data }: { id: string; data: Record<string, unknown> }) {
  const componentScores = data.componentScores
  const pos = data.qualitativeReasoningPositive
  const neg = data.qualitativeReasoningNegative
  const matIn = data.matchedAttributes
  const paths = data.matchedAttributePaths
  const rest: Record<string, unknown> = { ...data }
  const strip = new Set([
    "componentScores",
    "qualitativeReasoningPositive",
    "qualitativeReasoningNegative",
    "matchedAttributes",
    "matchedAttributePaths",
  ])
  for (const k of strip) {
    delete rest[k]
  }
  const entries = orderEntries(rest, [
    "matchExecutionId",
    "createdAt",
    "totalScore",
  ])
  const meta = sectionStyles.match
  const Icon = meta.icon
  const scoresRec =
    componentScores != null &&
    typeof componentScores === "object" &&
    !Array.isArray(componentScores)
      ? (componentScores as Record<string, unknown>)
      : null

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card to-card/40 shadow-sm ring-1 ring-border/30"
      aria-labelledby={`${id}-title`}
    >
      <div className={`h-1 w-full bg-gradient-to-r ${meta.bar}`} aria-hidden />
      <div className="flex items-start gap-3 border-b border-border/50 bg-muted/20 px-4 py-3.5">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.iconWrap}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <h3 id={`${id}-title`} className="pt-0.5 font-sans text-base font-semibold tracking-tight text-foreground">
          {m.sectionMatch}
        </h3>
      </div>
      <div className="space-y-4 px-4 py-3 pb-4">
        {typeof data.totalScore === "number" && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 to-transparent px-4 py-3">
            <span className="text-sm font-medium text-foreground">{m.matchTotalScore}</span>
            <span className="text-xl font-bold tabular-nums text-vo-purple">
              {formatScore01(data.totalScore)}
            </span>
          </div>
        )}

        <dl>
          {entries
            .filter(([k]) => k !== "totalScore")
            .map(([key, val], idx) => (
              <DataFieldRow
                key={`${key}-${idx}`}
                fieldKey={key}
                value={val}
                rowId={`${id}-${key}`}
              />
            ))}
        </dl>

        {scoresRec && Object.keys(scoresRec).length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-foreground">{m.matchComponents}</h4>
            <ul className="space-y-2" role="list">
              {Object.entries(scoresRec)
                .filter(([k]) => !k.toLowerCase().startsWith("additional"))
                .map(([k, v]) => {
                  const num = typeof v === "number" ? v : null
                  const display =
                    num != null && num >= 0 && num <= 1
                      ? formatScore01(num)
                      : String(v)
                  return (
                    <li
                      key={k}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/50 px-3 py-2 text-sm"
                    >
                      <span className="text-muted-foreground">{humanizeKey(k)}</span>
                      <span className="font-mono font-medium tabular-nums text-foreground">
                        {display}
                      </span>
                    </li>
                  )
                })}
            </ul>
          </div>
        )}

        {typeof pos === "string" && pos.trim() !== "" && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
            <p className="text-xs font-semibold uppercase text-emerald-800 dark:text-emerald-200">
              {m.matchStrengths}
            </p>
            <div className="mt-2 text-sm leading-relaxed text-foreground/95">
              <ExpandableBlock content={pos} isMultilineHeavy={pos.length > 200} />
            </div>
          </div>
        )}

        {typeof neg === "string" && neg.trim() !== "" && (
          <div className="rounded-xl border border-amber-500/35 bg-amber-500/5 p-3.5">
            <p className="text-xs font-semibold uppercase text-amber-900 dark:text-amber-200">
              {m.matchConcerns}
            </p>
            <div className="mt-2 text-sm leading-relaxed text-foreground/95">
              <ExpandableBlock content={neg} isMultilineHeavy={neg.length > 200} />
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">
            {humanizeKey("matchedAttributes")}
          </p>
          <p className="mt-1 text-sm text-foreground">
            {matIn == null || (typeof matIn === "string" && matIn.toLowerCase() === "null")
              ? "—"
              : String(matIn)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">
            {humanizeKey("matchedAttributePaths")}
          </p>
          {paths == null || (typeof paths === "object" && Object.keys(paths as object).length === 0) ? (
            <p className="mt-1 text-sm text-muted-foreground">—</p>
          ) : (
            <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto" role="list">
              {Object.entries(paths as Record<string, unknown>)
                .filter(([k]) => !k.toLowerCase().startsWith("additional"))
                .map(([k, v]) => (
                  <li
                    key={k}
                    className="flex flex-col gap-0.5 rounded-md border border-border/50 bg-card/50 px-2.5 py-1.5 text-sm sm:flex-row sm:justify-between"
                  >
                    <span className="text-xs font-medium text-muted-foreground">{humanizeKey(k)}</span>
                    <span className="min-w-0 break-words text-foreground/90">{describeValuePlain(v)}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

const InterviewItemCard = ({ item, index }: { item: unknown; index: number }) => {
  const asObj = item != null && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>) : null

  const line1 = asObj
    ? pickFromRecord(asObj, [
        "interviewTypeDisplayName",
        "interviewTypeCode",
        "title",
        "name",
        "jobTitle",
      ])
    : null
  const title = line1 ?? (typeof item === "string" ? item : `Entrevista ${index + 1}`)
  const when = asObj
    ? pickFromRecord(asObj, [
        "scheduledAtUtc",
        "scheduledAt",
        "date",
        "startTime",
      ])
    : null
  const whenLabel = when ? formatIsoDisplay(when) : null
  const status = asObj
    ? pickFromRecord(asObj, [
        "interviewStatusDisplayName",
        "interviewStatusCode",
        "statusDisplayName",
        "status",
      ])
    : null
  const typeCode = asObj
    ? pickFromRecord(asObj, ["interviewTypeCode", "typeCode", "type"])
    : null
  const interviewer = asObj
    ? pickFromRecord(asObj, ["interviewerName", "interviewer", "recruiter"])
    : null
  const rawDur = asObj?.durationMinutes
  const minutes =
    typeof rawDur === "number" && Number.isFinite(rawDur) ? Math.round(rawDur) : null
  const noteStr =
    asObj && typeof asObj.notes === "string" && asObj.notes.trim() !== "" ? asObj.notes : null
  const description =
    asObj && typeof asObj.description === "string" && asObj.description.trim() !== ""
      ? asObj.description.trim()
      : null
  const outcome =
    asObj && asObj.outcome != null && String(asObj.outcome).trim() !== ""
      ? String(asObj.outcome)
      : null
  const refId = asObj ? pickFromRecord(asObj, ["interviewId", "id"]) : null

  if (!asObj && typeof item === "string") {
    return (
      <li className="rounded-xl border border-border/80 bg-card p-4 text-sm text-foreground shadow-sm">
        {item}
      </li>
    )
  }

  return (
    <li className="rounded-xl border border-border/80 bg-gradient-to-b from-card to-muted/5 p-4 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        <p className="min-w-0 font-sans text-sm font-semibold text-foreground">{title}</p>
        {status ? (
          <span className="w-fit rounded-md bg-muted px-2 py-0.5 font-sans text-[0.65rem] font-medium uppercase text-muted-foreground">
            {status}
          </span>
        ) : null}
      </div>
      <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground" role="list">
        {refId ? (
          <li>
            <span className="text-[0.7rem] uppercase text-muted-foreground/90">Referencia: </span>
            <span className="font-mono text-[11px] text-foreground/80">{refId}</span>
          </li>
        ) : null}
        {typeCode && typeCode !== title ? (
          <li>
            Código de tipo: <span className="text-foreground/80">{typeCode}</span>
          </li>
        ) : null}
        {whenLabel ? (
          <li className="flex items-start gap-1.5">
            <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{whenLabel}</span>
          </li>
        ) : null}
        {minutes != null ? (
          <li className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {minutes} min
          </li>
        ) : null}
        {interviewer ? (
          <li className="flex items-start gap-1.5">
            <span className="text-[0.7rem] text-muted-foreground">Entrevistador:</span>
            <span className="min-w-0 break-words text-foreground/90">{interviewer}</span>
          </li>
        ) : null}
        {description ? (
          <li className="pt-1 text-sm leading-relaxed text-foreground/95">
            <span className="text-[0.7rem] font-medium uppercase text-muted-foreground">Descripción</span>
            <p className="mt-0.5">{description}</p>
          </li>
        ) : null}
        {outcome ? (
          <li>
            <span className="text-[0.7rem] text-muted-foreground">Resultado: </span>
            {outcome}
          </li>
        ) : null}
        {noteStr ? (
          <li className="border-t border-border/40 pt-1.5 italic text-foreground/90">
            Notas: {noteStr}
          </li>
        ) : null}
      </ul>
    </li>
  )
}

const InterviewsBlock = ({ items }: { items: unknown[] }) => {
  const listId = useId()
  if (items.length === 0) return null
  const meta = sectionStyles.interviews
  const Icon = meta.icon
  return (
    <section
      className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card to-card/40 shadow-sm ring-1 ring-border/30"
      aria-labelledby={`${listId}-int-title`}
    >
      <div className={`h-1 w-full bg-gradient-to-r ${meta.bar}`} aria-hidden />
      <div className="flex items-start gap-3 border-b border-border/50 bg-muted/20 px-4 py-3.5">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.iconWrap}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h3
            id={`${listId}-int-title`}
            className="font-sans text-base font-semibold tracking-tight text-foreground"
          >
            {m.sectionInterviews}
          </h3>
          <p className="mt-0.5 font-sans text-xs text-muted-foreground">
            {items.length === 1 ? "1 entrevista" : `${items.length} entrevistas`}
          </p>
        </div>
      </div>
      <ul className="flex flex-col gap-3 p-4 pt-1" role="list">
        {items.map((row, i) => (
          <InterviewItemCard key={i} item={row} index={i} />
        ))}
      </ul>
    </section>
  )
}

const sectionId = (k: string) => `ts-section-${k}`

export function TechnicalSheetPreview({ payload }: TechnicalSheetPreviewProps) {
  const idBase = useId()
  const personal = pickObject(payload, ["personalData", "personal", "candidate"]) ?? null
  const vacancy = pickObject(payload, ["vacancy", "vacancyInfo"]) ?? null
  const application = pickObject(payload, ["application", "applicationInfo", "postulation"]) ?? null
  const match = pickObject(payload, ["match", "matching"]) ?? null
  const generatedAt = typeof payload.generatedAtUtc === "string" ? payload.generatedAtUtc : null
  const interviewsRaw = payload.interviews ?? payload.interviewList
  const interviews = useMemo(
    () => (Array.isArray(interviewsRaw) ? interviewsRaw : []),
    [interviewsRaw]
  )

  const hasAny =
    generatedAt != null ||
    (personal && Object.keys(personal).length > 0) ||
    (vacancy && Object.keys(vacancy).length > 0) ||
    (application && Object.keys(application).length > 0) ||
    (match && Object.keys(match).length > 0) ||
    interviews.length > 0

  if (!hasAny) {
    return (
      <p className="font-sans text-sm text-muted-foreground" role="status">
        {m.emptyPreview}
      </p>
    )
  }

  return (
    <div className="mx-auto flex max-w-full flex-col gap-5">
      {generatedAt != null && (
        <p
          className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/50 px-3 py-2 font-sans text-xs text-muted-foreground"
          role="status"
        >
          <span className="font-medium text-foreground/80">{m.generatedAt}:</span>
          {formatIsoDisplay(generatedAt)}
        </p>
      )}
      {personal && Object.keys(personal).length > 0 ? (
        <CandidateSectionBlock id={`${idBase}-personal`} data={personal} />
      ) : null}
      {vacancy && Object.keys(vacancy).length > 0 ? (
        <VacancySectionBlock id={sectionId("vacancy")} data={vacancy} />
      ) : null}
      {application && Object.keys(application).length > 0 ? (
        <ApplicationSectionBlock id={sectionId("app")} data={application} />
      ) : null}
      {match && Object.keys(match).length > 0 ? (
        <MatchSectionBlock id={sectionId("match")} data={match} />
      ) : null}
      {interviews.length > 0 ? <InterviewsBlock items={interviews} /> : null}
    </div>
  )
}
