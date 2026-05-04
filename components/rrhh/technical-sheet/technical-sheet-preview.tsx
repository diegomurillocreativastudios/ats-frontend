"use client"

import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { useId, useState } from "react"
import {
  BarChart2,
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  MessageCircle,
} from "lucide-react"
import { technicalSheetMessages as m } from "@/lib/messages/technical-sheet"
import type { TechnicalSheetPayload } from "@/lib/api/technical-sheet"

interface TechnicalSheetPreviewProps {
  payload: TechnicalSheetPayload
}

/**
 * Ignores empty `{}` and objects whose properties are all null, undefined, or blank strings,
 * so a placeholder `personalData: {}` does not hide a populated `candidate` object.
 */
const isMeaningfulObjectRecord = (v: unknown): v is Record<string, unknown> => {
  if (v == null || typeof v !== "object" || Array.isArray(v)) return false
  const o = v as Record<string, unknown>
  const keys = Object.keys(o).filter((k) => !k.toLowerCase().startsWith("additionalprop"))
  if (keys.length === 0) return false
  return keys.some((k) => {
    const val = o[k]
    if (val == null) return false
    if (typeof val === "string" && val.trim() === "") return false
    if (Array.isArray(val)) return val.length > 0
    if (typeof val === "object" && !Array.isArray(val)) {
      return Object.keys(val as object).length > 0
    }
    return true
  })
}

const pickObject = (
  p: TechnicalSheetPayload,
  keys: (keyof TechnicalSheetPayload)[]
): Record<string, unknown> | null => {
  for (const k of keys) {
    const v = p[k]
    if (isMeaningfulObjectRecord(v)) {
      return v
    }
  }
  return null
}

const TECHNICAL_SHEET_SIBLING_KEYS = new Set([
  "generatedAtUtc",
  "vacancy",
  "vacancyInfo",
  "application",
  "applicationInfo",
  "postulation",
  "match",
  "matching",
  "interviews",
  "interviewList",
])

const stripSheetEnvelopeKeys = (root: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...root }
  for (const k of TECHNICAL_SHEET_SIBLING_KEYS) {
    delete out[k]
  }
  return out
}

/**
 * True when the JSON root is a candidate profile (API sin envoltorio `candidate`).
 */
const isRootCandidateProfileShape = (root: Record<string, unknown>): boolean => {
  const nestedCandidate = root.candidate
  if (nestedCandidate != null && typeof nestedCandidate === "object" && !Array.isArray(nestedCandidate)) {
    return false
  }
  const cpId = root.candidateProfileId
  const fn = root.firstName
  const ln = root.lastName
  const hasProfileId = typeof cpId === "string" && cpId.trim() !== ""
  const hasFullName =
    typeof fn === "string" &&
    fn.trim() !== "" &&
    typeof ln === "string" &&
    ln.trim() !== ""
  if (!hasProfileId && !hasFullName) return false
  return isMeaningfulObjectRecord(stripSheetEnvelopeKeys(root))
}

/**
 * Objeto candidato: anidado (`candidate` / `personal`) o el propio root si ya viene plano.
 */
const pickCandidateDisplayRecord = (
  payload: TechnicalSheetPayload
): Record<string, unknown> | null => {
  const nested = pickObject(payload, ["personalData", "personal", "candidate"])
  if (nested) return nested
  if (payload == null || typeof payload !== "object" || Array.isArray(payload)) return null
  const root = payload as Record<string, unknown>
  if (!isRootCandidateProfileShape(root)) return null
  return stripSheetEnvelopeKeys(root)
}

