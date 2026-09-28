const KNOWN_REQUIREMENT_KEYS: Record<string, string> = {
  reactjs: "React.js",
  nextjs: "Next.js",
  tailwindcss: "Tailwind CSS",
  javascript: "JavaScript",
  typescript: "TypeScript",
  html: "HTML",
  css: "CSS",
  dotnet: ".NET",
}

const LEGACY_ASCII_SNAKE_KEY = /^[A-Za-z0-9_]+$/
const LEGACY_ASCII_TOKEN = /^[a-z0-9]+$/
const LEGACY_CAMEL_KEY = /^[a-z]+(?:[A-Z][a-z0-9]*)+$/

/**
 * Keys created by the old ASCII slug (snake_case, a single lowercase token, or camelCase).
 * Labels written by a recruiter keep their letters, accents, apostrophes and casing.
 */
function isLegacyMachineKey(value: string): boolean {
  if (KNOWN_REQUIREMENT_KEYS[value.toLowerCase()]) return true
  if (LEGACY_CAMEL_KEY.test(value)) return true
  if (!LEGACY_ASCII_SNAKE_KEY.test(value)) return false
  return value.includes("_") || LEGACY_ASCII_TOKEN.test(value)
}

/**
 * Storage key for a requirement name. Keeps the written label so Spanish, English,
 * German, Italian and French orthography stays intact in every screen that reads it.
 */
export function toRequirementStorageKey(name: unknown): string {
  return String(name ?? "").trim().replace(/\s+/g, " ")
}

/**
 * Turns a stored requirement key (snake_case, camelCase, or attr_ prefix)
 * into a label a recruiter can read. Written labels are returned unchanged.
 */
export function formatRequirementKey(key: unknown): string {
  const raw = String(key ?? "").trim()
  if (raw === "") return ""

  const withoutAttrPrefix = raw.replace(/^attr_/i, "")
  if (withoutAttrPrefix === "") return ""
  if (!isLegacyMachineKey(withoutAttrPrefix)) return withoutAttrPrefix

  const normalized = withoutAttrPrefix.toLowerCase()
  if (KNOWN_REQUIREMENT_KEYS[normalized]) {
    return KNOWN_REQUIREMENT_KEYS[normalized]
  }

  const words = withoutAttrPrefix
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean)

  if (words.length === 0) return raw

  return words
    .map((word, index) =>
      index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word
    )
    .join(" ")
}

/**
 * Maps API attribute weights (usually 0–1) to the 1–10 importance scale used in the form.
 */
export function toRequirementImportance(weight: unknown): number | null {
  if (typeof weight !== "number" || !Number.isFinite(weight)) return null
  const scale = weight <= 1 ? weight * 10 : weight
  const rounded = Math.round(scale)
  return Math.min(10, Math.max(0, rounded))
}
