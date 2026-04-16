import { apiClient } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"

export type InterviewStatus = "Scheduled" | "Completed" | "Cancelled" | "NoShow"

export interface Interview {
  id: string
  vacancyId: string
  candidateProfileId: string
  scheduledAtUtc: string
  durationMinutes: number | null
  /** Valor para PATCH / select (código, id o string legacy). */
  interviewType: string | null
  /** Nombre legible del tipo (p. ej. displayName del API). */
  interviewTypeLabel: string | null
  interviewTypeId: string | null
  interviewerName: string | null
  notes: string | null
  outcome: string | null
  status: InterviewStatus
  /** displayName del estado cuando el API lo envía anidado. */
  statusDisplayName: string | null
  interviewStatusId: string | null
  /** Si el API lo indica, tiene prioridad sobre el enum al decidir si es editable. */
  isStatusTerminal: boolean | null
  createdAtUtc: string | null
  updatedAtUtc: string | null
}

export interface ListInterviewsQuery {
  status?: InterviewStatus
  fromUtc?: string
  toUtc?: string
}

export interface CreateInterviewPayload {
  candidateProfileId: string
  scheduledAtUtc: string
  durationMinutes?: number | null
  interviewType?: string | null
  interviewerName?: string | null
  notes?: string | null
}

export interface PatchInterviewPayload {
  scheduledAtUtc?: string
  durationMinutes?: number | null
  interviewType?: string | null
  interviewerName?: string | null
  notes?: string | null
  status?: InterviewStatus
}

export interface VacancyApplicantOption {
  candidateProfileId: string
  label: string
}

/** Opción para el selector de tipo de entrevista (GET /api/admin/interview-types). */
export interface InterviewTypeOption {
  value: string
  label: string
}

/** Tipo de entrevista con id (admin / CRUD). */
export interface InterviewTypeAdmin {
  id: string
  name: string
  /** Código estable (slug); requerido por el API en POST/PUT. */
  code: string
}

export interface CreateInterviewTypePayload {
  name: string
}

export interface UpdateInterviewTypePayload {
  name: string
  code: string
}

/**
 * Genera un `code` estable a partir del nombre visible (requerido por el API admin).
 */
export function slugifyInterviewTypeCode(displayName: string): string {
  const s = displayName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80)
  return s || "tipo"
}

const STATUS_SET = new Set<string>(["Scheduled", "Completed", "Cancelled", "NoShow"])

function pickString(
  raw: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const k of keys) {
    const v = raw[k]
    if (v != null && String(v).trim() !== "") return String(v).trim()
  }
  return null
}

function pickNumber(
  raw: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const k of keys) {
    const v = raw[k]
    if (typeof v === "number" && Number.isFinite(v)) return v
    if (typeof v === "string" && v.trim() !== "") {
      const n = parseInt(v, 10)
      if (Number.isFinite(n)) return n
    }
  }
  return null
}

function pickBool(
  raw: Record<string, unknown>,
  keys: string[],
  defaultValue = false
): boolean {
  for (const k of keys) {
    if (!(k in raw)) continue
    const v = raw[k]
    if (typeof v === "boolean") return v
    if (v === "true" || v === 1 || v === "1") return true
    if (v === "false" || v === 0 || v === "0") return false
  }
  return defaultValue
}

