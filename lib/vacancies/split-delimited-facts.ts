/**
 * Splits recruiter-facing free text into facts when it uses middle dots, bullets, or spaced dashes.
 * Leaves hyphenated words like Mercedes-AMG intact.
 */
export function splitDelimitedFacts(value: unknown): string[] {
  if (value == null) return []
  const text = String(value).trim()
  if (text === "") return []

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const chunks = lines.length > 1 ? lines : [text]

  return chunks.flatMap((chunk) =>
    chunk
      .split(/\s*[·•|]\s*|\s+[–—-]\s+/)
      .map((part) => part.trim())
      .filter(Boolean)
  )
}
