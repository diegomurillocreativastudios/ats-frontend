/** Chromium serverless pack; must be fetchable without session cookies. */
export const CHROMIUM_PACK_PATH = "/chromium-pack.tar"

export const authPublicPaths = [
  "/auth/iniciar-sesion",
  "/auth/iniciar-sesion-neo",
  "/auth/sso/success",
  "/auth/registrarse",
  "/auth/olvidaste-tu-contrasena",
  "/auth/forgot-password",
  "/auth/restablecer-contrasena",
  "/recuperar-contrasena",
  "/portal-oportunidades",
  "/privacy-policy",
] as const

export function isPublicPath(pathname: string): boolean {
  if (pathname === CHROMIUM_PACK_PATH) return true
  if (pathname.startsWith("/api/")) return true
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return true
  return authPublicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
