/**
 * Parser operativo para la revisión rápida de candidatos en Entrevistas (MVP).
 *
 * Contrato `GET /api/recruiter/vacancies/{vacancyId}` (solo lectura; no copiar JSX desde vacantes):
 * - **Filas:** se toma el arreglo `applicants` (postulantes en tablero). No se mezclan `aiMatchSuggestions` / `matches` en el MVP.
 * - **Nombre:** `name`, `fullName`, `full_name` + fallback con email.
 * - **Etapa actual:** `applicationStage`, `stage` (string legible tal cual envía el API).
 * - **Estado de postulación (referencia):** `applicationStatus`, `status`, `statusName`, `application_status_name` (texto auxiliar; la columna principal de “entrevista” viene del cruce con entrevistas).
 * - **Fortalezas / consideraciones:** `qualitativeReasoningPositive`, `qualitativeReasoningNegative`; fallback legado `qualitativeReasoning` → si no hay positivo/negativo, puede mapearse solo a comentarios o dividirse en una sola cadena según negocio; aquí el legado se asigna a `relevantComments` si los otros están vacíos.
 * - **Comentarios relevantes:** primer valor no vacío entre `notes`, `applicationNotes`, `application_notes`, `recruiterNotes`, `comments`, `comment`, `internalNotes`, `hrNotes`; si sigue vacío y existe `qualitativeReasoning` sin positivo/negativo, se usa como contexto textual.
 *
 * Si el payload completo de vacante resulta pesado en producción, valorar endpoint liviano documentado en `useVacancyInterviewPrep`.
 */

import type { Interview, InterviewStatus } from "@/lib/api/interviews"
import type { VacancyApplicantLike } from "@/lib/rrhh/vacancy-pipeline-stats"

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function pickString(
  raw: Record<string, unknown> | null,
  keys: string[]
): string | null {
  if (!raw) return null
  for (const k of keys) {
    const v = raw[k]
    if (v != null && String(v).trim() !== "") return String(v).trim()
  }
  return null
}

const STATUS_LABEL_ES: Record<InterviewStatus, string> = {
  Scheduled: "Programada",
  Completed: "Completada",
  Cancelled: "Cancelada",
  NoShow: "No asistió",
}

export interface InterviewPrepApplicantRow {
  candidateProfileId: string
  displayName: string
  /** Etapa del proceso (tablero). */
  stageLabel: string | null
  /** Estado de postulación si el API lo expone como texto. */
  applicationStatusLabel: string | null
  strengths: string | null
  considerations: string | null
  relevantComments: string | null
}

export interface InterviewPrepRow extends InterviewPrepApplicantRow {
  interviewSummaryLabel: string | null
  interviewOutcome: string | null
  lastInterview: {
    id: string
    scheduledAtUtc: string
    status: InterviewStatus
    statusDisplayName: string | null
    outcome: string | null
  } | null
}

export interface VacancyInterviewPrepParseResult {
  vacancyTitle: string | null
  applicants: InterviewPrepApplicantRow[]
}

function buildDisplayName(
  a: Record<string, unknown>,
  index: number
): string {
  const name =
    pickString(a, ["name", "fullName", "full_name"]) ??
    `Candidato ${index + 1}`
  const email = pickString(a, ["email", "Email"])
  if (email) return `${name} · ${email}`
  return name
}

function pickQualitativePositive(a: Record<string, unknown>): string | null {
  return pickString(a, [
    "qualitativeReasoningPositive",
    "qualitative_reasoning_positive",
  ])
}

function pickQualitativeNegative(a: Record<string, unknown>): string | null {
  return pickString(a, [
    "qualitativeReasoningNegative",
    "qualitative_reasoning_negative",
  ])
}

function pickQualitativeLegacy(a: Record<string, unknown>): string | null {
  return pickString(a, [
    "qualitativeReasoning",
    "qualitative_reasoning",
  ])
}

function pickRelevantComments(
  a: Record<string, unknown>,
  strengths: string | null,
  considerations: string | null
): string | null {
  const direct = pickString(a, [
    "notes",
    "applicationNotes",
    "application_notes",
    "recruiterNotes",
    "recruiter_notes",
    "comments",
    "comment",
    "internalNotes",
    "internal_notes",
    "hrNotes",
    "hr_notes",
    "applicationComment",
    "application_comment",
  ])
  if (direct) return direct
  const legacy = pickQualitativeLegacy(a)
  if (!legacy) return null
  if (strengths || considerations) return null
  return legacy
}

