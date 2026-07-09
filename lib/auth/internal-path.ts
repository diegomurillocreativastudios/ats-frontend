const DEFAULT_AUTH_REDIRECT = "/seleccion-portal"

/** True when value is a same-origin relative path (no open redirect). */
export function isInternalPath(value: string | null | undefined): value is string {
  if (!value || typeof value !== "string") return false
  const trimmed = value.trim()
  if (!trimmed.startsWith("/")) return false
  if (trimmed.startsWith("//")) return false
  if (trimmed.includes("://")) return false
  return true
}

/** Pick the first safe internal redirect from candidates. */
export function resolveAuthRedirectDestination(
  candidates: Array<string | null | undefined>,
  defaultPath = DEFAULT_AUTH_REDIRECT
): string {
  for (const candidate of candidates) {
    if (isInternalPath(candidate)) return candidate.trim()
  }
  return defaultPath
}

export { DEFAULT_AUTH_REDIRECT }
