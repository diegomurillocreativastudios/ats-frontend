/**
 * True if session role is platform admin (portal administración).
 * Comparación case-insensitive, alineada con `specs/spec-portal-admin.md`.
 */
export function isAdminRole(role: string | null | undefined): boolean {
  if (role == null) return false
  const s = String(role).trim().toLowerCase()
  return s === "admin"
}

/**
 * True if session role is recruiter / RRHH (portal reclutador).
 */
export function isRecruiterRole(role: string | null | undefined): boolean {
  if (role == null) return false
  const s = String(role).trim().toLowerCase()
  return (
    s === "recruiter" ||
    s.includes("recruiter") ||
    s.includes("rrhh") ||
    s.includes("human resources") ||
    s.includes("human_resources")
  )
}

interface StaffCvUploadOptions {
  variant?: "recruiter" | "self"
  role?: string | null
}

/** Portal RRHH o rol Admin/Recruiter: CVs múltiples solo PDF, sin documento de identidad. */
export function canStaffBulkPdfCvUpload({
  variant,
  role,
}: StaffCvUploadOptions): boolean {
  if (variant === "recruiter") return true
  return isAdminRole(role) || isRecruiterRole(role)
}
