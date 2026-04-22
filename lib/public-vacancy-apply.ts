import { apiClient } from "@/lib/api"

export interface PublicVacancyApplyValues {
  firstName: string
  lastName: string
  email: string
  phone?: string
  linkedinUrl?: string
  websiteUrl?: string
  source?: string
  notes?: string
  cvFile: File
}

export interface PublicVacancyApplySuccess {
  message: string
}

function getRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

/** Extrae mapa campo → mensaje desde cuerpos típicos de validación .NET / ASP.NET. */
export function parsePublicApplyFieldErrors(body: unknown): Record<string, string> {
  const record = getRecord(body)
  if (!record) return {}

  const errorsRaw = record.errors ?? record.Errors
  if (errorsRaw && typeof errorsRaw === "object" && !Array.isArray(errorsRaw)) {
    const out: Record<string, string> = {}
    for (const [key, val] of Object.entries(errorsRaw as Record<string, unknown>)) {
      if (Array.isArray(val) && val[0] != null) {
        out[key] = String(val[0])
      } else if (typeof val === "string") {
        out[key] = val
      }
    }
    if (Object.keys(out).length) return out
  }

  const fieldErrors = record.fieldErrors ?? record.field_errors
  if (fieldErrors && typeof fieldErrors === "object" && !Array.isArray(fieldErrors)) {
    const out: Record<string, string> = {}
    for (const [key, val] of Object.entries(fieldErrors as Record<string, unknown>)) {
      if (typeof val === "string") out[key] = val
      else if (Array.isArray(val) && val[0] != null) out[key] = String(val[0])
    }
    return out
  }

  return {}
}

export function getPublicApplyErrorMessage(status: number, body: unknown): string {
  if (status === 404) return "La vacante ya no está disponible."
  if (status === 409) return "Ya te has postulado a esta vacante."
  if (status === 415) {
    const record = getRecord(body)
    const fromApi =
      record &&
      typeof record.message === "string" &&
      record.message.trim() !== ""
        ? record.message.trim()
        : null
    return fromApi ?? "El archivo debe estar en formato PDF."
  }
  return "No pudimos procesar tu postulación en este momento. Intenta nuevamente."
}

export function isValidEmailFormat(email: string): boolean {
  const t = email.trim()
  if (!t) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}

export function isPdfFile(file: File): boolean {
  const name = (file.name ?? "").toLowerCase()
  if (name.endsWith(".pdf")) return true
  return file.type === "application/pdf"
}

export function buildPublicApplyFormData(values: PublicVacancyApplyValues): FormData {
  const fd = new FormData()
  fd.append("firstName", values.firstName.trim())
  fd.append("lastName", values.lastName.trim())
  fd.append("email", values.email.trim())
  fd.append("phone", values.phone?.trim() ?? "")
  fd.append("linkedinUrl", values.linkedinUrl?.trim() ?? "")
  fd.append("websiteUrl", values.websiteUrl?.trim() ?? "")
  fd.append("source", values.source?.trim() ?? "")
  fd.append("notes", values.notes?.trim() ?? "")
  fd.append("cvFile", values.cvFile)
  return fd
}

export async function submitPublicVacancyApplication(
  vacancyId: string,
  values: PublicVacancyApplyValues
): Promise<PublicVacancyApplySuccess> {
  const id = encodeURIComponent(vacancyId)
  const data = (await apiClient.postFormData(
    `/api/vacantes/${id}/apply`,
    buildPublicApplyFormData(values)
  )) as Record<string, unknown>
  const message =
    typeof data.message === "string" && data.message.trim()
      ? data.message.trim()
      : "Te has postulado a la vacante exitosamente"
  return { message }
}