function normalizeStatus(value: unknown): InterviewStatus {
  const s = value != null ? String(value).trim() : ""
  if (STATUS_SET.has(s)) return s as InterviewStatus
  const lower = s.toLowerCase()
  if (lower === "scheduled") return "Scheduled"
  if (lower === "completed") return "Completed"
  if (lower === "cancelled" || lower === "canceled") return "Cancelled"
  if (lower === "noshow" || lower === "no_show" || lower === "no-show") return "NoShow"
  return "Scheduled"
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function pickInterviewTypeMeta(r: Record<string, unknown>): {
  typeValue: string | null
  typeLabel: string | null
  typeId: string | null
} {
  const typeIdRoot =
    pickString(r, ["interviewTypeId", "interview_type_id"]) ?? null
  const direct = r.interviewType ?? r.interview_type
  if (typeof direct === "string" && direct.trim()) {
    const s = direct.trim()
    return {
      typeId: typeIdRoot,
      typeValue: s,
      typeLabel: s,
    }
  }
  const nested = asRecord(direct)
  if (nested) {
    const nestedId = pickString(nested, ["id", "uuid"])
    const code = pickString(nested, ["code", "key"])
    const display =
      pickString(nested, [
        "displayName",
        "display_name",
        "name",
        "label",
        "title",
      ]) ?? null
    const id = nestedId ?? typeIdRoot
    const label = display ?? code ?? nestedId ?? typeIdRoot
    const value = code ?? typeIdRoot ?? nestedId ?? display
    return {
      typeId: id,
      typeValue: value,
      typeLabel: label,
    }
  }
  const fromType = pickString(r, ["type"])
  return {
    typeId: typeIdRoot,
    typeValue: fromType,
    typeLabel: fromType,
  }
}

function mapInterviewStatusFromCodeOrLabel(raw: string): InterviewStatus {
  const trimmed = raw.trim()
  if (STATUS_SET.has(trimmed)) return trimmed as InterviewStatus
  const normalized = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
  if (
    normalized === "scheduled" ||
    normalized === "programada" ||
    normalized === "programado"
  ) {
    return "Scheduled"
  }
  if (
    normalized === "completed" ||
    normalized === "completada" ||
    normalized === "completado"
  ) {
    return "Completed"
  }
  if (
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "cancelada" ||
    normalized === "cancelado"
  ) {
    return "Cancelled"
  }
  if (
    normalized === "noshow" ||
    normalized === "no_show" ||
    normalized === "no_asistio" ||
    normalized === "no_asistió"
  ) {
    return "NoShow"
  }
  return "Scheduled"
}

function normalizeInterviewStatusMeta(r: Record<string, unknown>): {
  status: InterviewStatus
  statusDisplayName: string | null
  interviewStatusId: string | null
  isStatusTerminal: boolean | null
} {
  const rootStatusId =
    pickString(r, ["interviewStatusId", "interview_status_id"]) ?? null
  const s = r.status ?? r.Status
  const nested = asRecord(s)
  if (nested) {
    const code = pickString(nested, ["code", "key"]) ?? ""
    const displayName =
      pickString(nested, [
        "displayName",
        "display_name",
        "name",
        "label",
      ]) ?? null
    const id = pickString(nested, ["id", "uuid"]) ?? rootStatusId
    let isTerminal: boolean | null = null
    if (typeof nested.isTerminal === "boolean") isTerminal = nested.isTerminal
    else if (typeof nested.is_terminal === "boolean") {
      isTerminal = nested.is_terminal as boolean
    }
    const mapped = mapInterviewStatusFromCodeOrLabel(
      code || displayName || ""
    )
    return {
      status: mapped,
      statusDisplayName: displayName,
      interviewStatusId: id,
      isStatusTerminal: isTerminal,
    }
  }
  return {
    status: normalizeStatus(s),
    statusDisplayName: null,
    interviewStatusId: rootStatusId,
    isStatusTerminal: null,
  }
}

export function normalizeInterview(raw: unknown): Interview {
  const r = asRecord(raw) ?? {}
  const id =
    pickString(r, ["id", "uuid", "interviewId", "interview_id"]) ?? ""
  const vacancyId =
    pickString(r, ["vacancyId", "vacancy_id", "VacancyId"]) ?? ""
  const candidateProfileId =
    pickString(r, [
      "candidateProfileId",
      "candidate_profile_id",
      "CandidateProfileId",
    ]) ?? ""
  const scheduledAtUtc =
    pickString(r, [
      "scheduledAtUtc",
      "scheduled_at_utc",
      "ScheduledAtUtc",
      "scheduledAt",
    ]) ?? ""
  const typeMeta = pickInterviewTypeMeta(r)
  const statusMeta = normalizeInterviewStatusMeta(r)
  return {
    id,
    vacancyId,
    candidateProfileId,
    scheduledAtUtc,
    durationMinutes: pickNumber(r, ["durationMinutes", "duration_minutes"]),
    interviewType: typeMeta.typeValue,
    interviewTypeLabel: typeMeta.typeLabel,
    interviewTypeId: typeMeta.typeId,
    interviewerName: pickString(r, [
      "interviewerName",
      "interviewer_name",
      "interviewer",
    ]),
    notes: pickString(r, ["notes", "Notes"]),
    outcome: pickString(r, ["outcome", "Outcome"]),
    status: statusMeta.status,
    statusDisplayName: statusMeta.statusDisplayName,
    interviewStatusId: statusMeta.interviewStatusId,
    isStatusTerminal: statusMeta.isStatusTerminal,
    createdAtUtc: pickString(r, ["createdAtUtc", "created_at_utc"]),
    updatedAtUtc: pickString(r, ["updatedAtUtc", "updated_at_utc"]),
  }
}

function normalizeInterviewList(data: unknown): Interview[] {
  if (Array.isArray(data)) return data.map((item) => normalizeInterview(item))
  const r = asRecord(data)
  const arr = r?.items ?? r?.interviews ?? r?.data
  if (Array.isArray(arr)) return arr.map((item) => normalizeInterview(item))
  return []
}

function buildQueryString(q: ListInterviewsQuery): string {
  const params = new URLSearchParams()
  if (q.status) params.set("status", q.status)
  if (q.fromUtc) params.set("fromUtc", q.fromUtc)
  if (q.toUtc) params.set("toUtc", q.toUtc)
  const s = params.toString()
  return s ? `?${s}` : ""
}

/** Mensaje UX según código HTTP y cuerpo de error del API. */
export function getInterviewHttpErrorMessage(
  status: number,
  err: unknown
): string {
  const detail = getApiErrorMessage(err)
  if (status === 400) {
    return detail !== "Error desconocido"
      ? detail
      : "Los datos enviados no son válidos. Revisa fechas y campos obligatorios."
  }
  if (status === 403) {
    return "No tienes permiso para realizar esta acción."
  }
  if (status === 404) {
    return detail !== "Error desconocido"
      ? detail
      : "No se encontró el recurso solicitado."
  }
  if (status === 409) {
    return detail !== "Error desconocido"
      ? detail
      : "Conflicto con el estado actual. Vuelve a cargar e inténtalo de nuevo."
  }
  return detail
}

export async function getInterviewsByVacancy(
  vacancyId: string,
  query: ListInterviewsQuery = {}
): Promise<Interview[]> {
  const qs = buildQueryString(query)
  const data = await apiClient.get(
    `/api/recruiter/vacancies/${encodeURIComponent(vacancyId)}/interviews${qs}`
  )
  return normalizeInterviewList(data)
}

export async function getInterviewsByCandidate(
  candidateProfileId: string,
  query: ListInterviewsQuery = {}
): Promise<Interview[]> {
  const qs = buildQueryString(query)
  const data = await apiClient.get(
    `/api/recruiter/candidates/${encodeURIComponent(candidateProfileId)}/interviews${qs}`
  )
  return normalizeInterviewList(data)
}

export async function getInterviewById(interviewId: string): Promise<Interview> {
  const data = await apiClient.get(
    `/api/recruiter/interviews/${encodeURIComponent(interviewId)}`
  )
  return normalizeInterview(data)
}

/**
 * Si el backend no expone GET por id, busca en el listado de la vacante (requiere vacancyId).
 */
export async function getInterviewResolved(
  interviewId: string,
  vacancyId: string | null
): Promise<Interview> {
  try {
    return await getInterviewById(interviewId)
  } catch (err: unknown) {
    const status = typeof err === "object" && err !== null && "status" in err
      ? (err as { status?: number }).status
      : undefined
    if (status === 404 && vacancyId) {
      const list = await getInterviewsByVacancy(vacancyId)
      const found = list.find((i) => i.id === interviewId)
      if (found) return found
    }
    throw err
  }
}

export async function createInterview(
  vacancyId: string,
  payload: CreateInterviewPayload
): Promise<Interview> {
  const data = await apiClient.post(
    `/api/recruiter/vacancies/${encodeURIComponent(vacancyId)}/interviews`,
    payload
  )
  return normalizeInterview(data)
}

export async function patchInterview(
  interviewId: string,
  payload: PatchInterviewPayload
): Promise<Interview> {
  const data = await apiClient.patch(
    `/api/recruiter/interviews/${encodeURIComponent(interviewId)}`,
    payload
  )
  return normalizeInterview(data)
}

/**
 * Candidatos vinculados a la vacante (postulantes en pipeline), para el selector de alta.
 * Usa el mismo GET de vacante que el kanban.
 */
function normalizeInterviewTypes(data: unknown): InterviewTypeOption[] {
  const rawList: unknown[] = []
  if (Array.isArray(data)) rawList.push(...data)
  else {
    const r = asRecord(data)
    const nested =
      r?.data ?? r?.items ?? r?.interviewTypes ?? r?.types ?? r?.results
    if (Array.isArray(nested)) rawList.push(...nested)
  }
  const options: InterviewTypeOption[] = []
  const seen = new Set<string>()
  rawList.forEach((item) => {
    if (typeof item === "string") {
      const v = item.trim()
      if (!v || seen.has(v)) return
      seen.add(v)
      options.push({ value: v, label: v })
      return
    }
    const o = asRecord(item)
    if (!o) return
    const value =
      pickString(o, [
        "value",
        "code",
        "id",
        "name",
        "label",
        "key",
        "interviewType",
        "interview_type",
      ]) ?? ""
    if (!value || seen.has(value)) return
    seen.add(value)
    const label =
      pickString(o, [
        "label",
        "name",
        "displayName",
        "display_name",
        "title",
      ]) ?? value
    options.push({ value, label })
  })
  return options
}

function normalizeInterviewTypeAdminItem(
  raw: unknown
): InterviewTypeAdmin | null {
  if (typeof raw === "string") {
    const s = raw.trim()
    if (!s) return null
    return { id: s, name: s, code: slugifyInterviewTypeCode(s) }
  }
  const o = asRecord(raw)
  if (!o) return null
  const id = pickString(o, [
    "id",
    "uuid",
    "interviewTypeId",
    "interview_type_id",
  ])
  const name =
    pickString(o, [
      "displayName",
      "display_name",
      "name",
      "label",
      "title",
    ]) ?? ""
  const rawCode = pickString(o, ["code", "key", "slug", "value"])
  const code =
    (rawCode && rawCode.trim()) || slugifyInterviewTypeCode(name)
  if (!id || !name.trim()) return null
  return { id, name: name.trim(), code }
}

function normalizeInterviewTypesAdminList(data: unknown): InterviewTypeAdmin[] {
  const rawList: unknown[] = []
  if (Array.isArray(data)) rawList.push(...data)
  else {
    const r = asRecord(data)
    const nested =
      r?.data ?? r?.items ?? r?.interviewTypes ?? r?.types ?? r?.results
    if (Array.isArray(nested)) rawList.push(...nested)
  }
  const out: InterviewTypeAdmin[] = []
  rawList.forEach((item) => {
    const rec = normalizeInterviewTypeAdminItem(item)
    if (rec) out.push(rec)
  })
  return out
}

function normalizeInterviewTypeAdminResponse(
  raw: unknown
): InterviewTypeAdmin | null {
  return normalizeInterviewTypeAdminItem(raw)
}

/**
 * Catálogo de tipos de entrevista (admin).
 * Respuesta flexible: array de strings u objetos con name/label/value.
 */
export async function fetchInterviewTypes(): Promise<InterviewTypeOption[]> {
  const data = await apiClient.get("/api/admin/interview-types")
  return normalizeInterviewTypes(data)
}

/** Listado para CRUD (mismo GET; objetos con id y nombre). */
export async function listInterviewTypesAdmin(): Promise<InterviewTypeAdmin[]> {
  const data = await apiClient.get("/api/admin/interview-types")
  return normalizeInterviewTypesAdminList(data)
}

export async function createInterviewType(
  payload: CreateInterviewTypePayload
): Promise<InterviewTypeAdmin> {
  const displayName = payload.name.trim()
  const code = slugifyInterviewTypeCode(displayName)
  const data = await apiClient.post("/api/admin/interview-types", {
    code,
    displayName,
  })
  const rec = normalizeInterviewTypeAdminResponse(data)
  if (!rec) {
    return {
      id: "",
      name: displayName,
      code,
    }
  }
  return rec
}

export async function updateInterviewType(
  id: string,
  payload: UpdateInterviewTypePayload
): Promise<InterviewTypeAdmin> {
  const displayName = payload.name.trim()
  const code = payload.code.trim()
  const data = await apiClient.put(
    `/api/admin/interview-types/${encodeURIComponent(id)}`,
    { code, displayName }
  )
  const rec = normalizeInterviewTypeAdminResponse(data)
  if (!rec) {
    return { id, name: displayName, code }
  }
  return rec
}

export async function deleteInterviewType(id: string): Promise<void> {
  await apiClient.delete(
    `/api/admin/interview-types/${encodeURIComponent(id)}`
  )
}

/** Catálogo admin de estados de entrevista (GET /api/admin/interview-statuses). */
export interface InterviewStatusAdmin {
  id: string
  code: string
  displayName: string
  description: string | null
  sortOrder: number
  isTerminal: boolean
  isActive: boolean
}

export interface CreateInterviewStatusPayload {
  code: string
  displayName: string
  description?: string | null
  isTerminal: boolean
  isActive: boolean
}

export interface UpdateInterviewStatusPayload {
  code?: string
  displayName?: string
  description?: string | null
  sortOrder?: number
  isTerminal?: boolean
  isActive?: boolean
}

function normalizeInterviewStatusAdminItem(
  raw: unknown
): InterviewStatusAdmin | null {
  const o = asRecord(raw)
  if (!o) return null
  const id = pickString(o, ["id", "uuid"])
  const code = pickString(o, ["code", "key"])
  if (!id || !code) return null
  const displayName =
    pickString(o, ["displayName", "display_name", "name", "label"]) ?? code
  const description = pickString(o, ["description", "Description"])
  const sortOrder = pickNumber(o, ["sortOrder", "sort_order"]) ?? 0
  return {
    id,
    code: code.trim(),
    displayName: displayName.trim(),
    description: description ?? null,
    sortOrder,
    isTerminal: pickBool(o, ["isTerminal", "is_terminal"], false),
    isActive: pickBool(o, ["isActive", "is_active"], true),
  }
}

function normalizeInterviewStatusesAdminList(
  data: unknown
): InterviewStatusAdmin[] {
  const rawList: unknown[] = []
  if (Array.isArray(data)) rawList.push(...data)
  else {
    const r = asRecord(data)
    const nested =
      r?.data ??
      r?.items ??
      r?.interviewStatuses ??
      r?.statuses ??
      r?.results
    if (Array.isArray(nested)) rawList.push(...nested)
  }
  const out: InterviewStatusAdmin[] = []
  rawList.forEach((item) => {
    const rec = normalizeInterviewStatusAdminItem(item)
    if (rec) out.push(rec)
  })
  return out.sort((a, b) => {
    const na = parseInt(String(a.code).trim(), 10)
    const nb = parseInt(String(b.code).trim(), 10)
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) {
      return na - nb
    }
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.code.localeCompare(b.code)
  })
}

