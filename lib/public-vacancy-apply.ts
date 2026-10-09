import { apiClient } from "@/lib/api"
import type { CandidateAuthConsentSubmitBody } from "@/lib/candidate-auth-consent"
import {
  CV_OUTPUT_LANGUAGE_FIELD,
  type CvOutputLanguage,
} from "@/lib/cv-output-language"
import { MIME_PDF, UPLOAD_MAX_BYTES_15_MB } from "@/lib/upload-constraints"

/** Límite alineado con backend security-hardening (CV ≤ 15 MB). */
export const PUBLIC_CV_MAX_BYTES = UPLOAD_MAX_BYTES_15_MB

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
  /** Evidencia de consent and auth aceptada antes de postular (misma forma que POST auth-consent). */
  authConsent?: CandidateAuthConsentSubmitBody
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

function getApiMessage(record: Record<string, unknown> | null): string | null {
  if (!record || typeof record.message !== "string") return null
  const trimmed = record.message.trim()
  return trimmed !== "" ? trimmed : null
}

function getBodyTextMessage(body: unknown): string | null {
  if (typeof body === "string") {
    // ASP.NET may return a JSON string; strip surrounding quotes if present.
    const trimmed = body.trim().replace(/^"(.*)"$/s, "$1").trim()
    return trimmed !== "" ? trimmed : null
  }
  return getApiMessage(getRecord(body))
}

function mapIdentityDocumentApplyError(message: string | null): string | null {
  if (!message) return null
  if (/documentType(Code|Id).*required|required.*documentType(Code|Id)/i.test(message)) {
    return "Seleccioná el tipo de documento de identidad e intentá de nuevo."
  }
  if (/nationalId is required when documentType/i.test(message)) {
    return "Ingresá el número de documento de identidad e intentá de nuevo."
  }
  if (/documentTypeCode is invalid|documentTypeId is invalid/i.test(message)) {
    return "El tipo de documento no es válido. Elegí otra opción del listado."
  }
  if (/documentTypeCode and documentTypeId must reference/i.test(message)) {
    return "El tipo de documento no es consistente. Revisá el formulario."
  }
  return null
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

/** Código estable del backend cuando ya existe postulación (o match legacy). */
export const ALREADY_APPLIED_CODE = "ALREADY_APPLIED"

/** Código cuando falta consentimiento vigente y no se envió AuthConsent. */
export const AUTH_CONSENT_REQUIRED_CODE = "AUTH_CONSENT_REQUIRED"

const ALREADY_APPLIED_MESSAGE =
  "Ya postulaste a esta vacante. Revisá el estado en tu portal de candidato."

const AUTH_CONSENT_REQUIRED_MESSAGE =
  "Necesitás aceptar la autorización y consentimiento para postular."

/** True cuando el API rechaza por postulación duplicada (no otros 409 de consent). */
export function isAlreadyAppliedConflict(
  status: number,
  body: unknown
): boolean {
  if (status !== 409) return false
  const record = getRecord(body)
  const code =
    record && typeof record.code === "string" ? record.code.trim() : ""
  if (code === ALREADY_APPLIED_CODE) return true
  const fromApi = getApiMessage(record)
  if (fromApi && /already applied/i.test(fromApi)) return true
  if (typeof body === "string" && /already applied/i.test(body)) return true
  return false
}

/** True cuando el backend exige reaceptar / enviar AuthConsent. */
export function isAuthConsentRequiredError(
  status: number,
  body: unknown
): boolean {
  const record = getRecord(body)
  const code =
    record && typeof record.code === "string" ? record.code.trim() : ""
  if (code === AUTH_CONSENT_REQUIRED_CODE) return true
  if (status !== 400) return false
  const fieldMap = parsePublicApplyFieldErrors(body)
  return Boolean(
    fieldMap.AuthConsent ?? fieldMap.authConsent ?? fieldMap["authConsent"]
  )
}

export function getPublicApplyErrorMessage(status: number, body: unknown): string {
  const record = getRecord(body)
  const code =
    record && typeof record.code === "string" ? record.code.trim() : ""
  const fromApi = getBodyTextMessage(body)

  if (code === AUTH_CONSENT_REQUIRED_CODE || isAuthConsentRequiredError(status, body)) {
    return AUTH_CONSENT_REQUIRED_MESSAGE
  }
  if (code === "AUTH_CONSENT_VERSION_MISMATCH") {
    return "El documento de autorización se actualizó. Recarga la página e intenta de nuevo."
  }
  if (code === "AUTH_CONSENT_NATIONAL_ID_CONFLICT") {
    return "Ese documento de identidad ya está asociado a otro perfil. Usa otro valor o contacta soporte."
  }
  if (code === "AUTH_CONSENT_VALIDATION") {
    return "Revisa la autorización y consentimiento e intenta de nuevo."
  }

  if (isAlreadyAppliedConflict(status, body)) {
    return ALREADY_APPLIED_MESSAGE
  }

  const identityError = mapIdentityDocumentApplyError(fromApi)
  if (identityError) {
    return identityError
  }

  if (status === 403) {
    return "El correo ingresado debe coincidir con tu cuenta de candidato."
  }
  if (status === 404) return "La vacante ya no está disponible."
  if (status === 429) {
    return fromApi ?? "Demasiados intentos. Intenta de nuevo más tarde."
  }
  if (status === 422) {
    return (
      fromApi ??
      "No pudimos procesar el CV para esta vacante. Verifica el archivo e intenta nuevamente."
    )
  }
  if (status === 413) {
    return fromApi ?? "El CV no puede superar 15 MB."
  }
  if (status === 415) {
    return (
      fromApi ??
      "El archivo no coincide con el tipo declarado o no es un PDF válido."
    )
  }
  if (status === 400) {
    return (
      fromApi ??
      "Formato de archivo no soportado. Revisa el formulario e intenta nuevamente."
    )
  }
  return "Ocurrió un error inesperado. Intenta de nuevo."
}

export function isValidEmailFormat(email: string): boolean {
  const t = email.trim()
  if (!t) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}

export function isAllowedCvFile(file: File): boolean {
  const name = (file.name ?? "").toLowerCase()
  if (name.endsWith(".pdf")) return true
  if (file.type === MIME_PDF) return true
  return false
}

/** True si el archivo no supera el límite de tamaño del portal público. */
export function isCvFileWithinSizeLimit(
  file: File,
  maxBytes = PUBLIC_CV_MAX_BYTES
): boolean {
  return Number.isFinite(file.size) && file.size <= maxBytes
}

export function buildPublicApplyFormData(
  vacancyId: string,
  values: PublicVacancyApplyValues,
  outputLanguage: CvOutputLanguage
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
  if (values.authConsent) {
    fd.append("authConsent", JSON.stringify(values.authConsent))
  }
  fd.append(CV_OUTPUT_LANGUAGE_FIELD, outputLanguage)
  return fd
}

export async function submitPublicVacancyApplication(
  vacancyId: string,
  values: PublicVacancyApplyValues,
  outputLanguage: CvOutputLanguage
): Promise<PublicVacancyApplySuccess> {
  const data = await apiClient.postFormData(
    "/api/candidate/personal-appliance",
    buildPublicApplyFormData(vacancyId, values, outputLanguage)
  )
  const message =
    typeof data === "string" && data.trim()
      ? data.trim()
      : "Application pipeline executed successfully."
  return { message }
}
