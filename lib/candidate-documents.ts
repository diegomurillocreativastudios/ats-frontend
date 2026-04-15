export interface CandidateDocument {
  id: string
  storagePath: string | null
  createdAt: string | null
  contentSha256: string | null
}

const toStringOrNull = (value: unknown) => {
  if (value == null) return null
  const text = String(value).trim()
  return text || null
}

export const normalizeCandidateDocuments = (raw: unknown): CandidateDocument[] => {
  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as Record<string, unknown> | null)?.items)
      ? ((raw as Record<string, unknown>).items as unknown[])
      : []

  return rows
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const row = item as Record<string, unknown>
      const id = toStringOrNull(row.id)
      if (!id) return null
      return {
        id,
        storagePath: toStringOrNull(row.storagePath),
        createdAt: toStringOrNull(row.createdAt),
        contentSha256: toStringOrNull(row.contentSha256),
      } satisfies CandidateDocument
    })
    .filter((item): item is CandidateDocument => item !== null)
    .sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : Number.NEGATIVE_INFINITY
      const bTime = b.createdAt ? Date.parse(b.createdAt) : Number.NEGATIVE_INFINITY
      return bTime - aTime
    })
}
