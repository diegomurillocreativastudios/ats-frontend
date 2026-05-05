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
import {
  getTechnicalSheetCandidateHeaderFacts,
  pickCandidateDisplayRecord,
} from "@/lib/technical-sheet/candidate-from-payload"

interface TechnicalSheetPreviewProps {
  payload: TechnicalSheetPayload
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
  note: "Nota",
  interviewNotes: "Notas de entrevista",
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
  bodyClassName,
}: {
  content: string
  isMultilineHeavy: boolean
  compact?: boolean
  bodyClassName?: string
}) => {
  const [open, setOpen] = useState(false)
  const needsToggle =
    content.length > TEXT_COLLAPSE_AT || (isMultilineHeavy && content.split("\n").length > 5)
  const bodyClass =
    bodyClassName ??
    (compact
      ? "whitespace-pre-wrap break-words text-xs leading-snug text-foreground/95"
      : "whitespace-pre-wrap break-words text-sm leading-[1.65] text-foreground/95")

  if (!needsToggle) {
    return <p className={bodyClass}>{content}</p>
  }
  return (
    <div>
      <p className={open ? bodyClass : `line-clamp-5 ${bodyClass}`}>{content}</p>
      <button
        type="button"
        data-technical-sheet-pdf-hide
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

const capitalizeSentence = (s: string) =>
  s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)

function formatSpanishMonthYearRaw(raw: string | null | undefined): string {
  if (raw == null || String(raw).trim() === "") return ""
  const t = String(raw).trim()
  const d = new Date(t)
  if (!Number.isNaN(d.getTime())) {
    const formatted = new Intl.DateTimeFormat("es", {
      month: "long",
      year: "numeric",
    }).format(d)
    return capitalizeSentence(formatted)
  }
  return t
}

function formatWorkPeriodDisplay(from: string | null, to: string | null): string {
  const a = formatSpanishMonthYearRaw(from)
  const b = formatSpanishMonthYearRaw(to)
  if (a !== "" && b !== "") return `${a}-${b}`
  if (a !== "") return a
  if (b !== "") return b
  return "—"
}

function extractWorkFunctions(rec: Record<string, unknown>): string[] {
  const arrayKeys = [
    "responsibilities",
    "Responsibilities",
    "functions",
    "Functions",
    "mainFunctions",
    "MainFunctions",
    "bullets",
    "Bullets",
    "achievements",
    "Achievements",
  ]
  for (const k of arrayKeys) {
    const v = rec[k]
    if (Array.isArray(v)) {
      const out = v.map((x) => String(x).trim()).filter((x) => x !== "")
      if (out.length > 0) return out
    }
  }
  const desc = pickFromRecord(rec, ["Description", "description", "summary"])
  if (!desc) return []
  const lines = desc
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s\-•*·]+/, "").trim())
    .filter((line) => line !== "")
  if (lines.length > 1) return lines
  if (lines.length === 1) return lines
  return [desc.trim()]
}

function TechnicalSheetDecorTopRight() {
  return (
    <div
      className="pointer-events-none absolute right-0 top-0 z-0 h-24 w-28 overflow-hidden"
      aria-hidden
    >
      <div className="absolute -right-7 -top-9 h-17 w-17 rotate-12 rounded-md bg-teal-500/90 shadow-sm" />
      <div className="absolute -right-1 top-1 h-13 w-13 rotate-[-8deg] rounded-md bg-vo-purple shadow-sm" />
    </div>
  )
}

function TechnicalSheetDecorBottomLeft() {
  return (
    <div
      className="pointer-events-none absolute bottom-0 left-0 z-0 h-11 w-28 overflow-hidden"
      aria-hidden
    >
      <div className="absolute -left-2 -bottom-1 h-10 w-10 rotate-[-10deg] rounded-md bg-vo-purple/95 shadow-sm" />
      <div className="absolute -bottom-1 left-9 h-6 w-6 rotate-[8deg] rounded-md bg-teal-500/85 shadow-sm" />
    </div>
  )
}

function TechnicalSheetDecorBottomRight() {
  return (
    <div
      className="pointer-events-none absolute bottom-0 right-4 z-0 flex flex-col items-end gap-1"
      aria-hidden
    >
      <div className="h-8 w-8 rounded bg-vo-purple/90 shadow-sm" />
      <div className="grid grid-cols-4 grid-rows-3 gap-1.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="block h-1.5 w-1.5 rounded-full bg-vo-purple/75" />
        ))}
      </div>
    </div>
  )
}

