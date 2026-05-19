import { apiClient } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"
import { getAccessToken } from "@/lib/auth"

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

const getBaseUrl = () => (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")

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

const fetchBinaryAuthenticated = async (url: string): Promise<Response> => {
  const token = getAccessToken()
  return fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "omit",
  })
}

export const downloadTechnicalSheetHtml = async (
  vacancyId: string,
  candidateProfileId: string,
  filename: string
): Promise<void> => {
  const base = getBaseUrl()
  const path = `${buildTechnicalSheetBasePath(vacancyId, candidateProfileId)}.html?download=1`
  const url = `${base}${path}`
  const res = await fetchBinaryAuthenticated(url)
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
  /** HTML paginado de la vista previa; el PDF coincide con lo mostrado en pantalla. */
  previewHtml?: string | null
}

/**
 * Descarga el PDF de ficha técnica generado en el servidor (Chromium).
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
  const previewHtml = options?.previewHtml?.trim() ?? ""
  const usePreview = previewHtml.length > 0
  const res = await fetch(url, {
    method: usePreview ? "POST" : "GET",
    credentials: "same-origin",
    headers: usePreview ? { "Content-Type": "application/json" } : undefined,
    body: usePreview ? JSON.stringify({ previewHtml }) : undefined,
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