const SPANISH_LABELS: Record<string, string> = {
  firstName: "Nombre",
  lastName: "Apellido",
  email: "Correo",
  phoneNumber: "Teléfono",
  address: "Dirección / ubicación",
  country: "País",
  birthCity: "Ciudad de nacimiento",
  englishLevel: "Nivel de inglés",
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
  socialLinks: "Enlaces y redes",
  recognitions: "Cursos y seminarios",
  profileUpdatedAtUtc: "Perfil actualizado",
  videoLink: "Video de presentación",
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
  compact,
}: {
  content: string
  isMultilineHeavy: boolean
  compact?: boolean
}) => {
  const [open, setOpen] = useState(false)
  const needsToggle =
    content.length > TEXT_COLLAPSE_AT || (isMultilineHeavy && content.split("\n").length > 5)
  const bodyClass = compact
    ? "whitespace-pre-wrap break-words text-xs leading-snug text-foreground/95"
    : "whitespace-pre-wrap break-words text-sm leading-[1.65] text-foreground/95"

  if (!needsToggle) {
    return <p className={bodyClass}>{content}</p>
  }
  return (
    <div>
      <p className={open ? bodyClass : `line-clamp-5 ${bodyClass}`}>{content}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2.5 inline-flex items-center gap-1 rounded-md font-sans text-xs font-semibold text-vo-purple transition-colors hover:bg-vo-purple/10 hover:text-vo-purple-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-vo-purple focus-visible:ring-offset-2 px-1 py-0.5 -mx-1"
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

const ValuePill = ({
  formatted,
  compact,
}: {
  formatted: ReturnType<typeof formatScalar>
  compact?: boolean
}) => {
  if (formatted.kind === "bool") {
    return (
      <span
        className={`inline-flex rounded-full border font-semibold tracking-wide ${
          compact ? "px-2 py-px text-[0.65rem]" : "px-2.5 py-0.5 text-xs"
        } ${
          formatted.text === "Sí"
            ? "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:text-emerald-200"
            : "border-border/80 bg-muted/60 text-muted-foreground"
        }`}
      >
        {formatted.text}
      </span>
    )
  }
  if (formatted.kind === "percent") {
    return (
      <span
        className={
          compact
            ? "inline-flex min-w-[2.75rem] items-baseline gap-0.5 rounded-md border border-vo-purple/20 bg-gradient-to-br from-vo-purple/[0.12] to-vo-magenta/[0.06] px-2 py-0.5 font-sans text-xs font-bold tabular-nums text-vo-purple shadow-sm"
            : "inline-flex min-w-[3.25rem] items-baseline gap-0.5 rounded-lg border border-vo-purple/20 bg-gradient-to-br from-vo-purple/[0.12] to-vo-magenta/[0.06] px-2.5 py-1 font-sans text-sm font-bold tabular-nums text-vo-purple shadow-sm"
        }
      >
        {formatted.text}
      </span>
    )
  }
  return (
    <ExpandableBlock compact={compact} content={formatted.text} isMultilineHeavy={false} />
  )
}

const DataFieldRow = ({
  fieldKey,
  value,
  rowId,
  labelOverride,
  compact,
}: {
  fieldKey: string
  value: unknown
  rowId: string
  labelOverride?: string
  compact?: boolean
}) => {
  const label = labelOverride ?? humanizeKey(fieldKey)
  const rg = compact ? sheetRowGridCompact : sheetRowGrid
  const dtTight = compact
    ? "font-sans text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground sm:pt-0"
    : "font-sans text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:pt-0.5"
  const ddText = compact ? "min-w-0 text-xs text-foreground/95" : "min-w-0 text-sm text-foreground/95"
  const ddTextMedium = compact
    ? "min-w-0 text-xs font-medium text-foreground/95"
    : "min-w-0 text-sm font-medium text-foreground/95"
  const nestedPad = compact ? "px-3 py-2" : "px-4 py-3.5"
  if (
    (fieldKey === "appliedAt" || fieldKey === "profileUpdatedAtUtc") &&
    typeof value === "string"
  ) {
    return (
      <div
        className={rg}
        id={rowId}
      >
        <dt className={dtTight}>
          {label}
        </dt>
        <dd className={ddTextMedium}>{formatIsoDisplay(value)}</dd>
      </div>
    )
  }
  if (fieldKey === "videoLink" && typeof value === "string" && value.trim() !== "") {
    const href = value.startsWith("http") ? value : `https://${value}`
    return (
      <div
        className={rg}
        id={rowId}
      >
        <dt className={dtTight}>
          {label}
        </dt>
        <dd className={ddText}>
          <a
            href={href}
            className="break-all font-medium text-vo-purple underline decoration-vo-purple/30 underline-offset-[3px] transition-colors hover:text-vo-purple-hover hover:decoration-vo-purple"
            target="_blank"
            rel="noopener noreferrer"
          >
            {value}
          </a>
        </dd>
      </div>
    )
  }
  const isPlainLongString =
    typeof value === "string" &&
    (value.length > TEXT_COLLAPSE_AT || value.split("\n").length > 5)
  if (isPlainLongString) {
    return (
      <div
        className={`rounded-xl border border-border/60 bg-gradient-to-br from-card/90 to-muted/[0.2] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-black/[0.02] dark:ring-white/[0.04] ${nestedPad}`}
        id={rowId}
      >
        <div className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </div>
        <div className={compact ? "mt-1" : "mt-2"}>
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
          className={rg}
          id={rowId}
        >
          <dt className={dtTight}>
            {label}
          </dt>
          <dd className={compact ? "text-xs text-muted-foreground" : "text-sm text-muted-foreground"}>
            —
          </dd>
        </div>
      )
    }
    return (
      <div
        className={`rounded-xl border border-border/60 bg-gradient-to-br from-card/90 to-muted/[0.15] shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04] ${nestedPad}`}
        id={rowId}
      >
        <div className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </div>
        <ul className={compact ? "mt-1.5 max-h-40 space-y-1 overflow-y-auto pr-1" : "mt-2.5 max-h-48 space-y-2 overflow-y-auto pr-1"} role="list">
          {keys.map((k) => (
            <li
              key={k}
              className={
                compact
                  ? "flex flex-col gap-0.5 rounded-lg border border-border/45 bg-background/70 px-2 py-1.5 text-xs shadow-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-2"
                  : "flex flex-col gap-1 rounded-lg border border-border/45 bg-background/70 px-3 py-2 text-sm shadow-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
              }
            >
              <span className="shrink-0 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
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
        <div className={rg} id={rowId}>
          <dt className={dtTight}>
            {label}
          </dt>
          <dd className={compact ? "text-xs text-muted-foreground" : "text-sm text-muted-foreground"}>
            —
          </dd>
        </div>
      )
    }
    return (
      <div
        className={`rounded-xl border border-border/60 bg-gradient-to-br from-card/90 to-muted/[0.15] shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04] ${nestedPad}`}
        id={rowId}
      >
        <div className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </div>
        <ol
          className={
            compact
              ? "mt-1.5 list-decimal space-y-1 pl-3 text-xs leading-relaxed text-foreground/95 marker:font-semibold marker:text-vo-purple"
              : "mt-2.5 list-decimal space-y-2 pl-4 text-sm leading-relaxed text-foreground/95 marker:font-semibold marker:text-vo-purple"
          }
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
    <div className={rg} id={rowId}>
      <dt className={dtTight}>
        {label}
      </dt>
      <dd className={ddText}>
        <ValuePill compact={compact} formatted={formatted} />
      </dd>
    </div>
  )
}

const SkillsCloud = ({ skills }: { skills: string[] }) => (
  <div className="flex flex-wrap gap-2" role="list" aria-label={m.skills}>
    {skills.map((s) => (
      <span
        key={s}
        role="listitem"
        className="inline-flex rounded-full border border-vo-purple/15 bg-gradient-to-br from-background to-vo-purple/[0.04] px-3 py-1 text-xs font-semibold text-foreground/90 shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-vo-purple/25 hover:shadow-md"
      >
        {s}
      </span>
    ))}
  </div>
)

const JsonArrayCards = ({
  items,
  variant,
}: {
  items: unknown[]
  variant: "work" | "edu" | "lang" | "social"
}) => (
  <ul className="flex flex-col gap-3" role="list">
    {items.map((raw, i) => {
      const rec = asRecord(raw)
      if (!rec) {
        return (
          <li
            key={i}
            className="rounded-xl border border-dashed border-vo-purple/25 bg-vo-purple/[0.03] px-3.5 py-2.5 text-sm text-foreground/85"
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
            className="relative overflow-hidden rounded-xl border border-border/55 bg-gradient-to-br from-card to-muted/[0.12] pl-4 pr-4 py-3.5 shadow-sm ring-1 ring-black/[0.02] before:absolute before:left-0 before:top-3 before:h-[calc(100%-1.5rem)] before:w-1 before:rounded-full before:bg-gradient-to-b before:from-vo-purple before:to-vo-magenta/60 dark:ring-white/[0.05]"
          >
            {company ? (
              <p className={`font-sans text-base font-semibold tracking-tight text-foreground`}>
                {company}
              </p>
            ) : null}
            {role ? (
              <p className="mt-1 font-sans text-sm font-medium text-vo-purple">
                {role}
              </p>
            ) : null}
            {(from || to) && (
              <p className="mt-2 flex items-center gap-2 font-sans text-xs font-medium text-muted-foreground">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/80 text-vo-purple">
                  <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                </span>
                {[from, to].filter(Boolean).join(" – ")}
              </p>
            )}
            {desc ? (
              <div className="mt-3 border-t border-border/40 pt-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {m.description}
                </p>
                <div className="mt-1.5">
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
            className="rounded-xl border border-border/55 bg-gradient-to-br from-card to-vo-navy/[0.04] px-4 py-3.5 shadow-sm ring-1 ring-vo-navy/10"
          >
            {inst ? (
              <p className={`font-sans text-base font-semibold tracking-tight text-foreground`}>
                {inst}
              </p>
            ) : null}
            {deg ? <p className="mt-1 text-sm font-medium text-foreground/90">{deg}</p> : null}
            {(from || to) && (
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {[from, to].filter(Boolean).join(" – ")}
              </p>
            )}
          </li>
        )
      }
      if (variant === "social") {
        const platform = pickFromRecord(rec, ["Platform", "platform", "name", "label"])
        const url = pickFromRecord(rec, ["Url", "url", "link", "href"])
        return (
          <li
            key={i}
            className="flex flex-col gap-2 rounded-xl border border-border/55 bg-card/90 px-4 py-3.5 shadow-sm ring-1 ring-black/[0.02] sm:flex-row sm:items-center sm:justify-between dark:ring-white/[0.05]"
          >
            <span className="text-sm font-semibold text-foreground">{platform || "Red social"}</span>
            {url ? (
              <a
                href={url.startsWith("http") ? url : `https://${url}`}
                className="break-all text-sm font-medium text-vo-purple underline decoration-vo-purple/25 underline-offset-[3px] transition-colors hover:decoration-vo-purple"
                target="_blank"
                rel="noopener noreferrer"
              >
                {url}
              </a>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </li>
        )
      }
      const lang = pickFromRecord(rec, ["Language", "language", "name"])
      const level = pickFromRecord(rec, ["Level", "level", "proficiency"])
      return (
        <li
          key={i}
          className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/25 px-3.5 py-2.5"
        >
          <span className="text-sm font-semibold text-foreground">{lang ?? "—"}</span>
          {level ? (
            <span className="rounded-full border border-border/60 bg-background px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {level}
            </span>
          ) : null}
        </li>
      )
    })}
  </ul>
)

interface SectionMeta {
  icon: LucideIcon
  bar: string
  iconWrap: string
}

const sectionStyles: Record<string, SectionMeta> = {
  vacancy: {
    icon: Briefcase,
    bar: "from-vo-navy via-vo-sky/80 to-cyan-500/40",
    iconWrap:
      "border border-vo-navy/20 bg-vo-navy/[0.08] text-vo-navy dark:border-vo-navy/30 dark:bg-vo-navy/15 dark:text-vo-sky",
  },
  application: {
    icon: ClipboardList,
    bar: "from-vo-yellow via-amber-500/70 to-orange-400/45",
    iconWrap:
      "border border-amber-500/30 bg-amber-500/[0.1] text-amber-900 dark:border-amber-500/35 dark:bg-amber-500/12 dark:text-amber-100",
  },
  match: {
    icon: BarChart2,
    bar: "from-emerald-600 via-teal-500/70 to-vo-navy/35",
    iconWrap:
      "border border-emerald-500/25 bg-emerald-500/[0.1] text-emerald-800 dark:border-emerald-500/35 dark:bg-emerald-500/12 dark:text-emerald-200",
  },
  interviews: {
    icon: MessageCircle,
    bar: "from-indigo-600 via-vo-purple/60 to-vo-magenta/40",
    iconWrap:
      "border border-indigo-400/25 bg-indigo-500/[0.1] text-indigo-800 dark:border-indigo-400/35 dark:bg-indigo-500/12 dark:text-indigo-200",
  },
}

const sheetRowGrid =
  "grid grid-cols-1 gap-2 border-b border-border/40 py-3 last:border-0 sm:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)] sm:items-start sm:gap-5 sm:py-3.5 transition-colors hover:bg-muted/[0.25]"

const sheetRowGridCompact =
  "grid grid-cols-1 gap-1 border-b border-border/40 py-1.5 last:border-0 sm:grid-cols-[minmax(0,0.36fr)_minmax(0,0.64fr)] sm:items-start sm:gap-3 sm:py-2 transition-colors hover:bg-muted/[0.2]"

function SheetSectionFrame({
  titleId,
  title,
  meta,
  subtitle,
  children,
  density = "default",
}: {
  titleId: string
  title: string
  meta: SectionMeta
  subtitle?: ReactNode
  children: ReactNode
  density?: "default" | "compact"
}) {
  const Icon = meta.icon
  const isCompact = density === "compact"
  return (
    <section
      className={
        isCompact
          ? "group relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm ring-1 ring-black/[0.02] transition-[box-shadow,transform] duration-300 hover:shadow-md dark:ring-white/[0.05]"
          : "group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm ring-1 ring-black/[0.02] transition-[box-shadow,transform] duration-300 hover:shadow-md dark:ring-white/[0.05]"
      }
      aria-labelledby={titleId}
    >
      <div
        className={`relative z-[2] h-1 w-full bg-gradient-to-r ${meta.bar}`}
        aria-hidden
      />
      <div
        className={
          isCompact
            ? "relative z-[2] flex items-center gap-2.5 border-b border-border/50 bg-muted/25 px-3 py-2 dark:bg-muted/15"
            : "relative z-[2] flex items-center gap-4 border-b border-border/50 bg-muted/25 px-5 py-4 dark:bg-muted/15"
        }
      >
        <div
          className={
            isCompact
              ? `flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.iconWrap}`
              : `flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.iconWrap}`
          }
        >
          <Icon
            className={isCompact ? "h-4 w-4" : "h-[1.125rem] w-[1.125rem]"}
            strokeWidth={2}
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3
            id={titleId}
            className={
              isCompact
                ? "font-sans text-sm font-semibold leading-snug tracking-tight text-foreground sm:text-base"
                : "font-sans text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl"
            }
          >
            {title}
          </h3>
          {subtitle ? (
            <div
              className={
                isCompact
                  ? "mt-0.5 font-sans text-[0.65rem] font-medium text-muted-foreground sm:text-xs"
                  : "mt-1 font-sans text-xs font-medium text-muted-foreground"
              }
            >
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
      <div
        className={
          isCompact ? "relative z-[2] px-3 py-0 pb-2.5" : "relative z-[2] px-5 py-1 pb-4"
        }
      >
        {children}
      </div>
    </section>
  )
}

const CANDIDATE_BLOB_KEYS = new Set([
  "workExperience",
  "education",
  "languages",
  "skills",
  "technicalSkills",
  "softSkills",
  "socialLinks",
  "recognitions",
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

const collectStringList = (v: unknown): string[] =>
  Array.isArray(v)
    ? [...new Set(v.map((s) => String(s).trim()).filter((s) => s !== ""))]
    : []

function CandidateSectionBlock({ data }: { data: Record<string, unknown> }) {
  const summary = data.summary
  const resume = data.resumeMarkdown
  const work = Array.isArray(data.workExperience) ? data.workExperience : []
  const education = Array.isArray(data.education) ? data.education : []
  const langs = Array.isArray(data.languages) ? data.languages : []
  const socialLinks = Array.isArray(data.socialLinks) ? data.socialLinks : []
  const recognitions = Array.isArray(data.recognitions)
    ? data.recognitions.map((r) => String(r)).filter((r) => r.trim() !== "")
    : []
  const skillsLegacy = collectStringList(data.skills)
  const technicalSkillsList = collectStringList(data.technicalSkills)
  const softSkillsList = collectStringList(data.softSkills)
  const hasTechnicalBucket = technicalSkillsList.length > 0
  const hasSoftBucket = softSkillsList.length > 0
  const showSplitSkillBuckets = hasTechnicalBucket || hasSoftBucket
  const combinedTechnicalSkills = hasTechnicalBucket
    ? [...new Set([...technicalSkillsList, ...skillsLegacy])]
    : []
  const legacySkillsWhenOnlySoftTyped =
    !hasTechnicalBucket && hasSoftBucket ? skillsLegacy : []

  return (
    <div className="flex flex-col gap-6">
        {typeof summary === "string" && summary.trim() !== "" && (
          <div className="rounded-xl border border-vo-purple/25 bg-gradient-to-br from-vo-purple/[0.06] via-card to-vo-magenta/[0.04] p-4 shadow-inner ring-1 ring-vo-purple/10">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-vo-purple">
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
          <div className="mt-6">
            <h4
              className={`font-sans mb-3 text-lg font-semibold tracking-tight text-foreground`}
            >
              {m.workExperience}
            </h4>
            <JsonArrayCards items={work} variant="work" />
          </div>
        )}

        {education.length > 0 && (
          <div className="mt-6">
            <h4
              className={`font-sans mb-3 text-lg font-semibold tracking-tight text-foreground`}
            >
              {m.education}
            </h4>
            <JsonArrayCards items={education} variant="edu" />
          </div>
        )}

        {langs.length > 0 && (
          <div className="mt-6">
            <h4
              className={`font-sans mb-3 text-lg font-semibold tracking-tight text-foreground`}
            >
              {m.languages}
            </h4>
            <JsonArrayCards items={langs} variant="lang" />
          </div>
        )}

        {showSplitSkillBuckets ? (
          <>
            {combinedTechnicalSkills.length > 0 ? (
              <div className="mt-6">
                <h4
                  className={`font-sans mb-3 text-lg font-semibold tracking-tight text-foreground`}
                >
                  {m.technicalSkills}
                </h4>
                <SkillsCloud skills={combinedTechnicalSkills} />
              </div>
            ) : null}
            {softSkillsList.length > 0 ? (
              <div className="mt-6">
                <h4
                  className={`font-sans mb-3 text-lg font-semibold tracking-tight text-foreground`}
                >
                  {m.softSkills}
                </h4>
                <SkillsCloud skills={softSkillsList} />
              </div>
            ) : null}
            {legacySkillsWhenOnlySoftTyped.length > 0 ? (
              <div className="mt-6">
                <h4
                  className={`font-sans mb-3 text-lg font-semibold tracking-tight text-foreground`}
                >
                  {m.skills}
                </h4>
                <SkillsCloud skills={legacySkillsWhenOnlySoftTyped} />
              </div>
            ) : null}
          </>
        ) : skillsLegacy.length > 0 ? (
          <div className="mt-6">
            <h4
              className={`font-sans mb-3 text-lg font-semibold tracking-tight text-foreground`}
            >
              {m.skills}
            </h4>
            <SkillsCloud skills={skillsLegacy} />
          </div>
        ) : null}

        {socialLinks.length > 0 && (
          <div className="mt-6">
            <h4
              className={`font-sans mb-3 text-lg font-semibold tracking-tight text-foreground`}
            >
              {m.socialLinks}
            </h4>
            <JsonArrayCards items={socialLinks} variant="social" />
          </div>
        )}

        {recognitions.length > 0 && (
          <div className="mt-6">
            <h4
              className={`font-sans mb-3 text-lg font-semibold tracking-tight text-foreground`}
            >
              {m.recognitions}
            </h4>
            <ul className="flex flex-col gap-2" role="list">
              {recognitions.map((line, i) => (
                <li
                  key={`${i}-${line.slice(0, 24)}`}
                  className="rounded-lg border border-border/50 bg-muted/20 px-3.5 py-2.5 text-sm leading-relaxed text-foreground/95"
                >
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        {typeof resume === "string" && resume.trim() !== "" && (
          <div className="mt-6 rounded-xl border border-border/60 bg-gradient-to-b from-muted/30 to-card/80 p-4 ring-1 ring-black/[0.02] dark:ring-white/[0.05]">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {m.resumeMarkdown}
            </p>
            <div className="mt-2 max-h-72 overflow-hidden rounded-lg border border-border/55 bg-background/80">
              <ExpandableBlock
                content={resume}
                isMultilineHeavy
              />
            </div>
          </div>
        )}
    </div>
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

  return (
    <SheetSectionFrame titleId={`${id}-title`} title={m.sectionVacancy} meta={meta}>
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
    </SheetSectionFrame>
  )
}

function ApplicationSectionBlock({ id, data }: { id: string; data: Record<string, unknown> }) {
  const entries = orderEntries(data, APPLICATION_ORDER)
  const meta = sectionStyles.application
  return (
    <SheetSectionFrame titleId={`${id}-title`} title={m.sectionApplication} meta={meta}>
      <dl>
        {entries.map(([key, val], idx) => (
          <DataFieldRow
            key={`${key}-${idx}`}
            fieldKey={key}
            value={val}
            rowId={`${id}-${key}`}
          />
        ))}
      </dl>
    </SheetSectionFrame>
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
  const scoresRec =
    componentScores != null &&
    typeof componentScores === "object" &&
    !Array.isArray(componentScores)
      ? (componentScores as Record<string, unknown>)
      : null

  return (
    <SheetSectionFrame titleId={`${id}-title`} title={m.sectionMatch} meta={meta}>
      <div className="space-y-4 py-2">
        {typeof data.totalScore === "number" && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.12] via-card to-vo-purple/[0.06] px-4 py-3.5 shadow-sm ring-1 ring-emerald-500/10">
            <span className="text-sm font-semibold text-foreground">{m.matchTotalScore}</span>
            <span className={`font-sans text-2xl font-bold tabular-nums text-vo-purple`}>
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
            <h4
              className={`font-sans mb-2.5 text-lg font-semibold tracking-tight text-foreground`}
            >
              {m.matchComponents}
            </h4>
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
    </SheetSectionFrame>
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
      <li className="rounded-xl border border-border/60 bg-gradient-to-br from-card to-muted/20 p-4 text-sm leading-relaxed text-foreground/95 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.05]">
        {item}
      </li>
    )
  }

  return (
    <li className="rounded-xl border border-border/55 bg-gradient-to-br from-card via-card to-indigo-500/[0.03] p-4 shadow-md ring-1 ring-vo-purple/[0.06] transition-[transform,box-shadow] duration-300 hover:-translate-y-px hover:shadow-lg">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <p className={`font-sans min-w-0 text-base font-semibold tracking-tight text-foreground`}>
          {title}
        </p>
        {status ? (
          <span className="w-fit rounded-full border border-border/60 bg-muted/80 px-2.5 py-1 font-sans text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
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
  const countLabel = items.length === 1 ? "1 entrevista" : `${items.length} entrevistas`
  return (
    <SheetSectionFrame
      titleId={`${listId}-int-title`}
      title={m.sectionInterviews}
      meta={meta}
      subtitle={countLabel}
    >
      <ul className="flex flex-col gap-3 pt-1" role="list">
        {items.map((row, i) => (
          <InterviewItemCard key={i} item={row} index={i} />
        ))}
      </ul>
    </SheetSectionFrame>
  )
}

function trimUnknownDisplayPart(v: unknown): string {
  if (v == null) return ""
  const s = typeof v === "string" ? v : String(v)
  return s.trim()
}

/**
 * Nombre completo, dirección e inglés desde el payload de la ficha (mismo criterio que el preview).
 */
export function getTechnicalSheetCandidateHeaderFacts(
  payload: TechnicalSheetPayload
): { fullName: string; address: string; englishLevel: string } | null {
  const personal = pickCandidateDisplayRecord(payload)
  if (!personal) return null
  const fullName = [trimUnknownDisplayPart(personal.firstName), trimUnknownDisplayPart(personal.lastName)]
    .filter(Boolean)
    .join(" ")
  const address = trimUnknownDisplayPart(personal.address)
  const englishLevel = trimUnknownDisplayPart(personal.englishLevel)
  return { fullName, address, englishLevel }
}

export function TechnicalSheetPreview({ payload }: TechnicalSheetPreviewProps) {
  const personal = pickCandidateDisplayRecord(payload)

  const hasCandidate = personal != null && Object.keys(personal).length > 0

  if (!hasCandidate) {
    return (
      <div
        className="rounded-2xl border border-dashed border-vo-purple/25 bg-gradient-to-br from-muted/40 via-card to-vo-purple/[0.04] px-6 py-10 text-center shadow-inner"
        role="status"
      >
        <p className="font-sans text-sm font-medium leading-relaxed text-muted-foreground">{m.emptyPreview}</p>
      </div>
    )
  }

  return (
    <div
      className="relative mx-auto flex max-w-full flex-col gap-6 rounded-3xl bg-[radial-gradient(ellipse_120%_80%_at_100%_-20%,rgba(110,51,133,0.08),transparent),radial-gradient(ellipse_90%_60%_at_-10%_60%,rgba(113,188,237,0.07),transparent)] px-1 py-1 sm:px-2"
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-[0.35] [background-image:radial-gradient(circle_at_center,rgba(13,13,13,0.04)_1px,transparent_1.5px)] [background-size:14px_14px]"
        aria-hidden
      />
      <div className="relative flex flex-col gap-6">
        <CandidateSectionBlock data={personal} />
      </div>
    </div>
  )
}
