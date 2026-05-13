/**
 * Origen público de la app (https://…) para URLs absolutas en PDF headless.
 * Definí `NEXT_PUBLIC_APP_URL` en cada entorno. En Vercel se usa `VERCEL_URL` como respaldo.
 */
export function getPublicAppOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, "")

  const vercel = process.env.VERCEL_URL?.trim()
  if (!vercel) return ""
  const normalized = vercel.replace(/\/$/, "")
  if (/^https?:\/\//i.test(normalized)) return normalized
  return `https://${normalized}`
}

export function buildVisibleLogoUrlForTechnicalSheet(): string {
  const origin = getPublicAppOrigin()
  if (!origin) return ""
  return `${origin}/visible-icon.png`
}