export async function listInterviewStatusesAdmin(): Promise<
  InterviewStatusAdmin[]
> {
  const data = await apiClient.get("/api/admin/interview-statuses")
  return normalizeInterviewStatusesAdminList(data)
}

export async function getInterviewStatusAdmin(
  id: string
): Promise<InterviewStatusAdmin> {
  const data = await apiClient.get(
    `/api/admin/interview-statuses/${encodeURIComponent(id)}`
  )
  const rec = normalizeInterviewStatusAdminItem(data)
  if (!rec) {
    throw new Error("Respuesta inválida al obtener estado de entrevista")
  }
  return rec
}

export async function createInterviewStatus(
  payload: CreateInterviewStatusPayload
): Promise<InterviewStatusAdmin> {
  const codeTrim = payload.code.trim()
  const codeNum = parseInt(codeTrim, 10)
  const sortOrder =
    Number.isFinite(codeNum) && codeNum >= 1 ? codeNum : 1
  const body = {
    code: codeTrim,
    displayName: payload.displayName.trim(),
    description:
      payload.description != null && String(payload.description).trim() !== ""
        ? String(payload.description).trim()
        : null,
    sortOrder,
    isTerminal: payload.isTerminal,
    isActive: payload.isActive,
  }
  const data = await apiClient.post("/api/admin/interview-statuses", body)
  const rec = normalizeInterviewStatusAdminItem(data)
  if (!rec) {
    return {
      id: "",
      code: body.code,
      displayName: body.displayName,
      description: body.description,
      sortOrder: body.sortOrder,
      isTerminal: body.isTerminal,
      isActive: body.isActive,
    }
  }
  return rec
}

