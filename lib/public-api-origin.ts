/**
 * Browser-reachable API origin from NEXT_PUBLIC_API_URL.
 * Server-only API_URL and BACKEND_URL are not browser targets.
 * https only, with no username, path, query, or hash.
 * http is allowed only in development.
 */
export function resolvePublicApiOrigin(
  raw: string | undefined = process.env.NEXT_PUBLIC_API_URL
): string | null {
  const value = raw?.trim()
  if (!value) return null

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }

  const allowHttp = process.env.NODE_ENV === "development"
  const isHttps = url.protocol === "https:"
  const isDevHttp = url.protocol === "http:" && allowHttp
  if (!isHttps && !isDevHttp) return null
  if (url.username || url.password) return null
  if (url.pathname !== "/" && url.pathname !== "") return null
  if (url.search || url.hash) return null

  return url.origin
}