function TechnicalSheetBrandHeader() {
  return (
    <div className="flex max-w-[min(100%,280px)] flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white shadow-sm">
          {/* img nativo para consistencia con capturas / marca */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/visible-icon.webp"
            alt=""
            width={26}
            height={20}
            className="h-auto w-[26px] object-contain"
            decoding="async"
          />
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/visible-text.png"
          alt="Visible"
          width={104}
          height={28}
          className="h-auto w-[104px] object-contain"
          decoding="async"
        />
      </div>
      <p className="font-sans text-[11px] font-medium leading-snug tracking-wide text-neutral-600">
        {m.brandTagline}
      </p>
    </div>
  )
}

function TechnicalSheetPersonalFacts({
  fullName,
  address,
  englishLevel,
}: {
  fullName: string
  address: string
  englishLevel: string
}) {
  const dash = (v: string) => (v.trim() !== "" ? v : "—")
  return (
    <div className="relative z-10 max-w-sm space-y-2 pr-1 font-sans text-sm leading-relaxed text-neutral-900 md:max-w-xs md:pr-10 md:text-right">
      <p>
        <span className="font-bold">{m.headerName}:</span>{" "}
        <span className="font-normal">{dash(fullName)}</span>
      </p>
      <p>
        <span className="font-bold">{m.headerAddress}:</span>{" "}
        <span className="font-normal">{dash(address)}</span>
      </p>
      <p>
        <span className="font-bold">{m.headerEnglishLevel}:</span>{" "}
        <span className="font-normal">{dash(englishLevel)}</span>
      </p>
    </div>
  )
}

function DocumentSectionTitle({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h3
      id={id}
      className="mb-5 border-b-2 border-neutral-900 pb-1 font-sans text-[15px] font-bold uppercase tracking-[0.06em] text-neutral-900"
    >
      {children}
    </h3>
  )
}

function DocumentSkillsList({ skills }: { skills: string[] }) {
  return (
    <ul
      className="list-disc space-y-1.5 pl-5 font-sans text-sm leading-relaxed text-neutral-800 marker:text-vo-purple"
      role="list"
      aria-label={m.skills}
    >
      {skills.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ul>
  )
}

function pickInterviewNoteText(rec: Record<string, unknown>): string | null {
  const fromNote = pickFromRecord(rec, ["note", "Note"])
  const fromNotes = pickFromRecord(rec, ["notes", "Notes"])
  const t = (fromNote ?? fromNotes ?? "").trim()
  return t !== "" ? t : null
}

function InterviewNotesDocumentEntries({ items }: { items: unknown[] }) {
  const docBody =
    "whitespace-pre-wrap break-words text-sm leading-[1.65] text-neutral-800"
  return (
    <ul className="space-y-8" role="list">
      {items.map((raw, i) => {
        const rec = asRecord(raw)
        if (!rec) {
          return (
            <li key={i} className="list-none text-sm text-neutral-800">
              {typeof raw === "string" ? raw : describeValuePlain(raw)}
            </li>
          )
        }
        const whenRaw = pickFromRecord(rec, ["scheduledAtUtc", "scheduledAt", "date"])
        const whenLabel = whenRaw ? formatIsoDisplay(whenRaw) : "—"
        const interviewer =
          pickFromRecord(rec, ["interviewerName", "interviewer", "InterviewerName"]) ?? null
        const noteText = pickInterviewNoteText(rec)
        return (
          <li key={i} className="list-none space-y-2 font-sans text-sm leading-relaxed text-neutral-900">
            <p>
              <span className="font-bold">{m.interviewWhen}:</span>{" "}
              <span className="font-normal">{whenLabel}</span>
            </p>
            <p>
              <span className="font-bold">{m.interviewerLabel}:</span>{" "}
              <span className="font-normal">{interviewer?.trim() ? interviewer : "—"}</span>
            </p>
            <div className="pt-0.5">
              <p className="font-bold">{m.interviewNoteLabel}</p>
              {noteText ? (
                <div className="mt-1.5">
                  <ExpandableBlock
                    content={noteText}
                    isMultilineHeavy={noteText.includes("\n") || noteText.length > 200}
                    bodyClassName={docBody}
                  />
                </div>
              ) : (
                <p className="mt-1.5 text-neutral-600">—</p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function WorkExperienceDocumentEntries({ items }: { items: unknown[] }) {
  return (
    <ul className="space-y-10" role="list">
      {items.map((raw, i) => {
        const rec = asRecord(raw)
        if (!rec) {
          return (
            <li key={i} className="list-none text-sm text-neutral-800">
              {typeof raw === "string" ? raw : describeValuePlain(raw)}
            </li>
          )
        }
        const company = pickFromRecord(rec, ["Company", "company", "employer"]) ?? "—"
        const role = pickFromRecord(rec, ["Role", "role", "position", "title"]) ?? "—"
        const from = pickFromRecord(rec, ["StartDate", "startDate", "from"])
        const to = pickFromRecord(rec, ["EndDate", "endDate", "to"])
        const period = formatWorkPeriodDisplay(from, to)
        const functions = extractWorkFunctions(rec)
        return (
          <li key={i} className="list-none">
            <div className="space-y-2.5 font-sans text-sm leading-relaxed text-neutral-900">
              <p>
                <span className="font-bold">{m.company}:</span>{" "}
                <span className="font-normal">{company}</span>
              </p>
              <p>
                <span className="font-bold">{m.workRolePerformed}:</span>{" "}
                <span className="font-normal">{role}</span>
              </p>
              <p>
                <span className="font-bold">{m.workPeriod}:</span>{" "}
                <span className="font-normal">{period}</span>
              </p>
              <div className="pt-1">
                <p className="font-bold">{m.workMainFunctions}:</p>
                {functions.length > 0 ? (
                  <ul
                    className="mt-2 list-disc space-y-1.5 pl-5 marker:text-vo-purple"
                    role="list"
                  >
                    {functions.map((line, j) => (
                      <li key={j} className="pl-0.5 text-neutral-800">
                        {line}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-neutral-600">—</p>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

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
  "interviewNotes",
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
  const interviewNotesRaw = data.interviewNotes ?? data.InterviewNotes
  const interviewNotes = Array.isArray(interviewNotesRaw) ? interviewNotesRaw : []
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

  const docBody =
    "whitespace-pre-wrap break-words text-sm leading-[1.65] text-neutral-800"

  return (
    <div className="flex flex-col gap-12 text-neutral-900">
      {typeof summary === "string" && summary.trim() !== "" ? (
        <section aria-labelledby="ts-sec-summary">
          <DocumentSectionTitle id="ts-sec-summary">{m.summary}</DocumentSectionTitle>
          <ExpandableBlock
            content={summary}
            isMultilineHeavy={summary.includes("\n") || summary.length > 200}
            bodyClassName={docBody}
          />
        </section>
      ) : null}

      {work.length > 0 ? (
        <section aria-labelledby="ts-sec-work">
          <DocumentSectionTitle id="ts-sec-work">{m.workExperience}</DocumentSectionTitle>
          <WorkExperienceDocumentEntries items={work} />
        </section>
      ) : null}

      {education.length > 0 ? (
        <section aria-labelledby="ts-sec-edu">
          <DocumentSectionTitle id="ts-sec-edu">{m.education}</DocumentSectionTitle>
          <ul className="space-y-8" role="list">
            {education.map((raw, i) => {
              const rec = asRecord(raw)
              if (!rec) {
                return (
                  <li key={i} className="list-none text-sm text-neutral-800">
                    {typeof raw === "string" ? raw : describeValuePlain(raw)}
                  </li>
                )
              }
              const inst = pickFromRecord(rec, ["Institution", "institution", "school"]) ?? "—"
              const deg = pickFromRecord(rec, ["Degree", "degree", "title"])
              const from = pickFromRecord(rec, ["StartDate", "startDate"])
              const to = pickFromRecord(rec, ["EndDate", "endDate"])
              const period =
                from || to ? formatWorkPeriodDisplay(from, to) : null
              return (
                <li key={i} className="list-none space-y-2 font-sans text-sm leading-relaxed">
                  <p>
                    <span className="font-bold">{m.institution}:</span>{" "}
                    <span className="font-normal">{inst}</span>
                  </p>
                  {deg ? (
                    <p>
                      <span className="font-bold">{m.degree}:</span>{" "}
                      <span className="font-normal">{deg}</span>
                    </p>
                  ) : null}
                  {period && period !== "—" ? (
                    <p>
                      <span className="font-bold">{m.workPeriod}:</span>{" "}
                      <span className="font-normal">{period}</span>
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {langs.length > 0 ? (
        <section aria-labelledby="ts-sec-lang">
          <DocumentSectionTitle id="ts-sec-lang">{m.languages}</DocumentSectionTitle>
          <ul className="space-y-3" role="list">
            {langs.map((raw, i) => {
              const rec = asRecord(raw)
              const lang = rec
                ? pickFromRecord(rec, ["Language", "language", "name"])
                : typeof raw === "string"
                  ? raw
                  : null
              const level = rec
                ? pickFromRecord(rec, ["Level", "level", "proficiency"])
                : null
              return (
                <li
                  key={i}
                  className="list-none font-sans text-sm leading-relaxed text-neutral-900"
                >
                  <span className="font-bold">{lang ?? "—"}</span>
                  {level ? (
                    <span className="font-normal text-neutral-700"> — {level}</span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {showSplitSkillBuckets ? (
        <>
          {combinedTechnicalSkills.length > 0 ? (
            <section aria-labelledby="ts-sec-tech-skills">
              <DocumentSectionTitle id="ts-sec-tech-skills">{m.technicalSkills}</DocumentSectionTitle>
              <DocumentSkillsList skills={combinedTechnicalSkills} />
            </section>
          ) : null}
          {softSkillsList.length > 0 ? (
            <section aria-labelledby="ts-sec-soft-skills">
              <DocumentSectionTitle id="ts-sec-soft-skills">{m.softSkills}</DocumentSectionTitle>
              <DocumentSkillsList skills={softSkillsList} />
            </section>
          ) : null}
          {legacySkillsWhenOnlySoftTyped.length > 0 ? (
            <section aria-labelledby="ts-sec-skills-mixed">
              <DocumentSectionTitle id="ts-sec-skills-mixed">{m.skills}</DocumentSectionTitle>
              <DocumentSkillsList skills={legacySkillsWhenOnlySoftTyped} />
            </section>
          ) : null}
        </>
      ) : skillsLegacy.length > 0 ? (
        <section aria-labelledby="ts-sec-skills">
          <DocumentSectionTitle id="ts-sec-skills">{m.skills}</DocumentSectionTitle>
          <DocumentSkillsList skills={skillsLegacy} />
        </section>
      ) : null}

      {socialLinks.length > 0 ? (
        <section aria-labelledby="ts-sec-social">
          <DocumentSectionTitle id="ts-sec-social">{m.socialLinks}</DocumentSectionTitle>
          <ul className="space-y-3 font-sans text-sm" role="list">
            {socialLinks.map((raw, i) => {
              const rec = asRecord(raw)
              const platform = rec
                ? pickFromRecord(rec, ["Platform", "platform", "name", "label"])
                : null
              const url = rec ? pickFromRecord(rec, ["Url", "url", "link", "href"]) : null
              return (
                <li key={i} className="list-none">
                  <span className="font-bold">{platform ?? "—"}:</span>{" "}
                  {url ? (
                    <a
                      href={url.startsWith("http") ? url : `https://${url}`}
                      className="break-all font-normal text-vo-purple underline decoration-vo-purple/35 underline-offset-[3px] hover:text-vo-purple-hover"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {url}
                    </a>
                  ) : (
                    <span className="text-neutral-600">—</span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {recognitions.length > 0 ? (
        <section aria-labelledby="ts-sec-recog">
          <DocumentSectionTitle id="ts-sec-recog">{m.recognitions}</DocumentSectionTitle>
          <ul
            className="list-disc space-y-1.5 pl-5 font-sans text-sm leading-relaxed text-neutral-800 marker:text-vo-purple"
            role="list"
          >
            {recognitions.map((line, i) => (
              <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {typeof resume === "string" && resume.trim() !== "" ? (
        <section aria-labelledby="ts-sec-resume">
          <DocumentSectionTitle id="ts-sec-resume">{m.resumeMarkdown}</DocumentSectionTitle>
          <ExpandableBlock content={resume} isMultilineHeavy bodyClassName={docBody} />
        </section>
      ) : null}

      {interviewNotes.length > 0 ? (
        <section aria-labelledby="ts-sec-interview-notes">
          <DocumentSectionTitle id="ts-sec-interview-notes">{m.interviewNotes}</DocumentSectionTitle>
          <InterviewNotesDocumentEntries items={interviewNotes} />
        </section>
      ) : null}
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
  const noteStr = asObj ? pickInterviewNoteText(asObj) : null
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

export function TechnicalSheetPreview({ payload }: TechnicalSheetPreviewProps) {
  const personal = pickCandidateDisplayRecord(payload)

  const hasCandidate = personal != null && Object.keys(personal).length > 0

  if (!hasCandidate) {
    return (
      <div
        className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-10 text-center shadow-sm"
        role="status"
      >
        <p className="font-sans text-sm font-medium leading-relaxed text-neutral-600">{m.emptyPreview}</p>
      </div>
    )
  }

  const facts = getTechnicalSheetCandidateHeaderFacts(payload)

  return (
    <div className="relative isolate mx-auto max-w-[840px] overflow-hidden bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200/90 [color-scheme:light]">
      <TechnicalSheetDecorTopRight />
      <TechnicalSheetDecorBottomLeft />
      <TechnicalSheetDecorBottomRight />
      <div className="relative z-10 px-8 pb-36 pt-10 sm:px-12 md:px-16 md:pb-40 md:pt-12">
        <header className="mb-12 flex flex-col gap-8 md:mb-14 md:flex-row md:items-start md:justify-between md:gap-8">
          <TechnicalSheetBrandHeader />
          {facts ? (
            <TechnicalSheetPersonalFacts
              fullName={facts.fullName}
              address={facts.address}
              englishLevel={facts.englishLevel}
            />
          ) : null}
        </header>
        <CandidateSectionBlock data={personal} />
      </div>
      <div className="relative z-[2] h-4 w-full shrink-0 bg-[#0f172a]" aria-hidden />
    </div>
  )
}
