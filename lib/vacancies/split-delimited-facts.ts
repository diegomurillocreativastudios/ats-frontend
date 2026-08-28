/**
 * Splits recruiter-facing free text into facts when it uses middle dots, bullets, or spaced dashes.
 * Leaves hyphenated words like Mercedes-AMG intact.
 * Joins hard-wrapped line breaks that continue the same sentence.
 */
export function splitDelimitedFacts(value: unknown): string[] {
  if (value == null) return []
  const text = String(value).trim()
  if (text === "") return []

  const lines = reflowWrappedLines(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  )
  const chunks = lines.length > 1 ? lines : [lines[0] ?? text]

  return chunks.flatMap((chunk) =>
    chunk
      .split(/\s*[·•|]\s*|\s+[–—-]\s+/)
      .map((part) => part.trim())
      .filter(Boolean)
  )
}

/**
 * Merges a line that is clearly a wrap continuation of the previous one.
 * Keeps real list items that start with a capital letter after `;` or a new sentence.
 */
export function reflowWrappedLines(lines: string[]): string[] {
  const reflowed: string[] = []

  for (const line of lines) {
    if (reflowed.length === 0) {
      reflowed.push(line)
      continue
    }

    const previous = reflowed[reflowed.length - 1]
    if (!isWrappedContinuation(previous, line)) {
      reflowed.push(line)
      continue
    }

    const joiner = /[-–—]$/.test(previous) ? "" : " "
    reflowed[reflowed.length - 1] = previous.replace(/[-–—]$/, "") + joiner + line
  }

  return reflowed
}

function isWrappedContinuation(previous: string, next: string): boolean {
  if (/[.!?…]$/.test(previous)) return false
  if (/^[\p{Ll}]/u.test(next)) return true
  if (/[-–—]$/.test(previous) && /^[\p{L}\p{N}]/u.test(next)) return true
  return false
}
