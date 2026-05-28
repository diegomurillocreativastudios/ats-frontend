import { apiClient } from "@/lib/api"

export interface PublicVacancyApplyValues {
  firstName: string
  lastName: string
  email: string
  phone?: string
  documentTypeId?: string
  nationalId?: string
  linkedinUrl?: string
  websiteUrl?: string
  source?: string
  notes?: string
  cvFile: File
}

export interface PublicVacancyApplySuccess {
  message: string
}

interface CandidatePersonalAppliancePayload {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  documentTypeId?: string
  nationalId?: string
  linkedinUrl: string
  websiteUrl: string
  source: string
  notes: string
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
  if (status === 403) {
    return "El correo ingresado debe coincidir con tu cuenta de candidato."
  }
  if (status === 404) return "La vacante ya no está disponible."
  if (status === 422) {
    const record = getRecord(body)
    const fromApi =
      record &&
      typeof record.message === "string" &&
      record.message.trim() !== ""
        ? record.message.trim()
        : null
    return (
      fromApi ??
      "No pudimos procesar el CV para esta vacante. Verifica el archivo e intenta nuevamente."
    )
  }
  if (status === 415) {
    const record = getRecord(body)
    const fromApi =
      record &&
      typeof record.message === "string" &&
      record.message.trim() !== ""
        ? record.message.trim()
        : null
    return fromApi ?? "El archivo debe estar en formato PDF o DOCX."
  }
  return "No pudimos procesar tu postulación en este momento. Intenta nuevamente."
}

export function isValidEmailFormat(email: string): boolean {
  const t = email.trim()
  if (!t) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}

export function isAllowedCvFile(file: File): boolean {
  const name = (file.name ?? "").toLowerCase()
  if (name.endsWith(".pdf")) return true
  if (name.endsWith(".docx")) return true
  return file.type === "application/pdf"
}

export function buildPublicApplyFormData(
  vacancyId: string,
  values: PublicVacancyApplyValues
): FormData {
  const fd = new FormData()
  const candidate: CandidatePersonalAppliancePayload = {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim(),
    phoneNumber: values.phone?.trim() ?? "",
    linkedinUrl: values.linkedinUrl?.trim() ?? "",
    websiteUrl: values.websiteUrl?.trim() ?? "",
    source: values.source?.trim() ?? "",
    notes: values.notes?.trim() ?? "",
  }

  if (values.documentTypeId?.trim()) {
    candidate.documentTypeId = values.documentTypeId.trim()
  }
  
  if (values.nationalId?.trim()) {
    candidate.nationalId = values.nationalId.trim()
  }

  fd.append("vacancyId", vacancyId.trim())
  fd.append("cvFile", values.cvFile)
  fd.append("candidate", JSON.stringify(candidate))
  return fd
}

export async function submitPublicVacancyApplication(
  vacancyId: string,
  values: PublicVacancyApplyValues
): Promise<PublicVacancyApplySuccess> {
  const data = await apiClient.postFormData(
    "/api/candidate/personal-appliance",
    buildPublicApplyFormData(vacancyId, values)
  )
  const message =
    typeof data === "string" && data.trim()
      ? data.trim()
      : "Application pipeline executed successfully."
  return { message }
}
