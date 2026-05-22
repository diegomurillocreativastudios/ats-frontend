import { apiClient } from "@/lib/api"

const REPORT_BINDINGS_ENDPOINT = "/api/recruiter/report-bindings"

export interface ReportBindingPayload {
  templateId: number | string
  reportKey: string
}

export interface ReportBindingItem {
  templateId: string
  reportKey: string
}

function normalizeTemplateId(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "number" && !Number.isNaN(value)) {
    return String(value)
  }
  return String(value).trim()
}

function extractTemplateIdFromRecord(rec: Record<string, unknown>): string {
  const direct =
    rec.templateId ??
    rec.TemplateId ??
    rec.templateID ??
    rec.documentTemplateId ??
    rec.DocumentTemplateId
  if (direct != null && String(direct).trim() !== "") {
    return normalizeTemplateId(direct)
  }

  const templateRaw = rec.template ?? rec.Template ?? rec.documentTemplate
  if (templateRaw && typeof templateRaw === "object") {
    const templateRec = templateRaw as Record<string, unknown>
    const nestedId = templateRec.id ?? templateRec.Id ?? templateRec.templateId
    if (nestedId != null && String(nestedId).trim() !== "") {
      return normalizeTemplateId(nestedId)
    }
  }

  return ""
}

function coerceBindingItem(raw: unknown): ReportBindingItem | null {
  if (!raw || typeof raw !== "object") return null
  const rec = raw as Record<string, unknown>
  const templateId = extractTemplateIdFromRecord(rec)
  const reportKey = String(rec.reportKey ?? rec.ReportKey ?? rec.key ?? "").trim()
  if (!templateId || !reportKey) return null
  return { templateId, reportKey }
}

function coerceBindingList(raw: unknown): ReportBindingItem[] {
  const single = coerceBindingItem(raw)
  if (single) return [single]

  if (Array.isArray(raw)) {
    return raw
      .map(coerceBindingItem)
      .filter((x): x is ReportBindingItem => x != null)
  }
  if (raw && typeof raw === "object") {
    const rec = raw as Record<string, unknown>
    const list =
      rec.items ??
      rec.Items ??
      rec.rows ??
      rec.Rows ??
      rec.data ??
      rec.Data ??
      rec.bindings ??
      rec.Bindings
    if (Array.isArray(list)) {
      return list
        .map(coerceBindingItem)
        .filter((x): x is ReportBindingItem => x != null)
    }
  }
  return []
}

export function templateIdsMatch(
  left: string | number,
  right: string | number
): boolean {
  const a = normalizeTemplateId(left)
  const b = normalizeTemplateId(right)
  if (!a || !b) return false
  if (a === b) return true
  const na = Number.parseInt(a, 10)
  const nb = Number.parseInt(b, 10)
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na === nb) return true
  return false
}

function getErrorStatus(err: unknown): number {
  return typeof err === "object" && err !== null && "status" in err
    ? Number((err as { status?: number }).status)
    : 0
}

export function isReportBindingDeleteSkippableError(err: unknown): boolean {
  const status = getErrorStatus(err)
  return status === 400 || status === 404
}

export function isReportBindingConflictError(err: unknown): boolean {
  return getErrorStatus(err) === 409
}

export function isReportBindingForbiddenError(err: unknown): boolean {
  return getErrorStatus(err) === 403
}

/**
 * Builds a user-facing message for binding errors, falling back to the
 * server-provided message when nothing more specific applies.
 */
export function describeReportBindingError(err: unknown): string {
  const status = getErrorStatus(err)
  const fallback =
    (err as { message?: string } | null | undefined)?.message ||
    "La plantilla se guardó, pero hubo un problema actualizando el vínculo con el reporte."
  if (status === 403) {
    return "No tienes permisos de Administrador para vincular plantillas con reportes."
  }
  if (status === 404) {
    return "El reporte o la plantilla no existe en el servidor."
  }
  if (status === 409) {
    return "Ese reporte ya está vinculado a otra plantilla. Elige uno distinto del catálogo."
  }
  if (status === 400) {
    return "El servidor rechazó el vínculo: verifica que la plantilla sea de tipo reporte y que el reporte sea válido."
  }
  return fallback
}

