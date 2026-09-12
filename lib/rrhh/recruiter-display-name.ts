export const RECRUITER_DISPLAY_NAME_MIN = 2
export const RECRUITER_DISPLAY_NAME_MAX = 80

export const RECRUITER_PROFILE_BACKEND_MESSAGES = {
  required: "El nombre es obligatorio.",
  length: "El nombre debe tener entre 2 y 80 caracteres.",
  mismatch: "userName y name deben coincidir.",
  invalid: "El nombre no es válido.",
} as const

export type RecruiterDisplayNameError =
  | "required"
  | "tooShort"
  | "tooLong"
  | "invalid"

const DISALLOWED_NAME_CHARS = /[\u0000-\u001F\u007F\u2028\u2029]/

export type RecruiterProfileNameSource = {
  name?: string | null
  userName?: string | null
  fullName?: string | null
  email?: string | null
}

export type RecruiterProfilePatchBody = {
  userName: string
  name: string
}

export type RecruiterProfilePatchParseResult =
  | { ok: true; userName: string }
  | { ok: false; message: string }

function asTrimmedString(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim()
}

/**
 * Nombre visible para el input de perfil: `name`, luego `userName` / `fullName`.
 * Si el valor es un correo, usa la parte local (aún no hay display name guardado).
 */
export function resolveRecruiterProfileName(
  user: RecruiterProfileNameSource
): string {
  const raw = [user.name, user.userName, user.fullName]
    .map((value) => asTrimmedString(value))
    .find((value) => value.length > 0)

  if (!raw) return ""
  if (!raw.includes("@")) return raw
  return raw.split("@")[0] ?? raw
}

/**
 * Cuerpo canónico de `PATCH /api/auth/profile`: ambos campos idénticos tras trim.
 */
export function buildRecruiterProfilePatchBody(
  displayName: string
): RecruiterProfilePatchBody {
  const userName = displayName.trim()
  return { userName, name: userName }
}

/**
 * Valida el nombre visible del reclutador antes de enviarlo al API.
 */
export function validateRecruiterDisplayName(
  value: string
): RecruiterDisplayNameError | null {
  const trimmed = value.trim()
  if (!trimmed) return "required"
  if (DISALLOWED_NAME_CHARS.test(trimmed)) return "invalid"
  if (trimmed.length < RECRUITER_DISPLAY_NAME_MIN) return "tooShort"
  if (trimmed.length > RECRUITER_DISPLAY_NAME_MAX) return "tooLong"
  return null
}

function backendMessageForValidation(
  error: RecruiterDisplayNameError
): string {
  if (error === "required") return RECRUITER_PROFILE_BACKEND_MESSAGES.required
  if (error === "invalid") return RECRUITER_PROFILE_BACKEND_MESSAGES.invalid
  return RECRUITER_PROFILE_BACKEND_MESSAGES.length
}

/**
 * Lee y sanea el body de perfil. Ignora propiedades extra.
 */
export function parseRecruiterProfilePatchBody(
  raw: unknown
): RecruiterProfilePatchParseResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, message: RECRUITER_PROFILE_BACKEND_MESSAGES.required }
  }

  const rec = raw as Record<string, unknown>
  const userName = typeof rec.userName === "string" ? rec.userName : undefined
  const name = typeof rec.name === "string" ? rec.name : undefined

  if (
    userName !== undefined &&
    name !== undefined &&
    userName.trim() !== name.trim()
  ) {
    return { ok: false, message: RECRUITER_PROFILE_BACKEND_MESSAGES.mismatch }
  }

  const candidate = userName ?? name ?? ""
  const validation = validateRecruiterDisplayName(candidate)
  if (validation) {
    return { ok: false, message: backendMessageForValidation(validation) }
  }

  return { ok: true, userName: candidate.trim() }
}
