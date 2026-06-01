/**
 * Base URL del API para Route Handlers (solo servidor).
 * El navegador usa `NEXT_PUBLIC_API_URL`; en Docker o despliegues
 * donde Node no alcanza el mismo host, definí `API_URL` o `BACKEND_URL` (sin `/` final).
 */
export function getServerBackendBaseUrl(): string {
  const raw =
    process.env.API_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ""
  return raw.replace(/\/$/, "")
}