/**
 * GET /api/recruiter/report-bindings
 * Returns the binding for a template when one exists.
 */
export async function fetchReportBindingForTemplate(
  templateId: string | number
): Promise<ReportBindingItem | null> {
  const id = String(templateId).trim()
  if (!id) return null
  const raw = await apiClient.get(REPORT_BINDINGS_ENDPOINT)
  const list = coerceBindingList(raw)
  return list.find((item) => templateIdsMatch(item.templateId, id)) ?? null
}

/**
 * POST /api/recruiter/report-bindings
 *
 * Low-level helper for explicit "create" semantics. Prefer
 * {@link saveReportBinding} (which uses PUT as an idempotent upsert) for
 * normal flows.
 */
export async function createReportBinding(
  payload: ReportBindingPayload
): Promise<void> {
  await apiClient.post(REPORT_BINDINGS_ENDPOINT, {
    templateId: payload.templateId,
    reportKey: payload.reportKey,
  })
}

/**
 * PUT /api/recruiter/report-bindings
 *
 * Idempotent upsert keyed by `templateId`: the backend overwrites any
 * existing (or stale/legacy) `reportKey` for that template in-place and
 * only returns 409 when the target `reportKey` is already taken by a
 * *different* template.
 */
export async function replaceReportBinding(
  payload: ReportBindingPayload
): Promise<void> {
  await apiClient.put(REPORT_BINDINGS_ENDPOINT, {
    templateId: payload.templateId,
    reportKey: payload.reportKey,
  })
}

/**
 * DELETE /api/recruiter/report-bindings/{reportKey}
 * Path segment is the report key (not templateId).
 */
export async function deleteReportBinding(reportKey: string): Promise<void> {
  const key = reportKey.trim()
  if (!key) return
  await apiClient.delete(
    `${REPORT_BINDINGS_ENDPOINT}/${encodeURIComponent(key)}`
  )
}

/**
 * Fallback when DELETE by reportKey fails (e.g. legacy keys): ?templateId=
 */
export async function deleteReportBindingByTemplateId(
  templateId: string | number
): Promise<void> {
  const id = String(templateId).trim()
  if (!id) return
  await apiClient.delete(
    `${REPORT_BINDINGS_ENDPOINT}?templateId=${encodeURIComponent(id)}`
  )
}

/**
 * Removes an existing binding before creating a new one.
 */
export async function removeReportBindingForTemplate(input: {
  templateId: string | number
  reportKey: string
}): Promise<void> {
  const hadReportKey = input.reportKey.trim()
  const templateId = input.templateId

  if (hadReportKey) {
    try {
      await deleteReportBinding(hadReportKey)
      return
    } catch (err) {
      if (!isReportBindingDeleteSkippableError(err)) {
        throw err
      }
    }
  }

  try {
    await deleteReportBindingByTemplateId(templateId)
  } catch (err) {
    if (!isReportBindingDeleteSkippableError(err)) {
      throw err
    }
  }
}

/**
 * Creates or updates the binding for a template.
 *
 * The backend exposes `PUT /api/recruiter/report-bindings` as a pure
 * idempotent upsert keyed by `templateId`: a single call covers
 *   - creating a brand new binding,
 *   - re-binding the template to a different (valid, free) report,
 *   - overwriting a stale/legacy `reportKey` left over from previous APIs.
 * It only returns 409 when the target `reportKey` is already owned by a
 * *different* template, so no DELETE+POST dance is needed.
 */
export async function saveReportBinding(
  payload: ReportBindingPayload,
  options?: { hadReportKey?: string }
): Promise<void> {
  const hadReportKey = (options?.hadReportKey ?? "").trim()
  const wantReportKey = payload.reportKey.trim()
  const templateId = payload.templateId

  if (!wantReportKey) {
    if (hadReportKey) {
      await removeReportBindingForTemplate({
        templateId,
        reportKey: hadReportKey,
      })
    }
    return
  }

  if (wantReportKey === hadReportKey) return

  await replaceReportBinding({ templateId, reportKey: wantReportKey })
}
