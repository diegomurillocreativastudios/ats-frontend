import { apiClient, resolveBffUrl } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"

export interface TechnicalSheetPayload {
  generatedAtUtc?: string
  personal?: Record<string, unknown>
  personalData?: Record<string, unknown>
  candidate?: Record<string, unknown>
  vacancy?: Record<string, unknown>
  vacancyInfo?: Record<string, unknown>
  application?: Record<string, unknown>
  applicationInfo?: Record<string, unknown>
  postulation?: Record<string, unknown>
  match?: Record<string, unknown>
  matching?: Record<string, unknown>
  interviews?: unknown[]
  interviewList?: unknown[]
  [key: string]: unknown
}

export const buildTechnicalSheetBasePath = (
  vacancyId: string,
  candidateProfileId: string
) =>
  `/api/recruiter/vacancies/${encodeURIComponent(vacancyId)}/candidates/${encodeURIComponent(candidateProfileId)}/technical-sheet`

/** Unwraps common API envelopes and coerces to a flat payload for the UI. */
export const normalizeTechnicalSheetPayload = (raw: unknown): TechnicalSheetPayload => {
  if (raw == null || typeof raw !== "object") return {}
  const root = raw as Record<string, unknown>
  const inner =
    root.data != null && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root
  return inner as TechnicalSheetPayload
}

export const fetchTechnicalSheetJson = async (
  vacancyId: string,
  candidateProfileId: string
): Promise<TechnicalSheetPayload> => {
  const path = buildTechnicalSheetBasePath(vacancyId, candidateProfileId)
  const data = await apiClient.get(path)
  return normalizeTechnicalSheetPayload(data)
}

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const objUrl = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = objUrl
  a.download = filename
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objUrl)
}

export const downloadTechnicalSheetHtml = async (
  vacancyId: string,
  candidateProfileId: string,
  filename: string
): Promise<void> => {
  const url = resolveBffUrl(
    `${buildTechnicalSheetBasePath(vacancyId, candidateProfileId)}.html?download=1`
  )
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
  })
  if (!res.ok) {
    const err = new Error(`HTML ${res.status}`) as Error & { status: number }
    err.status = res.status
    throw err
  }
  const blob = await res.blob()
  triggerBlobDownload(blob, filename.endsWith(".html") ? filename : `${filename}.html`)
}

export const buildTechnicalSheetNextPdfAppPath = (
  vacancyId: string,
  candidateProfileId: string
) =>
  `/api/recruiter/vacancies/${encodeURIComponent(vacancyId)}/candidates/${encodeURIComponent(candidateProfileId)}/technical-sheet/pdf`

export interface DownloadTechnicalSheetPdfFromNextOptions {
  vacancyTitle?: string | null
}

/**
 * Descarga el PDF de ficha técnica generado en el servidor (PDFKit + esquema JSON).
 */
export const downloadTechnicalSheetPdfFromNextRoute = async (
  vacancyId: string,
  candidateProfileId: string,
  filename: string,
  options?: DownloadTechnicalSheetPdfFromNextOptions
): Promise<void> => {
  const path = buildTechnicalSheetNextPdfAppPath(vacancyId, candidateProfileId)
  const params = new URLSearchParams()
  const title = options?.vacancyTitle?.trim()
  if (title) params.set("vacancyTitle", title)
  const qs = params.toString()
  const url = qs ? `${path}?${qs}` : path
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
  })
  if (!res.ok) {
    let message = `Error ${res.status}`
    try {
      const j = await res.json()
      const parsed = getApiErrorMessage(j)
      if (parsed) message = parsed
    } catch {
      /* ignore */
    }
    const err = new Error(message) as Error & { status: number }
    err.status = res.status
    throw err
  }
  const blob = await res.blob()
  const name = filename.endsWith(".pdf") ? filename : `${filename}.pdf`
  triggerBlobDownload(blob, name)
}

export const slugifyVacancyForFilename = (title: string): string => {
  const t = title.trim().toLowerCase()
  const slug = t
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
  return slug || "vacante"
}
