import { getApiErrorMessage } from "@/lib/api-error"

/** CV / documents / ingest — aligned with BE-SEC-016 (15 MB). */
export const UPLOAD_MAX_BYTES_15_MB = 15 * 1024 * 1024

/** Vacancy tailoring multipart file — ~10 MB. */
export const UPLOAD_MAX_BYTES_10_MB = 10 * 1024 * 1024

/** Company logo multipart — 5 MB. */
export const UPLOAD_MAX_BYTES_5_MB = 5 * 1024 * 1024

/** Report PDF history upload — 20 MB. */
export const UPLOAD_MAX_BYTES_20_MB = 20 * 1024 * 1024

export const MIME_PDF = "application/pdf"
export const MIME_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
export const MIME_TXT = "text/plain"
export const MIME_MARKDOWN = "text/markdown"
export const MIME_PNG = "image/png"
export const MIME_JPEG = "image/jpeg"
export const MIME_WEBP = "image/webp"
export const MIME_GIF = "image/gif"

export const PDF_DOCX_TYPES = [MIME_PDF, MIME_DOCX] as const
export const PDF_DOCX_EXTENSIONS = [".pdf", ".docx"] as const

export const PDF_DOCX_TXT_TYPES = [MIME_PDF, MIME_DOCX, MIME_TXT] as const
export const PDF_DOCX_TXT_EXTENSIONS = [".pdf", ".docx", ".txt"] as const

export const PDF_ONLY_TYPES = [MIME_PDF] as const
export const PDF_ONLY_EXTENSIONS = [".pdf"] as const

export const VACANCY_FILE_TYPES = [
  MIME_PDF,
  MIME_DOCX,
  MIME_MARKDOWN,
] as const
export const VACANCY_FILE_EXTENSIONS = [".pdf", ".docx", ".md"] as const

export const LOGO_TYPES = [MIME_PNG, MIME_JPEG, MIME_WEBP, MIME_GIF] as const
export const LOGO_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
] as const

export const PDF_DOCX_ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"

export const PDF_DOCX_TXT_ACCEPT =
  ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"

export const PDF_ONLY_ACCEPT = "application/pdf,.pdf"

export const VACANCY_FILE_ACCEPT =
  ".pdf,.docx,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown"

export const LOGO_ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif"

export interface UploadFileAllowlist {
  types: readonly string[]
  extensions: readonly string[]
  maxBytes: number
}

export interface UploadFileValidationResult {
  valid: boolean
  reason?: "type" | "size" | "empty"
}

/**
 * Client-side size + extension/MIME check (no magic bytes).
 * Extension OR MIME match is enough when either is present.
 */
export function validateUploadFile(
  file: File | Blob & { name?: string; type?: string },
  allowlist: UploadFileAllowlist
): UploadFileValidationResult {
  const size = file.size
  if (!Number.isFinite(size) || size <= 0) {
    return { valid: false, reason: "empty" }
  }
  if (size > allowlist.maxBytes) {
    return { valid: false, reason: "size" }
  }

  const name =
    "name" in file && typeof file.name === "string"
      ? file.name.toLowerCase()
      : ""
  const mime = (file.type ?? "").toLowerCase()
  const extension = name.includes(".")
    ? `.${name.split(".").pop() ?? ""}`
    : ""

  const extensionOk =
    extension !== "" &&
    allowlist.extensions.some((ext) => ext.toLowerCase() === extension)
  const mimeOk =
    mime !== "" &&
    allowlist.types.some((type) => type.toLowerCase() === mime)

  if (!extensionOk && !mimeOk) {
    return { valid: false, reason: "type" }
  }
  return { valid: true }
}

export function getFileExtension(fileName: string): string {
  const lower = (fileName || "").toLowerCase()
  const idx = lower.lastIndexOf(".")
  if (idx < 0) return ""
  return lower.slice(idx)
}

const DEFAULT_UPLOAD_TOO_LARGE =
  "El archivo es demasiado grande. Reduce el tamaño e intenta de nuevo."
const DEFAULT_UPLOAD_TYPE_MISMATCH =
  "El archivo no coincide con el tipo declarado o el contenido no está permitido."
const DEFAULT_UPLOAD_UNSUPPORTED =
  "Formato de archivo no soportado. Revisa el archivo e intenta de nuevo."

function getStatusFromError(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) return undefined
  if (!("status" in err)) return undefined
  const status = (err as { status?: unknown }).status
  return typeof status === "number" ? status : undefined
}

/**
 * Maps upload API failures to user-facing copy.
 * Prefers server `message` when present; never exposes stack traces.
 */
export function getUploadApiErrorMessage(
  err: unknown,
  fallbacks?: {
    tooLarge?: string
    typeMismatch?: string
    unsupported?: string
    generic?: string
  }
): string {
  const status = getStatusFromError(err)
  const serverMessage = getApiErrorMessage(err)
  const hasUsefulServerMessage =
    serverMessage !== "" &&
    serverMessage !== "Error desconocido" &&
    !/^Solicitud fallida \(\d+\)$/.test(serverMessage)

  if (status === 413) {
    return hasUsefulServerMessage
      ? serverMessage
      : (fallbacks?.tooLarge ?? DEFAULT_UPLOAD_TOO_LARGE)
  }
  if (status === 415) {
    return hasUsefulServerMessage
      ? serverMessage
      : (fallbacks?.typeMismatch ?? DEFAULT_UPLOAD_TYPE_MISMATCH)
  }
  if (status === 400) {
    return hasUsefulServerMessage
      ? serverMessage
      : (fallbacks?.unsupported ?? DEFAULT_UPLOAD_UNSUPPORTED)
  }
  if (hasUsefulServerMessage) return serverMessage
  return fallbacks?.generic ?? serverMessage
}
