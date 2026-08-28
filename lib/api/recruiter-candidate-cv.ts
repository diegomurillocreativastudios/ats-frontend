import { getAccessToken } from "@/lib/auth"

export type RecruiterCandidateCvErrorCode = "unavailable" | "failed"

export class RecruiterCandidateCvError extends Error {
  readonly status: number
  readonly code: RecruiterCandidateCvErrorCode

  constructor(message: string, status: number, code: RecruiterCandidateCvErrorCode) {
    super(message)
    this.name = "RecruiterCandidateCvError"
    this.status = status
    this.code = code
  }
}

/**
 * Extrae el filename de un header Content-Disposition (attachment / inline).
 */
export function parseContentDispositionFilename(
  header: string | null
): string | null {
  if (!header) return null
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/^["']|["']$/g, ""))
    } catch {
      return utf8Match[1].trim().replace(/^["']|["']$/g, "")
    }
  }
  const plainMatch = /filename\s*=\s*("?)([^";]+)\1/i.exec(header)
  if (plainMatch?.[2]) {
    return plainMatch[2].trim()
  }
  return null
}

/**
 * Descarga el CV de un candidato vía GET /api/recruiter/candidates/{id}/cv.
 * Requiere Bearer; 404 implica CV/acceso no disponible (sin filtrar existencia cross-empresa).
 */
export async function downloadRecruiterCandidateCv(
  candidateProfileId: string
): Promise<void> {
  const id = String(candidateProfileId ?? "").trim()
  if (!id) {
    throw new RecruiterCandidateCvError("Missing candidate id", 400, "failed")
  }

  const token = getAccessToken()
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")
  const url = `${baseUrl}/api/recruiter/candidates/${encodeURIComponent(id)}/cv`
  const res = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!res.ok) {
    if (res.status === 404) {
      throw new RecruiterCandidateCvError("CV unavailable", 404, "unavailable")
    }
    throw new RecruiterCandidateCvError("CV download failed", res.status, "failed")
  }

  const blob = await res.blob()
  const filename =
    parseContentDispositionFilename(res.headers.get("Content-Disposition")) ||
    "cv.pdf"
  const objUrl = URL.createObjectURL(blob)
  try {
    const a = document.createElement("a")
    a.href = objUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } finally {
    URL.revokeObjectURL(objUrl)
  }
}

export function isRecruiterCandidateCvError(
  err: unknown
): err is RecruiterCandidateCvError {
  return err instanceof RecruiterCandidateCvError
}
