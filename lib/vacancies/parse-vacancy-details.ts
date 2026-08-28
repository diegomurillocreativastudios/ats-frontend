import { splitQualitativeFacts } from "@/lib/vacancies/split-qualitative-facts"

export interface VacancyDetailPair {
  key: string
  value: string
}

export interface VacancyDetailSection {
  title: string | null
  items: string[]
}

export type ParsedVacancyDetails =
  | { kind: "empty" }
  | { kind: "pairs"; pairs: VacancyDetailPair[] }
  | { kind: "list"; sections: VacancyDetailSection[] }
  | { kind: "prose"; text: string }

const SECTION_HEADING = /^[\p{L}\p{N}][\p{L}\p{N} .,&/()-]{0,48}:\s*$/u

function toPlainText(value: unknown): string {
  if (value == null) return ""
  return String(value).trim()
}

function readLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function stripListMarker(line: string): string {
  return line.replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+/, "").trim()
}

function isSectionHeading(line: string): boolean {
  return SECTION_HEADING.test(line)
}

function headingLabel(line: string): string {
  return line.replace(/:\s*$/, "").trim()
}

/**
 * Parses lines like "Clave: Valor" into structured pairs.
 * Returns null if any line lacks the pattern.
 */
export function parseKeyValuePairs(lines: string[]): VacancyDetailPair[] | null {
  if (lines.length === 0) return null
  const pairs: VacancyDetailPair[] = []
  for (const line of lines) {
    const colonIndex = line.indexOf(":")
    if (colonIndex <= 0 || colonIndex >= line.length - 1) return null
    const key = line.slice(0, colonIndex).trim()
    const value = line.slice(colonIndex + 1).trim()
    if (!key || !value) return null
    pairs.push({ key, value })
  }
  return pairs
}

/**
 * Turns recruiter vacancy details into pairs, titled sections, or prose.
 */
export function parseVacancyDetails(value: unknown): ParsedVacancyDetails {
  const text = toPlainText(value)
  if (text === "") return { kind: "empty" }

  const lines = readLines(text)
  const pairs = parseKeyValuePairs(lines)
  if (pairs) return { kind: "pairs", pairs }

  const sections: VacancyDetailSection[] = []
  let title: string | null = null
  let buffer: string[] = []

  const flush = () => {
    const items = splitQualitativeFacts(buffer.join("\n"))
      .map((item) => stripListMarker(item))
      .filter(Boolean)
    if (items.length > 0) {
      sections.push({ title, items })
    }
    title = null
    buffer = []
  }

  for (const line of lines) {
    const stripped = stripListMarker(line)
    if (isSectionHeading(stripped)) {
      flush()
      title = headingLabel(stripped)
      continue
    }
    buffer.push(stripped)
  }
  flush()

  if (sections.length === 0) return { kind: "prose", text }

  const totalItems = sections.reduce((count, section) => count + section.items.length, 0)
  if (totalItems <= 1 && sections.length === 1 && sections[0].title == null) {
    return { kind: "prose", text: sections[0].items[0] ?? text }
  }

  return { kind: "list", sections }
}

export function countVacancyDetailItems(parsed: ParsedVacancyDetails): number {
  if (parsed.kind === "pairs") return parsed.pairs.length
  if (parsed.kind === "list") {
    return parsed.sections.reduce((count, section) => count + section.items.length, 0)
  }
  if (parsed.kind === "prose") return parsed.text === "" ? 0 : 1
  return 0
}
