export const REGISTER_OTP_REQUEST_MESSAGE =
  "Si el correo es válido, te enviamos un código."

export const REGISTER_OTP_INVALID_CODE_MESSAGE =
  "El código no es válido o venció."

export const REGISTER_OTP_CHECK_OK_MESSAGE = "El código es válido."

export const REGISTER_OTP_GENERIC_ERROR =
  "No se pudo completar el registro. Revisá los datos e intentá de nuevo."

export const REGISTER_OTP_REQUEST_ERROR =
  "No se pudo procesar la solicitud. Intenta de nuevo."

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CODE_RE = /^\d{6}$/

const ACCOUNT_ENUMERATION_RE =
  /already\s*(exists|registered)|ya\s*(está\s*)?registrad|ya\s*existe|email.*taken|duplicate|user\s*already|cuenta\s*(ya\s*)?existe/i

/** Normaliza el correo del body de registro. */
export function normalizeRegisterEmail(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

/** True si el correo tiene forma válida. */
export function isValidRegisterEmail(email: string): boolean {
  return EMAIL_RE.test(email)
}

/** True si el código es exactamente 6 dígitos. */
export function isValidRegisterOtpCode(code: string): boolean {
  return CODE_RE.test(code)
}

/**
 * Detecta respuestas que revelarían si el correo ya tiene cuenta.
 */
export function isExistingAccountEnumeration(
  status: number,
  data: Record<string, unknown>,
): boolean {
  if (status === 404 || status === 409) return true
  if (status !== 400) return false
  if ("exists" in data) return true

  const raw = data.message ?? data.detail ?? data.Message
  const text = Array.isArray(raw) ? raw[0] : raw
  if (typeof text !== "string") return false
  return ACCOUNT_ENUMERATION_RE.test(text)
}
