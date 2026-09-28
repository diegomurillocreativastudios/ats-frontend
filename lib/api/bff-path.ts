/**
 * Joins catch-all segments into a backend path. Rejects traversal and absolute URLs.
 */
export function buildBackendPathFromSegments(
  segments: string[] | undefined
): string | null {
  if (!segments || segments.length === 0) return null

  for (const segment of segments) {
    if (!segment || segment === "." || segment === "..") return null
    if (segment.includes("://") || segment.includes("\\")) return null
    if (segment.includes("%2e") || segment.includes("%2E")) return null
  }

  const joined = segments
    .map((s) => encodeURIComponent(decodeURIComponent(s)))
    .join("/")
  return `/${joined}`
}