export async function updateInterviewStatus(
  id: string,
  payload: UpdateInterviewStatusPayload
): Promise<InterviewStatusAdmin> {
  const data = await apiClient.patch(
    `/api/admin/interview-statuses/${encodeURIComponent(id)}`,
    payload
  )
  const rec = normalizeInterviewStatusAdminItem(data)
  if (!rec) {
    throw new Error("Respuesta inválida al actualizar estado de entrevista")
  }
  return rec
}

export async function deleteInterviewStatus(id: string): Promise<void> {
  await apiClient.delete(
    `/api/admin/interview-statuses/${encodeURIComponent(id)}`
  )
}

export interface RecruiterVacancySummary {
  title: string | null
  applicantOptions: VacancyApplicantOption[]
}

function parseRecruiterVacancyPayload(data: unknown): RecruiterVacancySummary {
  const r = asRecord(data)
  const title =
    pickString(r, ["title", "name", "jobTitle", "job_title"]) ?? null
  const applicants = Array.isArray(r?.applicants) ? r.applicants : []
  const options: VacancyApplicantOption[] = []
  applicants.forEach((item, index) => {
    const a = asRecord(item)
    if (!a) return
    const profileId = pickString(a, [
      "candidateProfileId",
      "candidate_profile_id",
    ])
    if (!profileId) return
    const name =
      pickString(a, ["name", "fullName", "full_name"]) ?? `Candidato ${index + 1}`
    const email = pickString(a, ["email", "Email"]) ?? ""
    const label = email ? `${name} · ${email}` : name
    options.push({ candidateProfileId: profileId, label })
  })
  const seen = new Set<string>()
  const applicantOptions = options.filter((o) => {
    if (seen.has(o.candidateProfileId)) return false
    seen.add(o.candidateProfileId)
    return true
  })
  return { title, applicantOptions }
}

export async function fetchRecruiterVacancySummary(
  vacancyId: string
): Promise<RecruiterVacancySummary> {
  const data = await apiClient.get(
    `/api/recruiter/vacancies/${encodeURIComponent(vacancyId)}`
  )
  return parseRecruiterVacancyPayload(data)
}

export async function fetchVacancyApplicantOptions(
  vacancyId: string
): Promise<VacancyApplicantOption[]> {
  const s = await fetchRecruiterVacancySummary(vacancyId)
  return s.applicantOptions
}

export function isTerminalInterviewStatus(status: InterviewStatus): boolean {
  return status === "Completed" || status === "Cancelled" || status === "NoShow"
}

/** Cierra edición si el API marcó estado terminal o el enum lo indica. */
export function isInterviewTerminal(
  i: Pick<Interview, "status" | "isStatusTerminal">
): boolean {
  if (typeof i.isStatusTerminal === "boolean") return i.isStatusTerminal
  return isTerminalInterviewStatus(i.status)
}
