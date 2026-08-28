export type VacancyContentBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }

const HEADING_MAX_LENGTH = 48
const BULLET_PATTERN = /^(?:[-*•–]\s+|\d+[.)]\s+)(.+)$/u

function getBulletText(line: string): string | null {
  const match = line.match(BULLET_PATTERN)
  const item = match?.[1]?.trim()
  return item || null
}

function firstLetter(line: string): string | null {
  const match = line.match(/\p{L}/u)
  return match?.[0] ?? null
}

function startsWithLowercase(line: string): boolean {
  const letter = firstLetter(line)
  if (!letter) return false
  return letter === letter.toLowerCase() && letter !== letter.toUpperCase()
}

function looksLikeHeading(line: string): boolean {
  if (getBulletText(line)) return false
  if (isDocumentNoise(line)) return false
  if (line.length > HEADING_MAX_LENGTH) return false
  if (/[.!?…]$/u.test(line)) return false
  if (startsWithLowercase(line)) return false
  return true
}

function isDocumentNoise(line: string): boolean {
  if (/(?:https?:\/\/|www\.)/i.test(line) && /@|\|/.test(line)) return true
  const letters = line.replace(/[^\p{L}]/gu, "")
  if (letters.length < 6) return false
  return letters === letters.toUpperCase() && letters !== letters.toLowerCase()
}

function shouldJoinWithPrevious(buffer: string, line: string): boolean {
  if (!buffer) return false
  if (getBulletText(line) || looksLikeHeading(line) || isDocumentNoise(line)) {
    return false
  }
  if (looksLikeHeading(buffer)) return false
  if (startsWithLowercase(line)) return true
  return !/[.!?…]$/u.test(buffer)
}

function normalizeComparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Une cortes duros de Word/PDF en líneas lógicas (párrafos, títulos, viñetas).
 */
export function unwrapHardWrappedLines(text: string): string[] {
  const rawLines = text.replace(/\u00a0/g, " ").split(/\r?\n/)
  const logical: string[] = []
  let buffer = ""

  const flush = () => {
    const next = buffer.trim()
    if (next) logical.push(next)
    buffer = ""
  }

  for (const raw of rawLines) {
    const line = raw.trim()
    if (!line || isDocumentNoise(line)) {
      flush()
      if (logical.at(-1) !== "") logical.push("")
      continue
    }

    if (getBulletText(line)) {
      flush()
      buffer = line
      continue
    }

    if (looksLikeHeading(line)) {
      flush()
      logical.push(line)
      continue
    }

    if (shouldJoinWithPrevious(buffer, line)) {
      buffer = `${buffer} ${line}`
      continue
    }

    flush()
    buffer = line
  }

  flush()
  return logical
}

function omitLeadingTitle(
  blocks: VacancyContentBlock[],
  title?: string
): VacancyContentBlock[] {
  if (!title?.trim() || blocks.length === 0) return blocks

  const first = blocks[0]
  if (first.kind === "list") return blocks
  if (normalizeComparable(first.text) === normalizeComparable(title)) {
    return blocks.slice(1)
  }

  return blocks
}

/**
 * Convierte la descripción pública en bloques de lectura: títulos, párrafos y listas.
 */
export function parseVacancyRichText(
  raw?: string | null,
  options?: { omitTitle?: string }
): VacancyContentBlock[] {
  if (!raw?.trim()) return []

  const lines = unwrapHardWrappedLines(raw)
  const blocks: VacancyContentBlock[] = []
  let listItems: string[] = []

  const flushList = () => {
    if (!listItems.length) return
    blocks.push({ kind: "list", items: listItems })
    listItems = []
  }

  for (const line of lines) {
    if (!line) {
      flushList()
      continue
    }

    const bullet = getBulletText(line)
    if (bullet) {
      listItems.push(bullet)
      continue
    }

    flushList()
    if (looksLikeHeading(line)) {
      blocks.push({ kind: "heading", text: line.replace(/:$/, "").trim() })
      continue
    }

    blocks.push({ kind: "paragraph", text: line })
  }

  flushList()
  return omitLeadingTitle(blocks, options?.omitTitle)
}

export function hasVacancyFieldValue(value?: string | null): boolean {
  const normalized = value?.trim() ?? ""
  if (!normalized) return false
  const comparable = normalizeComparable(normalized)
  return comparable !== "no especificado" && comparable !== "not specified"
}

const DUPLICATE_WORD_OVERLAP = 0.85
const DUPLICATE_MIN_LENGTH = 40

function significantWords(value: string): string[] {
  return normalizeComparable(value)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3)
}

/**
 * Detecta si `details` es el mismo documento (o un recorte) que `description`.
 */
export function isOverlappingVacancyText(
  primary?: string | null,
  secondary?: string | null
): boolean {
  if (!secondary?.trim()) return true
  if (!primary?.trim()) return false

  const a = normalizeComparable(primary)
  const b = normalizeComparable(secondary)
  const shorter = a.length <= b.length ? a : b
  const longer = a.length <= b.length ? b : a

  if (shorter.length >= DUPLICATE_MIN_LENGTH && longer.includes(shorter)) {
    return true
  }

  const primaryWords = new Set(significantWords(primary))
  const secondaryWords = significantWords(secondary)
  if (secondaryWords.length < 8) return false

  const overlap = secondaryWords.filter((word) => primaryWords.has(word)).length
  return overlap / secondaryWords.length >= DUPLICATE_WORD_OVERLAP
}

export function getVacancyListItems(items?: string[] | null): string[] {
  return (items ?? []).map((item) => item.trim()).filter(Boolean)
}

export interface VacancyStory {
  description: VacancyContentBlock[]
  requirements: string[]
  details: VacancyContentBlock[]
  responsibilities: string[]
  advantages: VacancyContentBlock[]
  benefits: string[]
}

/**
 * Agrupa el contenido público en encabezado, requisitos, detalles y ventajas.
 */
export function buildVacancyStory(input: {
  title?: string
  description?: string | null
  details?: string | null
  advantages?: string | null
  responsibilities?: string[] | null
  requirements?: string[] | null
  benefits?: string[] | null
}): VacancyStory {
  const detailsBlocks =
    !hasVacancyFieldValue(input.details) ||
    isOverlappingVacancyText(input.description, input.details)
      ? []
      : parseVacancyRichText(input.details)

  const advantageBlocks = hasVacancyFieldValue(input.advantages)
    ? parseVacancyRichText(input.advantages)
    : []

  return {
    description: parseVacancyRichText(input.description, {
      omitTitle: input.title,
    }),
    requirements: getVacancyListItems(input.requirements),
    details: detailsBlocks,
    responsibilities: getVacancyListItems(input.responsibilities),
    advantages: advantageBlocks,
    benefits: getVacancyListItems(input.benefits),
  }
}
