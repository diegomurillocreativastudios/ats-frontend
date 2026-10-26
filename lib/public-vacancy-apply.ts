import { apiClient } from "@/lib/api"
import type { CandidateAuthConsentSubmitBody } from "@/lib/candidate-auth-consent"
import type { CandidateProfile } from "@/lib/candidate-profile"
import {
  CV_OUTPUT_LANGUAGE_FIELD,
  type CvOutputLanguage,
} from "@/lib/cv-output-language"
import { MIME_PDF, UPLOAD_MAX_BYTES_35_MB, formatCvTooLargeMessage } from "@/lib/upload-constraints"

/** Límite alineado con backend security-hardening (CV ≤ 35 MiB). */
export const PUBLIC_CV_MAX_BYTES = UPLOAD_MAX_BYTES_35_MB

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
  minSalary?: number
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
  minSalary?: number
}

function asJobPreferencesRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

/** Profile salary expectation: root minSalary wins over CV JobPreferences. */
export function resolveApplyMinSalaryFromProfile(
  profile: Pick<CandidateProfile, "minSalary" | "jobPreferences">
): number | null {
  if (profile.minSalary != null && Number.isFinite(Number(profile.minSalary))) {
    const n = Number(profile.minSalary)
    if (n >= 0) return n
  }
  const prefs = asJobPreferencesRecord(profile.jobPreferences)
  if (!prefs) return null
  const raw = prefs.MinSalary ?? prefs.minSalary
  if (raw == null || raw === "") return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

/** Deja solo dígitos y como máximo un punto decimal. */
export function sanitizePublicApplySalaryInput(raw: string): string {
  let out = ""
  let hasDot = false
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") {
      out += ch
      continue
    }
    if (ch === "." && !hasDot) {
      out += ch
      hasDot = true
    }
  }
  return out
}

/** Vacío, inválido o negativo → null. */
export function parsePublicApplyMinSalary(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

/** Formato visual con dos decimales; vacío si no hay número válido. */
export function formatPublicApplyMinSalaryDisplay(raw: string): string {
  const n = parsePublicApplyMinSalary(raw)
  if (n == null) return ""
  return n.toFixed(2)
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

export function getPublicApplyErrorMessage(
  status: number,
  body: unknown,
  sizeBytes?: number
): string {
  const record = getRecord(body)
  const code =
    record && typeof record.code === "string" ? record.code.trim() : ""
  const fromApi = getApiMessage(record)

  if (code === "AUTH_CONSENT_VERSION_MISMATCH") {
    return "El documento de autorización se actualizó. Recarga la página e intenta de nuevo."
  }
  if (code === "AUTH_CONSENT_NATIONAL_ID_CONFLICT") {
    return "Ese documento de identidad ya está asociado a otro perfil. Usa otro valor o contacta soporte."
  }
  if (code === "AUTH_CONSENT_VALIDATION") {
    return "Revisa la autorización y consentimiento e intenta de nuevo."
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
    return (
      fromApi ??
      (typeof sizeBytes === "number"
        ? formatCvTooLargeMessage(sizeBytes)
        : "Limite para CVs de Candidatos 35 Mb")
    )
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

  if (
    values.minSalary != null &&
    Number.isFinite(values.minSalary) &&
    values.minSalary >= 0
  ) {
    candidate.minSalary = values.minSalary
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
