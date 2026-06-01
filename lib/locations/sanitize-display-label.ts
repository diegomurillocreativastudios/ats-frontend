const SPANISH_ADMINISTRATIVE_PREFIXES = [
  "departamento de la ",
  "departamento del ",
  "departamento de ",
  "estado de la ",
  "estado del ",
  "estado de ",
  "provincia de la ",
  "provincia del ",
  "provincia de ",
  "región de la ",
  "región del ",
  "región de ",
  "region de la ",
  "region del ",
  "region de ",
  "distrito de la ",
  "distrito del ",
  "distrito de ",
  "territorio de la ",
  "territorio del ",
  "territorio de ",
  "municipio de la ",
  "municipio del ",
  "municipio de ",
  "ciudad de la ",
  "ciudad del ",
  "ciudad de ",
] as const

/** Removes redundant administrative prefixes from Spanish location labels for UI. */
export function sanitizeLocationDisplayLabel(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ""

  const lower = trimmed.toLowerCase()
  for (const prefix of SPANISH_ADMINISTRATIVE_PREFIXES) {
    if (!lower.startsWith(prefix)) continue
    const withoutPrefix = trimmed.slice(prefix.length).trim()
    if (withoutPrefix) return withoutPrefix
  }

  return trimmed
}
