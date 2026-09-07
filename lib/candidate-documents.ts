/**
 * Public document DTO for the browser (FE-SEC-020).
 * Never expose storagePath or contentSha256 to the client.
 */

export interface CandidateDocument {
  id: string
  fileName: string | null
  createdAt: string | null
}

const toStringOrNull = (value: unknown) => {
  if (value == null) return null
  const text = String(value).trim()
  return text || null
}

/**
 * Derives a presentation name from a storage path segment (UUID/numeric prefixes stripped).
 * Fallback when the backend still sends storagePath without fileName.
 */
export function deriveDocumentFileName(
  storagePath: string | null | undefined,
  documentId: string,
  explicitFileName?: string | null
): string | null {
  const explicit = toStringOrNull(explicitFileName)
  if (explicit) return explicit

  const path = toStringOrNull(storagePath)
  if (!path) return null

  const segment = path.split("/").filter(Boolean).pop()
  if (!segment) return null

  const rawName = segment.trim()
  const nameWithoutUuidPrefix = rawName.replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i,
    ""
  )
  const nameWithoutNumericPrefix = nameWithoutUuidPrefix.replace(/^\d+_/, "")
  return nameWithoutNumericPrefix || rawName || `Documento ${documentId}`
}

/**
 * Maps a raw backend document row to the public DTO (strips storagePath / contentSha256).
 */
export function toPublicCandidateDocument(
  raw: unknown
): CandidateDocument | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as Record<string, unknown>
  const id = toStringOrNull(row.id)
  if (!id) return null

  const storagePath = toStringOrNull(row.storagePath)
  const createdAt = toStringOrNull(row.createdAt)
  const fileName = deriveDocumentFileName(
    storagePath,
    id,
    toStringOrNull(row.fileName) ?? toStringOrNull(row.displayName)
  )

  return {
    id,
    fileName,
    createdAt,
  }
}

export const normalizeCandidateDocuments = (raw: unknown): CandidateDocument[] => {
  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as Record<string, unknown> | null)?.items)
      ? ((raw as Record<string, unknown>).items as unknown[])
      : []

  return rows
    .map((item) => toPublicCandidateDocument(item))
    .filter((item): item is CandidateDocument => item !== null)
    .sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : Number.NEGATIVE_INFINITY
      const bTime = b.createdAt ? Date.parse(b.createdAt) : Number.NEGATIVE_INFINITY
      return bTime - aTime
    })
}

export function resolveDocumentDisplayName(doc: CandidateDocument): string {
  const name = toStringOrNull(doc.fileName)
  if (name) return name
  return `Documento ${doc.id}`
}
