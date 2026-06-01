/**
 * True if session role is platform admin (portal administración).
 * Comparación case-insensitive, alineada con `specs/spec-portal-admin.md`.
 */
export function isAdminRole(role: string | null | undefined): boolean {
  if (role == null) return false
  const s = String(role).trim().toLowerCase()
  return s === "admin"
}
