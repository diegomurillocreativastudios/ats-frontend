/**
 * GET /api/candidate/profile/cv — CV del candidato autenticado (token/cookie).
 */

import { resolveBffUrl } from "@/lib/api"
import { parseContentDispositionFilename } from "@/lib/api/recruiter-candidate-cv"
import { MIME_PDF } from "@/lib/upload-constraints"

export class CandidateProfileCvError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "CandidateProfileCvError"
    this.status = status
  }
}

/**
 * Descarga el CV del perfil propio y lo convierte en `File` para multipart apply.
 */
export async function downloadCandidateProfileCvAsFile(): Promise<File> {
  const url = resolveBffUrl("/api/candidate/profile/cv")
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
  })

  if (!res.ok) {
    throw new CandidateProfileCvError(
      res.status === 404 ? "CV unavailable" : "CV download failed",
      res.status
    )
  }

  const blob = await res.blob()
  const filename =
    parseContentDispositionFilename(res.headers.get("Content-Disposition")) ||
    "cv.pdf"
  const type =
    blob.type && blob.type.trim() !== "" ? blob.type : MIME_PDF

  return new File([blob], filename, { type })
}