function parseApplicantRecordToPrepRow(
  a: Record<string, unknown>,
  index: number
): InterviewPrepApplicantRow | null {
  const profileId = pickString(a, [
    "candidateProfileId",
    "candidate_profile_id",
  ])
  if (!profileId) return null
  const strengths = pickQualitativePositive(a)
  const considerations = pickQualitativeNegative(a)
  const relevantComments = pickRelevantComments(a, strengths, considerations)
  return {
    candidateProfileId: profileId,
    displayName: buildDisplayName(a, index),
    stageLabel:
      pickString(a, ["applicationStage", "application_stage", "stage"]) ?? null,
    applicationStatusLabel:
      pickString(a, [
        "applicationStatus",
        "application_status",
        "statusName",
        "status_name",
        "status",
      ]) ?? null,
    strengths,
    considerations,
    relevantComments,
  }
}

/**
 * Misma proyección que `parseVacancyInterviewPrepPayload` pero desde filas ya tipadas
 * del view-model de resultados (evita un segundo fetch a la misma vacante).
 */
export function interviewPrepRowsFromVacancyApplicants(
  applicants: VacancyApplicantLike[]
): InterviewPrepApplicantRow[] {
  const seen = new Set<string>()
  const out: InterviewPrepApplicantRow[] = []
  applicants.forEach((item, index) => {
    const a = asRecord(item as unknown)
    if (!a) return
    const row = parseApplicantRecordToPrepRow(a, index)
    if (!row) return
    if (seen.has(row.candidateProfileId)) return
    seen.add(row.candidateProfileId)
    out.push(row)
  })
  return out
}

/**
 * Extrae postulantes (`applicants`) y metadatos mínimos del JSON de vacante.
 */
export function parseVacancyInterviewPrepPayload(
  payload: unknown
): VacancyInterviewPrepParseResult {
  const r = asRecord(payload)
  const vacancyTitle =
    pickString(r, ["title", "name", "jobTitle", "job_title"]) ?? null
  const applicantsRaw = Array.isArray(r?.applicants) ? r.applicants : []
  const seen = new Set<string>()
  const applicants: InterviewPrepApplicantRow[] = []

  applicantsRaw.forEach((item, index) => {
    const a = asRecord(item)
    if (!a) return
    const profileId = pickString(a, [
      "candidateProfileId",
      "candidate_profile_id",
    ])
    if (!profileId) return
    if (seen.has(profileId)) return
    seen.add(profileId)
    const row = parseApplicantRecordToPrepRow(a, index)
    if (row) applicants.push(row)
  })

  return { vacancyTitle, applicants }
}

/** Positivo si `a` es más reciente que `b` (por `scheduledAtUtc`). */
function compareScheduledDesc(a: Interview, b: Interview): number {
  const ta = Date.parse(a.scheduledAtUtc)
  const tb = Date.parse(b.scheduledAtUtc)
  if (Number.isNaN(ta) && Number.isNaN(tb)) return 0
  if (Number.isNaN(ta)) return -1
  if (Number.isNaN(tb)) return 1
  return ta - tb
}

/**
 * Por candidato, conserva la entrevista con `scheduledAtUtc` más reciente (empate: primera del orden estable del API).
 */
export function pickLatestInterviewByCandidate(
  interviews: Interview[]
): Map<string, Interview> {
  const map = new Map<string, Interview>()
  for (const row of interviews) {
    const id = String(row.candidateProfileId ?? "").trim()
    if (!id) continue
    const prev = map.get(id)
    if (!prev) {
      map.set(id, row)
      continue
    }
    if (compareScheduledDesc(row, prev) <= 0) continue
    map.set(id, row)
  }
  return map
}

function interviewStatusLabel(i: Interview): string {
  const custom =
    typeof i.statusDisplayName === "string" && i.statusDisplayName.trim() !== ""
      ? i.statusDisplayName.trim()
      : null
  if (custom) return custom
  return STATUS_LABEL_ES[i.status] ?? i.status
}

/**
 * Combina filas de vacante con el último snapshot de entrevista por candidato.
 */
export function mergeApplicantsWithInterviews(
  applicants: InterviewPrepApplicantRow[],
  interviews: Interview[]
): InterviewPrepRow[] {
  const latest = pickLatestInterviewByCandidate(interviews)
  return applicants.map((a) => {
    const li = latest.get(a.candidateProfileId) ?? null
    if (!li) {
      return {
        ...a,
        interviewSummaryLabel: "Sin entrevistas previas",
        interviewOutcome: null,
        lastInterview: null,
      }
    }
    const statusPart = interviewStatusLabel(li)
    const outcomePart =
      li.outcome != null && String(li.outcome).trim() !== ""
        ? String(li.outcome).trim()
        : null
    const summary =
      outcomePart != null ? `${statusPart} · ${outcomePart}` : statusPart
    return {
      ...a,
      interviewSummaryLabel: summary,
      interviewOutcome: outcomePart,
      lastInterview: {
        id: li.id,
        scheduledAtUtc: li.scheduledAtUtc,
        status: li.status,
        statusDisplayName: li.statusDisplayName,
        outcome: li.outcome,
      },
    }
  })
}
